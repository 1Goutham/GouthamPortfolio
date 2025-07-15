"use client"
const ShinyText = ({ text, speed = 3, className = '' }) => {
  const animationDuration = `${speed}s`;

  return (
    <span
      className={`bg-clip-text text-transparent inline-block ${className}`}
      style={{
        backgroundImage:
          'linear-gradient(120deg, rgba(255,255,255,0.4) 40%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.4) 60%)',
        backgroundSize: '200% 100%',
        animation: `shine ${animationDuration} linear infinite`,
      }}
    >
      {text}
    </span>
  );
};

export default ShinyText;
