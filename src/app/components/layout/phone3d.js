"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RoundedBox, ContactShadows, Environment, Lightformer, Html } from "@react-three/drei";
import * as THREE from "three";

/**
 * A real 3D phone, modelled in code (no downloaded asset) and lit so the
 * titanium edge catches light as it turns.
 *
 *  - Rests at a three-quarter angle and sways very slowly.
 *  - Turns with the scroll: as its row moves through the viewport the phone
 *    rotates from one side to the other, the way Apple's product pages do.
 *  - Leans toward the cursor while hovered, and can be grabbed and spun;
 *    a flick keeps spinning with inertia and settles.
 *  - The screen is the product capture as a real DOM image projected into
 *    the scene (drei's Html in transform mode), so it stays pin-sharp at any
 *    size and needs no GPU texture. It hides itself when the back faces you.
 */

// Phone proportions (world units). Screen 2.72 x 5.86 is an iPhone-ish 0.464.
const BODY = { w: 2.96, h: 6.1, d: 0.3, r: 0.46 };
const SCREEN = { w: 2.72, h: 5.86, r: 0.36 };
const REST = { x: 0.1, y: -0.55 };
// DOM screen: CSS px per world unit. In drei's transform mode an element is
// scaled by distanceFactor / 400 CSS px per world unit, so 400 / PX makes the
// div exactly SCREEN.w x SCREEN.h world units.
const PX = 100;
const DISTANCE_FACTOR = 400 / PX;

/** A rounded rectangle as a flat geometry, with UVs normalised 0..1. */
function useRoundedPlane(w, h, r) {
  return useMemo(() => {
    const shape = new THREE.Shape();
    const x = -w / 2;
    const y = -h / 2;
    shape.moveTo(x + r, y);
    shape.lineTo(x + w - r, y);
    shape.quadraticCurveTo(x + w, y, x + w, y + r);
    shape.lineTo(x + w, y + h - r);
    shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    shape.lineTo(x + r, y + h);
    shape.quadraticCurveTo(x, y + h, x, y + h - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y, x + r, y);
    const geo = new THREE.ShapeGeometry(shape, 12);
    const uv = geo.attributes.uv;
    const pos = geo.attributes.position;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h);
    }
    uv.needsUpdate = true;
    return geo;
  }, [w, h, r]);
}

