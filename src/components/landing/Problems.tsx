import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

const problems = [
  "Leads espalhados em planilhas e anotações",
  "Sem controle de follow-up e oportunidades perdidas",
  "Visitas desorganizadas e rotas ineficientes",
  "Falta de visibilidade do pipeline de vendas",
];

const solutions = [
  "Todos os leads centralizados e organizados",
  "Follow-ups automáticos, nunca mais perca uma venda",
  "Planejamento inteligente de visitas por geolocalização",
  "Pipeline visual completo com métricas em tempo real",
];

export default function Problems() {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">

      {/* BACKGROUND */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-100/80 via-blue-50 to-sky-100/60" />

      {/* DOTS */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.8" fill="rgba(41,128,185,0.3)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* TÍTULO */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-xs font-bold tracking-widest uppercase text-blue-500">
            Problema → Solução
          </span>

          <h2 className="mt-4 text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900">
            Chega de perder vendas por{" "}
            <span className="animated-gradient-text">desorganização</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">

          {/* PROBLEMAS */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div
              className="p-8 rounded-2xl"
              style={{
                background:"rgba(255,220,220,0.35)",
                backdropFilter: "blur(16px)",
                border:"1px solid rgba(159,211,234,0.18)",
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  Sem o ProspectCRM
                </h3>
              </div>

              <div className="space-y-4">
                {problems.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-1 w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                      <span className="text-xs text-red-500 font-bold">✕</span>
                    </div>
                    <p className="text-sm text-gray-700">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* SOLUÇÕES */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div
              className="p-8 rounded-2xl"
              style={{
                background:"rgba(200,240,235,0.45)",
                backdropFilter: "blur(16px)",
                border:"1px solid rgba(159,211,234,0.18)",
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-teal-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  Com o ProspectCRM
                </h3>
              </div>

              <div className="space-y-4">
                {solutions.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-1 w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                    </div>
                    <p className="text-sm text-gray-700">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}