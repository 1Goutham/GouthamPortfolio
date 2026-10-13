"use client"
import { useRef, useEffect, useState } from 'react';

const FadeContent = ({
  children,
  blur = false,
  duration = 1000,
  easing = 'ease-out',
  delay = 0,
  threshold = 0.1,
  initialOpacity = 0,
  className = ''
}) => {
  const [inView, setInView] = useState(false);
  const [settled, setSettled] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let timer;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.unobserve(el);
          timer = setTimeout(() => setInView(true), delay);
        }
      },
      { threshold, rootMargin: '0px 0px -5% 0px' }
    );

    observer.observe(el);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [threshold, delay]);

  return (
    <div
      ref={ref}
      className={className}
      onTransitionEnd={() => setSettled(true)}
      style={{
        opacity: inView ? 1 : initialOpacity,
        transition: `opacity ${duration}ms ${easing}, filter ${duration}ms ${easing}`,
        filter: blur ? (inView ? 'blur(0px)' : 'blur(10px)') : 'none',
        // Promote to its own layer only during the transition.
        willChange: settled ? 'auto' : 'opacity, filter',
      }}
    >
      {children}
    </div>
  );
};

export default FadeContent;
