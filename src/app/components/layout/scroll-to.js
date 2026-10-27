"use client";

/**
 * Glide to a section of the page: "#id", "#" / "#top" for the top, or an
 * element. Used for every on-page link (see SmoothScroll), so the nav, the
 * logo, "View my work" and "Back to top" all move the same way.
 *
 *  - Eases in as well as out, so it starts like a glide, not a jump, and
 *    takes longer the further it goes.
 *  - Lands where the section is when it gets there: if the page above
 *    shifted on the way (an image or a lazy section loading), it corrects.
 *  - Leaves the address bar alone (no "#about" piling up in history).
 *  - Announces itself ("glide" events, start and end), so the nav can hold
 *    its underline on the destination until it arrives.
 *
 * Resolves once it has arrived.
 */
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const resolve = (target) => {
  if (target && typeof target !== "string") return target;
  const id = (target || "").replace(/^#/, "");
  if (!id || id === "top") return null;
  return document.getElementById(decodeURIComponent(id));
};

const topOf = (el) => (el ? el.getBoundingClientRect().top + window.scrollY : 0);

const announce = (state, el) => window.dispatchEvent(new CustomEvent("glide", { detail: { state, el } }));

export function scrollToSection(target, { focus = true } = {}) {
  const el = resolve(target);
  if (target && target !== "#" && target !== "#top" && !el) return Promise.resolve(false);
  const lenis = window.__lenis;
  announce("start", el);

  const done = () => {
    // For keyboard and screen-reader users, the section is where they are now.
    if (focus && el) {
      if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
      el.focus({ preventScroll: true });
    }
    announce("end", el);
    return true;
  };

  if (!lenis) {
    // Reduced motion (or no Lenis): straight there.
    window.scrollTo({ top: topOf(el), behavior: "auto" });
    return Promise.resolve(done());
  }

  return new Promise((res) => {
    const go = (attempt) => {
      const to = Math.min(topOf(el), document.documentElement.scrollHeight - window.innerHeight);
      const dist = Math.abs(to - lenis.scroll);
      lenis.scrollTo(to, {
        duration: attempt ? 0.35 : Math.min(1.5, 0.65 + dist / 4500),
        easing: easeInOutCubic,
        force: true,
        onComplete: () => {
          // Did it move while we were on the way?
          const now = Math.min(topOf(el), document.documentElement.scrollHeight - window.innerHeight);
          if (attempt < 2 && Math.abs(now - lenis.scroll) > 2) go(attempt + 1);
          else res(done());
        },
      });
    };
    go(0);
  });
}
