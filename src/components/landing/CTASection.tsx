import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function CTASection() {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">

      {/* BACKGROUND */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-500 to-teal-500" />

      {/* GLOW */}
      <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-3xl" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center text-white">

        {/* TITULO */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-3xl md:text-5xl font-extrabold mb-6"
        >
          Pronto para transformar sua prospecção em vendas?
        </motion.h2>

        {/* SUB */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-lg opacity-90 mb-10"
        >
          Comece agora e veja resultados reais nos primeiros dias.
        </motion.p>

        {/* BOTÃO */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-8 py-4 rounded-xl bg-white text-blue-600 font-bold flex items-center justify-center gap-2 mx-auto shadow-xl"
        >
          Começar agora
          <ArrowRight size={18} />
        </motion.button>

        {/* INFO */}
        <p className="mt-6 text-sm opacity-80">
          14 dias grátis • Sem cartão • Cancelamento fácil
        </p>

      </div>
    </section>
  );
}