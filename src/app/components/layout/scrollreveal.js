'use client';

import { useEffect, useRef, useMemo, useState } from 'react';

/**
 * Reveals its children as they come on screen: they rise a little, sharpen
 * from a blur and fade in, once. An IntersectionObserver and a CSS
 * transition do the work (styles: .sr in globals.css), so nothing runs per
 * frame. Plain text is split into words that arrive one after another.
 * With reduced motion the content is simply there.
 */
const ScrollReveal = ({
  children,
  enableBlur = true,
  baseOpacity = 0.1,
  blurStrength = 6,
  containerClassName = '',
  textClassName = '',
}) => {
  const containerRef = useRef(null);
  const [shown, setShown] = useState(false);
  const isTextOnly = typeof children === 'string';

  const splitText = useMemo(() => {
    if (!isTextOnly) return null;
    let n = 0;
    return children.split(/(\s+)/).map((word, index) => {
      if (word.match(/^\s+$/)) return word;
      return (
        <span className="sr-word inline-block" key={index} style={{ '--w': n++ }}>
          {word}
        </span>
      );
    });
  }, [children, isTextOnly]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setShown(true);
        io.disconnect();
      },
      { rootMargin: '0px 0px -10% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const style = {
    '--sr-o': baseOpacity,
    '--sr-b': enableBlur ? `${blurStrength}px` : '0px',
  };

  return (
    <div
      ref={containerRef}
      className={`sr my-5 ${isTextOnly ? 'sr-words' : ''} ${containerClassName}`}
      data-shown={shown}
      style={style}
    >
      {isTextOnly ? (
        <p className={`text-[clamp(1.6rem,4vw,3rem)] leading-[1.5] font-semibold ${textClassName}`}>{splitText}</p>
      ) : (
        <div className={textClassName}>{children}</div>
      )}
    </div>
  );
};

export default ScrollReveal;
