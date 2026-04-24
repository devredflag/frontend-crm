import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

const navLinks = [
  { label: "Funcionalidades", href: "#features" },
  { label: "Benefícios", href: "#benefits" },
  { label: "Dashboard", href: "#dashboard" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const navigate = useNavigate(); // 🔥 ADICIONADO

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: scrolled
          ? "rgba(174, 218, 235, 0.45)"
          : "rgba(200, 232, 242, 0.25)",
        backdropFilter: "blur(24px) saturate(200%)",
        WebkitBackdropFilter: "blur(24px) saturate(200%)",
        borderBottom: scrolled
          ? "1px solid rgba(255,255,255,0.55)"
          : "1px solid rgba(255,255,255,0.3)",
        boxShadow: scrolled
          ? "0 8px 32px rgba(41,128,185,0.10), inset 0 1px 0 rgba(255,255,255,0.5)"
          : "none",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">

          {/* LOGO */}
          <a href="#" className="flex items-center gap-2.5 group">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
              style={{
                background: "linear-gradient(135deg, rgba(41,128,185,0.8), rgba(26,188,156,0.7))",
                boxShadow: "0 4px 12px rgba(41,128,185,0.3)",
                border: "1px solid rgba(255,255,255,0.5)",
              }}
            >
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              <span className="text-gray-800">Prospect</span>
              <span className="text-blue-600 font-extrabold">CRM</span>
            </span>
          </a>

          {/* DESKTOP MENU */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-gray-700 hover:text-black transition relative group"
              >
                {link.label}
                <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-blue-500 transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </div>

          {/* BOTÕES */}
          <div className="hidden md:flex items-center gap-3">
            <button 
                 onClick={() => navigate("/login")}
                 className="text-sm text-gray-600 hover:text-black px-3 py-2 rounded-lg"
            >
              Entrar
            </button>

            {/* 🔥 AQUI ESTÁ A CORREÇÃO */}
            <button
              onClick={() => navigate("/cadastro")}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition hover:scale-105"
              style={{
                background: "linear-gradient(135deg, #2980b9, #1abc9c)",
              }}
            >
              Começar Grátis
            </button>
          </div>

          {/* MOBILE BUTTON */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-gray-700"
          >
            {mobileOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden bg-white"
          >
            <div className="px-4 py-4 space-y-3">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block text-sm text-gray-700 py-2 border-b"
                >
                  {link.label}
                </a>
              ))}

              <div className="pt-3 space-y-2">
                <button className="w-full text-left">Entrar</button>

                {/* 🔥 AQUI TAMBÉM */}
                <button
                  onClick={() => {
                    navigate("/cadastro");
                    setMobileOpen(false);
                  }}
                  className="w-full py-2 rounded bg-blue-500 text-white"
                >
                  Começar Grátis
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}