export default function TextureOverlay() {
  return (
    <>
      {/* NOISE / GRAIN */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "url('https://www.transparenttextures.com/patterns/noise.png')",
        }}
      />

      {/* LIGHT GRADIENT OVERLAY */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:"radial-gradient(circle at 50% 20%, rgba(159,211,234,0.08), transparent 60%)",
        }}
      />

      {/* SUBTLE VIGNETTE */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:"radial-gradient(circle at center, transparent 60%, rgba(0,0,0,0.05) 100%)",
        }}
      />
    </>
  );
}