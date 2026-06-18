import { useEffect, useState } from "react";

// Hook simples de responsividade. Retorna true quando a largura da janela
// é <= breakpoint (768px por padrão). Usado para alternar layouts inline
// que não dão para resolver só com CSS (sidebar, grids de largura fixa).
export default function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= breakpoint : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= breakpoint);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);

  return isMobile;
}
