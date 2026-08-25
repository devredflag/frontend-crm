import { motion } from "framer-motion";
import {
  Building2,
  Users,
  TrendingUp,
  MapPin,
  MoreHorizontal,
} from "lucide-react";

const pipelineStages = [
  { name: "Lead", count: 24, pct: 100, color:"from-blue-400 to-blue-500" },
  { name: "Contato", count: 18, pct: 75, color:"from-sky-400 to-teal-400" },
  { name: "Proposta", count: 12, pct: 50, color:"from-yellow-400 to-orange-400" },
  { name: "Fechado", count: 8, pct: 33, color:"from-green-400 to-teal-500" },
];

const companies = [
  { name: "Tech Solutions SA", segment: "Tecnologia", city: "São Paulo", status: "Proposta" },
  { name: "Indústria ABC Ltda", segment: "Indústria", city: "Campinas", status: "Lead" },
  { name: "Consulting Pro", segment: "Consultoria", city: "Rio de Janeiro", status: "Contato" },
];

export default function DashboardPreview() {
  return (
    <section id="dashboard" className="relative py-24 md:py-32 overflow-hidden">

      {/* BACKGROUND */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-50 via-sky-100/60 to-blue-50" />

      {/* DOTS */}
      <div className="absolute inset-0 pointer-events-none opacity-25">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="d-dots" width="24" height="24">
              <circle cx="1" cy="1" r="0.8" fill="rgba(41,128,185,0.3)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#d-dots)" />
        </svg>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4">

        {/* TÍTULO */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-bold uppercase text-blue-500">
            Preview
          </span>

          <h2 className="mt-4 text-4xl font-extrabold text-gray-900">
            Uma visão completa do seu{" "}
            <span className="animated-gradient-text">negócio</span>
          </h2>
        </motion.div>

        {/* DASHBOARD */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background:"rgba(225,244,252,0.75)",
              backdropFilter: "blur(24px)",
              border:"1px solid rgba(159,211,234,0.18)",
              boxShadow: "0 24px 80px rgba(41,128,185,0.18)",
            }}
          >

            {/* HEADER */}
            <div className="flex items-center gap-2 px-4 py-3 border-b bg-white/60">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>

              <div className="flex-1 text-center text-xs text-gray-500">
                app.prospectcrm.com/dashboard
              </div>

              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </div>

            <div className="p-6 space-y-6">

              {/* CARDS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: Building2, label: "Empresas", value: "348", change: "+12%" },
                  { icon: Users, label: "Contatos", value: "1.247", change: "+8%" },
                  { icon: TrendingUp, label: "Conversão", value: "23%", change: "+5%" },
                  { icon: MapPin, label: "Visitas", value: "86", change: "+15%" },
                ].map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <div key={i} className="p-4 rounded-xl bg-white shadow-sm">
                      <div className="flex justify-between mb-2">
                        <Icon className="w-4 h-4 text-blue-500" />
                        <span className="text-xs text-green-600">{stat.change}</span>
                      </div>
                      <p className="text-xl font-bold">{stat.value}</p>
                      <p className="text-xs text-gray-500">{stat.label}</p>
                    </div>
                  );
                })}
              </div>

              {/* PIPELINE */}
              <div>
                <h4 className="font-bold mb-3">Pipeline</h4>
                {pipelineStages.map((stage, i) => (
                  <div key={i} className="flex items-center gap-3 mb-2">
                    <span className="text-xs w-20">{stage.name}</span>

                    <div className="flex-1 h-2 bg-gray-200 rounded-full">
                      <div
                        className={`h-2 rounded-full bg-gradient-to-r ${stage.color}`}
                        style={{ width: `${stage.pct}%` }}
                      />
                    </div>

                    <span className="text-xs">{stage.count}</span>
                  </div>
                ))}
              </div>

              {/* EMPRESAS */}
              <div>
                <h4 className="font-bold mb-3">Empresas Recentes</h4>

                {companies.map((co, i) => (
                  <div key={i} className="flex justify-between text-sm mb-2">
                    <span>{co.name}</span>
                    <span className="text-gray-500">{co.status}</span>
                  </div>
                ))}
              </div>

              {/* MAPA */}
              <div className="h-32 bg-blue-100 rounded-xl flex items-center justify-center">
                <span className="text-sm text-gray-600">
                  Mapa de Prospecção
                </span>
              </div>

            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}