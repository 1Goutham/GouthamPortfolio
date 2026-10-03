"use client";

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { useGLTF, ContactShadows, Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";

/**
 * A real phone: "Mobile phone" by Alain Sorazu (Sketchfab, CC BY-SA 4.0),
 * lit so the frame catches light as it turns, with the product capture
 * painted onto its screen.
 *
 *  - Rests at a three-quarter angle and breathes slowly.
 *  - Turns with the scroll as its row moves through the viewport.
 *  - Leans toward the cursor while hovered; grab it to spin, flick it and
 *    it keeps turning with inertia, then settles back.
 *  - The screen is a texture on a plane fitted to the model's own screen
 *    mesh, so it matches the bezel exactly. The capture keeps its width; the
 *    page's own colour fills the strip below it.
 */

const MODEL = "/models/phone.glb";
const TARGET_H = 6.2; // world units the phone is scaled to stand
const REST = { x: 0.08, y: -0.5 };

/** Rounded rectangle, optionally with square bottom corners, UVs 0..1. */
function roundedPlane(w, h, rTop, rBottom = rTop) {
  const sh = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  sh.moveTo(x + rBottom, y);
  sh.lineTo(x + w - rBottom, y);
  if (rBottom) sh.quadraticCurveTo(x + w, y, x + w, y + rBottom);
  else sh.lineTo(x + w, y);
  sh.lineTo(x + w, y + h - rTop);
  sh.quadraticCurveTo(x + w, y + h, x + w - rTop, y + h);
  sh.lineTo(x + rTop, y + h);
  sh.quadraticCurveTo(x, y + h, x, y + h - rTop);
  if (rBottom) {
    sh.lineTo(x, y + rBottom);
    sh.quadraticCurveTo(x, y, x + rBottom, y);
  } else sh.lineTo(x, y);
  const geo = new THREE.ShapeGeometry(sh, 12);
  const uv = geo.attributes.uv;
  const pos = geo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h);
  uv.needsUpdate = true;
  return geo;
}