function PhoneModel({ src, bg, hostRef, portalRef }) {
  const group = useRef();
  const screenRef = useRef(null);
  const bezelGeo = useRoundedPlane(BODY.w - 0.1, BODY.h - 0.1, BODY.r - 0.05);
  const { size } = useThree();
  const state = useRef({ ty: 0, tx: 0, vy: 0, dragging: false, lastX: 0, lastT: 0, hover: 0 });

  // Pointer tilt + drag, read from the DOM host so the whole column counts.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const s = state.current;
    const onMove = (e) => {
      if (e.pointerType !== "mouse" && !s.dragging) return;
      const r = host.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      if (s.dragging) {
        const now = performance.now();
        const dx = e.clientX - s.lastX;
        s.vy = (dx / Math.max(now - s.lastT, 8)) * 0.012;
        s.ty += dx * 0.012;
        s.lastX = e.clientX;
        s.lastT = now;
      } else {
        s.hoverX = nx;
        s.hoverY = ny;
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

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const s = state.current;
    const t = performance.now() / 1000;

    // Scroll progress of the host through the viewport: -1 (below) .. 1 (above).
    let scroll = 0;
    const host = hostRef.current;
    if (host) {
      const r = host.getBoundingClientRect();
      const mid = r.top + r.height / 2;
      scroll = THREE.MathUtils.clamp((window.innerHeight / 2 - mid) / (window.innerHeight / 2), -1, 1);
    }

    // Inertia after a flick; the drag offset relaxes slowly back toward rest.
    if (!s.dragging) {
      s.ty += s.vy * dt * 60;
      s.vy *= Math.pow(0.9, dt * 60);
      s.ty += (0 - s.ty) * Math.min(1, dt * 0.6);
    }

    const sway = Math.sin(t * 0.6) * 0.06;
    const hoverY = (s.hoverX ?? 0) * 0.55 * s.hover;
    const hoverX = -(s.hoverY ?? 0) * 0.35 * s.hover;

    const targetY = REST.y + scroll * 0.55 + sway + hoverY + s.ty;
    const targetX = REST.x + hoverX + Math.sin(t * 0.45) * 0.02;

    g.rotation.y += (targetY - g.rotation.y) * Math.min(1, dt * 6);
    g.rotation.x += (targetX - g.rotation.x) * Math.min(1, dt * 6);
    g.position.y = Math.sin(t * 0.8) * 0.06;

    // Glare on the glass slides with the angle, so the screen reads as glass;
    // the screen hides once the back is facing the camera.
    const sc = screenRef.current;
    if (sc) {
      sc.style.setProperty("--gx", `${(50 - g.rotation.y * 70).toFixed(1)}%`);
      sc.style.setProperty("--gy", `${(30 + g.rotation.x * 60).toFixed(1)}%`);
      // Fade out as the glass turns edge-on, so it never pokes past the body.
      const facing = Math.cos(g.rotation.y) * Math.cos(g.rotation.x);
      sc.style.opacity = THREE.MathUtils.clamp((facing - 0.3) / 0.3, 0, 1).toFixed(3);
    }
  });

  // Fit: the phone fills the canvas height.
  const scale = useMemo(() => Math.min(1, (size.height / 560) * 1), [size.height]);

  return (
    <group ref={group} scale={scale}>
      {/* Body: titanium frame with a clearcoat so edges catch the light. */}
      <RoundedBox args={[BODY.w, BODY.h, BODY.d]} radius={BODY.r} smoothness={10}>
        <meshPhysicalMaterial color="#3a3a3e" metalness={0.75} roughness={0.32} clearcoat={1} clearcoatRoughness={0.2} envMapIntensity={1.4} />
      </RoundedBox>

      {/* Black bezel just inside the frame (a flat plane, layered behind the screen). */}
      <mesh geometry={bezelGeo} position={[0, 0, BODY.d / 2 + 0.004]}>
        <meshStandardMaterial color="#050505" metalness={0.2} roughness={0.6} />
      </mesh>

      {/* Screen: the capture as DOM, projected onto the screen plane. */}
      <Html
        transform
        portal={portalRef}
        position={[0, 0, BODY.d / 2 + 0.012]}
        distanceFactor={DISTANCE_FACTOR}
        style={{ pointerEvents: "none" }}
        zIndexRange={[2, 1]}
      >
        <div
          ref={screenRef}
          className="phone3d-screen"
          style={{ width: SCREEN.w * PX, height: SCREEN.h * PX, borderRadius: SCREEN.r * PX, background: bg }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" draggable={false} />
          <span className="phone3d-island" aria-hidden="true" />
          <span className="phone3d-glare" aria-hidden="true" />
        </div>
      </Html>


      {/* Side buttons. */}
      <RoundedBox args={[0.05, 0.28, 0.1]} radius={0.02} position={[-BODY.w / 2 - 0.01, 1.95, 0]}>
        <meshStandardMaterial color="#2e2e31" metalness={0.8} roughness={0.4} />
      </RoundedBox>
      <RoundedBox args={[0.05, 0.5, 0.1]} radius={0.02} position={[-BODY.w / 2 - 0.01, 1.35, 0]}>
        <meshStandardMaterial color="#2e2e31" metalness={0.8} roughness={0.4} />
      </RoundedBox>
      <RoundedBox args={[0.05, 0.5, 0.1]} radius={0.02} position={[-BODY.w / 2 - 0.01, 0.75, 0]}>
        <meshStandardMaterial color="#2e2e31" metalness={0.8} roughness={0.4} />
      </RoundedBox>
      <RoundedBox args={[0.05, 0.75, 0.1]} radius={0.02} position={[BODY.w / 2 + 0.01, 1.2, 0]}>
        <meshStandardMaterial color="#2e2e31" metalness={0.8} roughness={0.4} />
      </RoundedBox>

      {/* Camera bump on the back, so the back is not a blank slab when spun. */}
      <RoundedBox args={[1.2, 1.2, 0.08]} radius={0.04} smoothness={6} position={[-0.72, 2.25, -BODY.d / 2 - 0.03]}>
        <meshPhysicalMaterial color="#222225" metalness={0.8} roughness={0.35} clearcoat={0.8} />
      </RoundedBox>
      {[
        [-0.95, 2.5],
        [-0.5, 2.5],
        [-0.72, 2.0],
      ].map(([x, y], i) => (
        <mesh key={i} position={[x, y, -BODY.d / 2 - 0.09]} rotation={[0, Math.PI, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.04, 32]} />
          <meshPhysicalMaterial color="#0b0b10" metalness={0.6} roughness={0.2} clearcoat={1} />
        </mesh>
      ))}
    </group>
  );
}

export default function Phone3D({ src, bg = "#000", className = "" }) {
  const host = useRef(null);
  const portal = useRef(null);
  return (
    <div ref={host} className={`phone3d ${className}`} aria-label="3D phone showing the product" role="img">
      {/* The DOM screen is projected into this layer, which sits over the canvas. */}
      <div ref={portal} className="phone3d-portal" aria-hidden="true" />
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 14], fov: 28 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          {/* Lighting: a cool key from the upper left, a warm fill, and two rims
              so the frame edge reads as metal from every angle. */}
          <ambientLight intensity={0.35} />
          <directionalLight position={[-4, 6, 6]} intensity={2.2} color="#dfe6ff" />
          <directionalLight position={[5, -2, 4]} intensity={0.8} color="#ffe9d2" />
          <spotLight position={[6, 4, -6]} intensity={5} angle={0.5} penumbra={1} color="#ffffff" />
          <spotLight position={[-6, -4, -4]} intensity={3} angle={0.5} penumbra={1} color="#9DFF50" />
          {/* A studio built from light panels, so the titanium has something to reflect. */}
          <Environment resolution={256} frames={1}>
            <Lightformer intensity={3} form="rect" position={[0, 6, 2]} scale={[12, 3, 1]} color="#ffffff" />
            <Lightformer intensity={2} form="rect" position={[-8, 1, 3]} rotation={[0, Math.PI / 3, 0]} scale={[6, 10, 1]} color="#dfe6ff" />
            <Lightformer intensity={1.2} form="rect" position={[8, -1, 2]} rotation={[0, -Math.PI / 3, 0]} scale={[5, 10, 1]} color="#ffe9d2" />
            <Lightformer intensity={0.6} form="circle" position={[0, -6, -4]} scale={6} color="#9DFF50" />
          </Environment>
          <PhoneModel src={src} bg={bg} hostRef={host} portalRef={portal} />
          <ContactShadows position={[0, -3.4, 0]} opacity={0.55} scale={9} blur={2.6} far={4} color="#000" />
        </Suspense>
      </Canvas>
    </div>
  );
}
