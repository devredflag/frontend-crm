import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import MouseGlowBackground from "./MouseGlowBackground";

export default function Hero() {
  const [email, setEmail] = useState("");

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24">

      {/* BACKGROUND */}
      <MouseGlowBackground />

      {/* FADE */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-white/70 to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <div className="text-center">

          {/* BADGE */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-10 border border-white/60 bg-white/60 backdrop-blur-md shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-semibold text-blue-600 tracking-wide">
              Prospecção Inteligente para B2B
            </span>
          </motion.div>

          {/* TITULO */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[42px] sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05]"
          >
            <span className="text-gray-900">Transforme sua</span>
            <br />
            <span className="gradient-strong">prospecção</span>
            <br />
            <span className="text-gray-900">em vendas</span>{" "}
            <span className="gradient-soft">reais</span>
          </motion.h1>

          {/* SUB */}
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed"
          >
            O CRM que organiza seus leads, planeja suas visitas e te mostra
            exatamente onde estão as melhores oportunidades.
            <span className="text-blue-600 font-semibold">
              {" "}Venda mais com inteligência.
            </span>
          </motion.p>

          {/* INPUT + BOTÃO */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-lg mx-auto"
          >

            {/* INPUT */}
            <input
              type="email"
              placeholder="Seu melhor email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full sm:w-[55%] h-14 px-5 rounded-xl bg-white/90 backdrop-blur-md border border-white/60 shadow-md text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            {/* BOTÃO MAIOR */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              className="w-full sm:w-[45%] h-14 px-8 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg, #2f80ed 0%, #27ae60 100%)",
                boxShadow: "0 14px 40px rgba(47,128,237,0.45)"
              }}
            >
              Começar Agora
              <ArrowRight className="w-4 h-4" />
            </motion.button>

          </motion.div>

          {/* SOCIAL PROOF */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">

            <span className="flex items-center gap-2">
              <div className="flex -space-x-2">
                <div className="w-6 h-6 rounded-full bg-blue-400 border-2 border-white" />
                <div className="w-6 h-6 rounded-full bg-cyan-400 border-2 border-white" />
                <div className="w-6 h-6 rounded-full bg-teal-400 border-2 border-white" />
                <div className="w-6 h-6 rounded-full bg-indigo-400 border-2 border-white" />
              </div>
              +500 vendedores ativos
            </span>

            <span className="flex items-center gap-1">
              ⭐ ⭐ ⭐ ⭐ ⭐
              <span className="ml-1">4.9/5</span>
            </span>

            <span>14 dias grátis • Sem cartão</span>

          </div>

        </div>
      </div>
    </section>
  );
}