function PhoneModel({ src, bg, hostRef }) {
  const { scene } = useGLTF(MODEL);
  const tex = useLoader(THREE.TextureLoader, src);
  const outer = useRef();
  const state = useRef({ ty: 0, vy: 0, dragging: false, lastX: 0, lastT: 0, hover: 0, hx: 0, hy: 0 });

  // One copy of the model per phone, re-materialed: titanium case, black
  // glass, and the screen mesh darkened so our screen plane sits on it.
  const { model, screen } = useMemo(() => {
    const model = scene.clone(true);
    let screenMesh = null;
    model.traverse((o) => {
      if (!o.isMesh) return;
      const name = o.material?.name || "";
      if (name === "Screen") {
        screenMesh = o;
        o.material = new THREE.MeshStandardMaterial({ color: "#000", roughness: 0.3, metalness: 0.1 });
      } else if (name === "Case" || name === "White") {
        o.material = new THREE.MeshPhysicalMaterial({
          color: name === "Case" ? "#2e2e32" : "#5a5a5f",
          metalness: 0.85,
          roughness: 0.32,
          clearcoat: 1,
          clearcoatRoughness: 0.2,
          envMapIntensity: 1.3,
        });
      } else if (name === "Black" || name === "Button") {
        o.material = new THREE.MeshPhysicalMaterial({ color: "#0b0b0d", metalness: 0.6, roughness: 0.4, clearcoat: 0.6 });
      } else if (name.startsWith("Camera") || name === "Flash") {
        o.material = new THREE.MeshPhysicalMaterial({
          color: name === "Flash" ? "#d9d4c0" : "#101218",
          metalness: 0.5,
          roughness: 0.2,
          clearcoat: 1,
        });
      }
      o.castShadow = false;
      o.receiveShadow = false;
    });

    // Fit: the scene's root already stands the phone up (length along Y).
    // Centre it and scale it to TARGET_H, then face the screen toward +Z.
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const s = TARGET_H / size.y;
    model.scale.setScalar(s);
    model.position.set(-center.x * s, -center.y * s, -center.z * s);
    model.updateMatrixWorld(true);

    // Screen rectangle in world space, from the screen mesh's own bounds.
    let screen = null;
    if (screenMesh) {
      const sb = new THREE.Box3().setFromObject(screenMesh);
      const ss = new THREE.Vector3();
      const sc = new THREE.Vector3();
      sb.getSize(ss);
      sb.getCenter(sc);
      screen = { w: ss.x, h: ss.y, x: sc.x, y: sc.y, z: sb.max.z };
    }
    return { model, screen };
  }, [scene]);

  // Screen geometry: a bg-coloured plane the size of the screen, and the
  // capture at full screen width anchored to the top (its own aspect).
  const geos = useMemo(() => {
    if (!screen) return null;
    const r = Math.min(screen.w, screen.h) * 0.085;
    const imgH = Math.min(screen.h, screen.w * (tex.image.height / tex.image.width));
    return {
      back: roundedPlane(screen.w, screen.h, r),
      img: roundedPlane(screen.w, imgH, r, imgH < screen.h - 0.001 ? 0 : r),
      imgY: screen.h / 2 - imgH / 2,
    };
  }, [screen, tex]);

  useLayoutEffect(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
  }, [tex]);

  // Pointer: lean while hovered, drag to spin (host is the whole column).
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const s = state.current;
    const onMove = (e) => {
      const r = host.getBoundingClientRect();
      if (s.dragging) {
        const now = performance.now();
        const dx = e.clientX - s.lastX;
        s.vy = (dx / Math.max(now - s.lastT, 8)) * 0.012;
        s.ty += dx * 0.012;
        s.lastX = e.clientX;
        s.lastT = now;
      } else if (e.pointerType === "mouse") {
        s.hx = (e.clientX - r.left) / r.width - 0.5;
        s.hy = (e.clientY - r.top) / r.height - 0.5;
        s.hover = 1;
      }
    };
    const onDown = (e) => {
      s.dragging = true;
      s.lastX = e.clientX;
      s.lastT = performance.now();
      s.vy = 0;
      host.setPointerCapture?.(e.pointerId);
      host.style.cursor = "grabbing";
    };
    const onUp = () => {
      s.dragging = false;
      host.style.cursor = "grab";
    };
    const onLeave = () => {
      s.hover = 0;
    };
    host.style.cursor = "grab";
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointerup", onUp);
    host.addEventListener("pointercancel", onUp);
    host.addEventListener("pointerleave", onLeave);
    return () => {
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onUp);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, [hostRef]);

  // The host's position is measured only when the page has scrolled or
  // resized, never every frame, so the render loop forces no layout.
  const rect = useRef({ sy: -1, vh: 0, mid: 0 });
  useFrame((_, dt) => {
    const g = outer.current;
    if (!g) return;
    const s = state.current;
    const t = performance.now() / 1000;

    // Scroll progress of the host through the viewport: -1 (below) .. 1 (above).
    let scroll = 0;
    const host = hostRef.current;
    if (host) {
      const c = rect.current;
      if (c.sy !== window.scrollY || c.vh !== window.innerHeight) {
        const r = host.getBoundingClientRect();
        c.sy = window.scrollY;
        c.vh = window.innerHeight;
        c.mid = r.top + r.height / 2;
      }
      scroll = THREE.MathUtils.clamp((c.vh / 2 - c.mid) / (c.vh / 2), -1, 1);
    }

    if (!s.dragging) {
      s.ty += s.vy * dt * 60;
      s.vy *= Math.pow(0.9, dt * 60);
      s.ty += (0 - s.ty) * Math.min(1, dt * 0.5);
    }

    const targetY = REST.y + scroll * 0.5 + Math.sin(t * 0.5) * 0.05 + s.hx * 0.5 * s.hover + s.ty;
    const targetX = REST.x - s.hy * 0.3 * s.hover + Math.sin(t * 0.4) * 0.015;
    g.rotation.y += (targetY - g.rotation.y) * Math.min(1, dt * 6);
    g.rotation.x += (targetX - g.rotation.x) * Math.min(1, dt * 6);
    g.position.y = Math.sin(t * 0.8) * 0.05;
  });

  return (
    <group ref={outer}>
      <primitive object={model} />
      {geos && screen && (
        <group position={[screen.x, screen.y, screen.z + 0.004]}>
          <mesh geometry={geos.back}>
            <meshBasicMaterial color={bg} toneMapped={false} />
          </mesh>
          <mesh geometry={geos.img} position={[0, geos.imgY, 0.002]}>
            <meshBasicMaterial map={tex} toneMapped={false} />
          </mesh>
          {/* Glass: a faint glossy sheet so the screen catches the studio lights. */}
          <mesh geometry={geos.back} position={[0, 0, 0.005]}>
            <meshPhysicalMaterial transparent opacity={0.07} roughness={0.05} metalness={0} clearcoat={1} color="#fff" depthWrite={false} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/* When a paused canvas is switched back to "always", the shared render loop
   may already have stopped; a single invalidate() restarts it. The store
   applies the new frameloop asynchronously, so watch the store, not the prop. */
function Wake() {
  const frameloop = useThree((s) => s.frameloop);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (frameloop === "always") invalidate();
  }, [frameloop, invalidate]);
  return null;
}

useGLTF.preload(MODEL);

export default function Phone3D({ src, bg = "#000", className = "" }) {
  const host = useRef(null);
  const [ready, setReady] = useState(false);
  // Render only while the phone is near the viewport; off-screen phones cost
  // nothing, so a page of four never has more than two rendering at once.
  const [active, setActive] = useState(false);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: "80px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={host} className={`phone3d ${className}`} data-ready={ready} aria-label="3D phone showing the product" role="img">
      <Canvas
        dpr={[1, 1.5]}
        frameloop={active ? "always" : "never"}
        camera={{ position: [0, 0, 14], fov: 28 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance", stencil: false }}
        style={{ background: "transparent" }}
        onCreated={() => setReady(true)}
      >
        <Wake />
        <Suspense fallback={null}>
          <ambientLight intensity={0.3} />
          <directionalLight position={[-4, 6, 6]} intensity={1.8} color="#dfe6ff" />
          <directionalLight position={[5, -2, 4]} intensity={0.7} color="#ffe9d2" />
          <Environment resolution={256} frames={1}>
            <Lightformer intensity={3} form="rect" position={[0, 6, 2]} scale={[12, 3, 1]} color="#ffffff" />
            <Lightformer intensity={2} form="rect" position={[-8, 1, 3]} rotation={[0, Math.PI / 3, 0]} scale={[6, 10, 1]} color="#dfe6ff" />
            <Lightformer intensity={1.2} form="rect" position={[8, -1, 2]} rotation={[0, -Math.PI / 3, 0]} scale={[5, 10, 1]} color="#ffe9d2" />
            <Lightformer intensity={0.6} form="circle" position={[0, -6, -4]} scale={6} color="#b9c4d6" />
          </Environment>
          <PhoneModel src={src} bg={bg} hostRef={host} />
          <ContactShadows position={[0, -3.5, 0]} opacity={0.55} scale={9} blur={2.6} far={4} color="#000" frames={1} />
        </Suspense>
      </Canvas>
    </div>
  );
}
