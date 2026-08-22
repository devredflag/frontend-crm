import { useEffect, useRef } from "react";

export default function MouseGlowBackground() {
  const glowRef = useRef<HTMLDivElement | null>(null);
  const glow2Ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;

      if (glowRef.current) {
        glowRef.current.style.background = `
          radial-gradient(
            600px circle at ${x}% ${y}%,
            rgba(86, 207, 225, 0.28) 0%,
            rgba(41, 128, 185, 0.12) 40%,
            transparent 70%
          )
        `;
      }

      if (glow2Ref.current) {
        const invX = 100 - x;
        const invY = 100 - y;

        glow2Ref.current.style.background = `
          radial-gradient(
            400px circle at ${invX}% ${invY}%,
            rgba(26, 188, 156, 0.15) 0%,
            rgba(52, 152, 219, 0.08) 40%,
            transparent 70%
          )
        `;
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <>
      {/* BASE */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-100 via-blue-50 to-teal-50" />

      {/* DOTS */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="rgba(41,128,185,0.25)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>

      {/* GRID */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(41,128,185,0.4)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* GLOW 1 */}
      <div
        ref={glowRef}
        className="absolute inset-0 pointer-events-none transition-all duration-300"
      />

      {/* GLOW 2 */}
      <div
        ref={glow2Ref}
        className="absolute inset-0 pointer-events-none transition-all duration-500"
      />

      {/* ORBS */}
      <div className="absolute top-1/4 right-1/4 w-80 h-80 rounded-full bg-sky-300/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/5 w-64 h-64 rounded-full bg-teal-300/15 blur-3xl pointer-events-none animate-pulse" />
    </>
  );
}