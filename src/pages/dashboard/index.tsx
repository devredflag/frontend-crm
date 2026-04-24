import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users, Building2, MessageCircle, MapPin, Send, Handshake,
  LayoutDashboard, Search, Bell, Calendar, Plus,
  TrendingUp, TrendingDown, ChevronDown,
  ClipboardList, BarChart3,
  Phone, Eye, ArrowRight,
} from "lucide-react";

// ─── Keyframes ───────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

  * { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes float1 {
    0%,100% { transform: translate(0,0) scale(1); }
    33%      { transform: translate(40px,-30px) scale(1.05); }
    66%      { transform: translate(-20px,20px) scale(0.97); }
  }
  @keyframes float2 {
    0%,100% { transform: translate(0,0) scale(1); }
    40%      { transform: translate(-50px,25px) scale(1.08); }
    70%      { transform: translate(30px,-15px) scale(0.95); }
  }
  @keyframes float3 {
    0%,100% { transform: translate(0,0) scale(1); }
    50%      { transform: translate(25px,40px) scale(1.03); }
  }
  @keyframes float4 {
    0%,100% { transform: translate(0,0); }
    30%      { transform: translate(-30px,-40px); }
    60%      { transform: translate(20px,15px); }
  }
  @keyframes float5 {
    0%,100% { transform: translate(0,0) scale(1); }
    45%      { transform: translate(35px,-20px) scale(1.06); }
    80%      { transform: translate(-15px,30px) scale(0.96); }
  }
  @keyframes gradientShift {
    0%,100% { background-position: 0% 50%; }
    50%      { background-position: 100% 50%; }
  }
  @keyframes pulse {
    0%,100% { opacity: 1; }
    50%      { opacity: 0.6; }
  }

  .nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 16px; border-radius: 10px; cursor: pointer;
    font-size: 13.5px; font-weight: 500; color: rgba(255,255,255,0.65);
    transition: all 0.18s; user-select: none;
  }
  .nav-item:hover { background: rgba(255,255,255,0.08); color: #fff; }
  .nav-item.active {
    background: rgba(255,255,255,0.14);
    color: #fff; font-weight: 600;
  }

  .metric-card {
    background: rgba(255,255,255,0.72);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255,255,255,0.9);
    border-radius: 16px;
    padding: 20px 18px;
    transition: transform 0.2s, box-shadow 0.2s;
    cursor: default;
  }
  .metric-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 36px rgba(41,128,185,0.18);
  }

  .glass-card {
    background: rgba(255,255,255,0.72);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255,255,255,0.9);
    border-radius: 16px;
  }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(41,128,185,0.25); border-radius: 4px; }

  .funnel-bar {
    display: flex; align-items: center; gap: 10px; margin-bottom: 10px;
  }
  .funnel-fill {
    height: 32px; border-radius: 6px; display: flex;
    align-items: center; padding-left: 12px;
    font-size: 12px; font-weight: 600; color: #fff;
    transition: width 0.6s ease;
  }
`;

// ─── Data ─────────────────────────────────────────────────────
const metrics = [
  { icon: Users,        label: "Leads cadastrados",    value: 125, delta: 12.5, up: true,  color: "#2980b9", bg: "rgba(41,128,185,0.1)"   },
  { icon: Building2,    label: "Empresas contatadas",  value: 86,  delta: 8.2,  up: true,  color: "#1abc9c", bg: "rgba(26,188,156,0.1)"   },
  { icon: MessageCircle,label: "Contatos em aberto",   value: 42,  delta: 5.1,  up: false, color: "#e67e22", bg: "rgba(230,126,34,0.1)"   },
  { icon: MapPin,       label: "Visitas realizadas",   value: 28,  delta: 16.3, up: true,  color: "#8e44ad", bg: "rgba(142,68,173,0.1)"   },
  { icon: Send,         label: "Propostas enviadas",   value: 15,  delta: 7.7,  up: true,  color: "#2980b9", bg: "rgba(41,128,185,0.1)"   },
  { icon: Handshake,    label: "Clientes fechados",    value: 9,   delta: 28.6, up: true,  color: "#27ae60", bg: "rgba(39,174,96,0.1)"    },
];

const recentActivities = [
  { initials: "AF", name: "André Ferreira",  action: "Nova visita realizada à TechSolutions",  time: "2h atrás",  color: "#2980b9" },
  { initials: "LS", name: "Larissa Santos",  action: "Proposta enviada para InovaCorp",         time: "4h atrás",  color: "#1abc9c" },
  { initials: "JM", name: "João Mendes",     action: "Novo lead cadastrado: MarketPro",         time: "1d atrás",  color: "#e67e22" },
  { initials: "CR", name: "Carla Rocha",     action: "Reunião agendada com GlobalTech",         time: "1d atrás",  color: "#8e44ad" },
];

const nextActivities = [
  { icon: Calendar, label: "Reunião com TechSolutions",  time: "Hoje, 14:00",   color: "#2980b9" },
  { icon: Phone,    label: "Ligação para InovaCorp",      time: "Amanhã, 10:00", color: "#1abc9c" },
  { icon: Eye,      label: "Visita à Global Services",    time: "12/06, 15:30",  color: "#e67e22" },
];

const featuredLeads = [
  { initials: "MP", name: "MarketPro",  sub: "Marketing Digital",      tag: "Novo",        tagColor: "#2980b9", bg: "#2980b9" },
  { initials: "SG", name: "StartGrowth",sub: "Consultoria Empresarial", tag: "Em contato",  tagColor: "#e67e22", bg: "#e67e22" },
  { initials: "GT", name: "GreenTech",  sub: "Tecnologia Sustentável",  tag: "Qualificado", tagColor: "#27ae60", bg: "#27ae60" },
];

const funnelData = [
  { label: "Leads",           value: 125, pct: 100, color: "#2980b9" },
  { label: "Contato realizado",value: 86, pct: 69,  color: "#1abc9c" },
  { label: "Em negociação",   value: 42,  pct: 34,  color: "#e67e22" },
  { label: "Proposta enviada",value: 15,  pct: 12,  color: "#8e44ad" },
  { label: "Fechado",         value: 9,   pct: 7,   color: "#27ae60" },
];

const navItems = [
  { icon: LayoutDashboard, label: "Dashboards",              active: true  },
  { icon: Search,          label: "Buscar Empresas",         active: false },
  { icon: Building2, label: "Cadastrar Empresas", path: "/empresas/nova", active: false },
  { icon: Users,           label: "Todos os clientes",       active: false },
  { icon: ClipboardList,   label: "Gerenciamento de clientes", active: false },
  { icon: Calendar,        label: "Calendário",              active: false },
];

// Mini sparkline using SVG path
function Sparkline({ up }: { up: boolean }) {
  const color = up ? "#27ae60" : "#e74c3c";
  const points = up
    ? "0,18 8,14 16,16 24,10 32,12 40,6 48,8 56,4 64,2"
    : "0,4 8,6 16,4 24,10 32,8 40,14 48,12 56,16 64,18";
  return (
    <svg width="64" height="20" viewBox="0 0 64 20" fill="none">
      <polyline points={points} stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
    </svg>
  );
}

// Simple bar chart
function BarChart() {
  const bars = [22, 45, 38, 60, 75, 55, 80, 65, 90, 70, 85, 95, 72, 58, 43, 66, 78, 88, 62, 50, 74, 68, 82, 76, 91, 55, 40, 63, 77, 84];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 80, padding: "0 4px" }}>
      {bars.map((h, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${h}%`,
            borderRadius: "3px 3px 0 0",
            background: i === 24
              ? "linear-gradient(180deg, #2980b9, #1abc9c)"
              : "rgba(41,128,185,0.18)",
            transition: "background 0.2s",
          }}
        />
      ))}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", position: "relative" }}>
      <style>{css}</style>

      {/* ── Floating background circles ── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
        {/* Page background */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(145deg, #c8e8f5 0%, #d6eef5 30%, #cceee8 65%, #c5eae0 100%)",
        }} />
        {/* Dot texture */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.4,
          backgroundImage: "radial-gradient(circle, rgba(41,128,185,0.2) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }} />
        {/* Circles */}
        {[
          { w: 420, h: 420, top: "-80px",  left: "10%",  anim: "float1 18s ease-in-out infinite", op: 0.12, c1: "#2980b9", c2: "#1abc9c" },
          { w: 280, h: 280, top: "40%",    left: "-60px", anim: "float2 22s ease-in-out infinite", op: 0.1,  c1: "#1abc9c", c2: "#2ecc71" },
          { w: 360, h: 360, top: "60%",    left: "55%",   anim: "float3 26s ease-in-out infinite", op: 0.09, c1: "#2980b9", c2: "#8e44ad" },
          { w: 200, h: 200, top: "20%",    left: "75%",   anim: "float4 20s ease-in-out infinite", op: 0.11, c1: "#27ae60", c2: "#1abc9c" },
          { w: 300, h: 300, top: "75%",    left: "20%",   anim: "float5 24s ease-in-out infinite", op: 0.08, c1: "#e67e22", c2: "#f39c12" },
          { w: 180, h: 180, top: "5%",     left: "60%",   anim: "float2 16s ease-in-out infinite 3s", op: 0.1, c1: "#1abc9c", c2: "#2980b9" },
          { w: 240, h: 240, top: "85%",    left: "80%",   anim: "float1 28s ease-in-out infinite 6s", op: 0.08, c1: "#8e44ad", c2: "#2980b9" },
        ].map((c, i) => (
          <div key={i} style={{
            position: "absolute",
            width: c.w, height: c.h,
            top: c.top, left: c.left,
            borderRadius: "50%",
            background: `radial-gradient(circle at 40% 40%, ${c.c1}, ${c.c2})`,
            opacity: c.op,
            animation: c.anim,
            filter: "blur(2px)",
          }} />
        ))}
      </div>

      {/* ── Sidebar ── */}
      <div style={{
        width: 220, flexShrink: 0, height: "100vh", overflowY: "auto",
        position: "relative", zIndex: 10,
        background: "linear-gradient(180deg, #1a3a5c 0%, #0f2a44 60%, #0a1f33 100%)",
        boxShadow: "4px 0 24px rgba(0,0,0,0.18)",
        display: "flex", flexDirection: "column",
        padding: "0 12px 20px",
      }}>
        {/* Logo */}
        <div style={{ padding: "22px 4px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, #2980b9, #1abc9c)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px rgba(41,128,185,0.4)",
            }}>
              <BarChart3 style={{ width: 18, height: 18, color: "#fff" }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>Prospecção</div>
              <div style={{
                fontSize: 11, fontWeight: 700,
                background: "linear-gradient(90deg, #2980b9, #1abc9c, #2ecc71, #2980b9)",
                backgroundSize: "200% 200%",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                animation: "gradientShift 4s ease infinite",
              }}>CRM</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          {navItems.map((item) => (
            <div
              key={item.label}
              className={`nav-item${item.active ? " active" : ""}`}
              onClick={() => {
                if (item.label === "Todos os clientes") {
                  navigate("/clientes");
                }
                if (item.label === "Cadastrar Empresas") {
                  navigate("/empresas/nova");
                }
              }}
            >
              <item.icon style={{ width: 16, height: 16 }} />
              {item.label}
            </div>
          ))}
        </nav>

        {/* User */}
        <div style={{
          marginTop: 16, padding: "12px", borderRadius: 12,
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: "linear-gradient(135deg, #2980b9, #1abc9c)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0,
          }}>KS</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Kauê Silva</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>Administrador</div>
          </div>
          <ChevronDown style={{ width: 13, height: 13, color: "rgba(255,255,255,0.4)", flexShrink: 0 }} />
        </div>
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, height: "100vh", overflowY: "auto", position: "relative", zIndex: 5 }}>

        {/* Top bar */}
        <div style={{
          position: "sticky", top: 0, zIndex: 20,
          padding: "14px 28px",
          background: "rgba(210,238,248,0.75)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.6)",
          display: "flex", alignItems: "center", gap: 16,
        }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: "#0f2133", letterSpacing: "-0.02em" }}>Dashboard</h1>
            <p style={{ fontSize: 12, color: "rgba(20,45,70,0.5)", marginTop: 1 }}>Bem-vindo de volta, Kauê! 👋</p>
          </div>

          {/* Search */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "rgba(255,255,255,0.75)", border: "1px solid rgba(200,225,240,0.9)",
            borderRadius: 10, padding: "0 14px", height: 38, width: 260,
            boxShadow: "0 2px 8px rgba(41,128,185,0.06)",
          }}>
            <Search style={{ width: 14, height: 14, color: "rgba(20,45,70,0.35)", flexShrink: 0 }} />
            <input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Buscar leads, empresas..."
              style={{
                flex: 1, border: "none", background: "transparent",
                fontSize: 13, color: "#1a2e40", outline: "none",
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button style={{
              width: 38, height: 38, borderRadius: 10, border: "1px solid rgba(200,225,240,0.9)",
              background: "rgba(255,255,255,0.75)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
            }}>
              <Bell style={{ width: 16, height: 16, color: "#2980b9" }} />
              <span style={{
                position: "absolute", top: 8, right: 8, width: 7, height: 7,
                background: "#e74c3c", borderRadius: "50%", border: "1.5px solid #fff",
              }} />
            </button>
            <button style={{
              width: 38, height: 38, borderRadius: 10, border: "1px solid rgba(200,225,240,0.9)",
              background: "rgba(255,255,255,0.75)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Calendar style={{ width: 16, height: 16, color: "#2980b9" }} />
            </button>
            <button
              onClick={() => navigate("/empresas/nova")}
              style={{
                height: 38, padding: "0 14px", borderRadius: 10, border: "none", cursor: "pointer",
                background: "linear-gradient(135deg, #2980b9, #1abc9c, #2ecc71, #2980b9)",
                backgroundSize: "200% 200%", animation: "gradientShift 4s ease infinite",
                color: "#fff", fontSize: 13, fontWeight: 700,
                display: "flex", alignItems: "center", gap: 6,
                boxShadow: "0 4px 14px rgba(41,128,185,0.35)",
              }}>
              <Plus style={{ width: 15, height: 15 }} />
              Novo
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "24px 28px 32px" }}>

          {/* ── Metric cards ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 14, marginBottom: 22 }}>
            {metrics.map((m, i) => (
              <motion.div
                key={m.label}
                className="metric-card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.38, delay: i * 0.06 }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: m.bg, display: "flex", alignItems: "center",
                  justifyContent: "center", marginBottom: 12,
                }}>
                  <m.icon style={{ width: 17, height: 17, color: m.color }} />
                </div>
                <div style={{ fontSize: 26, fontWeight: 900, color: "#0f2133", letterSpacing: "-0.03em", lineHeight: 1 }}>
                  {m.value}
                </div>
                <div style={{ fontSize: 11, color: "rgba(20,45,70,0.55)", fontWeight: 500, marginTop: 4, lineHeight: 1.3 }}>
                  {m.label}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                  <span style={{
                    display: "flex", alignItems: "center", gap: 2,
                    fontSize: 10, fontWeight: 600,
                    color: m.up ? "#27ae60" : "#e74c3c",
                  }}>
                    {m.up
                      ? <TrendingUp style={{ width: 10, height: 10 }} />
                      : <TrendingDown style={{ width: 10, height: 10 }} />
                    }
                    {m.delta}%
                  </span>
                  <Sparkline up={m.up} />
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── Middle row: chart + funnel ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, marginBottom: 16 }}>

            {/* Chart card */}
            <motion.div
              className="glass-card"
              style={{ padding: "22px 24px" }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, delay: 0.38 }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f2133" }}>Resumo de Atividades</div>
                  <div style={{ fontSize: 11, color: "rgba(20,45,70,0.45)", marginTop: 2 }}>Últimos 30 dias</div>
                </div>
                <button style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 10px", borderRadius: 8,
                  border: "1px solid rgba(200,225,240,0.9)",
                  background: "rgba(255,255,255,0.7)",
                  fontSize: 11, fontWeight: 600, color: "rgba(20,45,70,0.6)", cursor: "pointer",
                }}>
                  Últimos 30 dias <ChevronDown style={{ width: 11, height: 11 }} />
                </button>
              </div>

              <BarChart />

              {/* Legend row */}
              <div style={{
                display: "flex", alignItems: "center", gap: 16,
                marginTop: 16, paddingTop: 14,
                borderTop: "1px solid rgba(200,225,240,0.5)",
                flexWrap: "wrap",
              }}>
                {metrics.map((m) => (
                  <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 6,
                      background: m.bg, display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <m.icon style={{ width: 11, height: 11, color: m.color }} />
                    </div>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#0f2133" }}>{m.value} </span>
                      <span style={{ fontSize: 10, color: "rgba(20,45,70,0.45)" }}>{m.label.split(" ")[0]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Funnel */}
            <motion.div
              className="glass-card"
              style={{ padding: "22px 20px" }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, delay: 0.44 }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0f2133", marginBottom: 18 }}>
                Funil de Prospecção
              </div>

              {funnelData.map((f) => (
                <div key={f.label} className="funnel-bar">
                  <div style={{ flex: 1, position: "relative", height: 38 }}>
                    {/* Background track */}
                    <div style={{
                      position: "absolute", inset: 0,
                      borderRadius: 6,
                      background: `${f.color}18`,
                    }} />
                    {/* Filled portion */}
                    <div style={{
                      position: "absolute", top: 0, left: 0, bottom: 0,
                      width: `${f.pct}%`,
                      borderRadius: 6,
                      background: f.color,
                      minWidth: 8,
                      transition: "width 0.6s ease",
                    }} />
                    {/* Label always on top, clipped to container */}
                    <div style={{
                      position: "absolute", inset: 0,
                      display: "flex", alignItems: "center",
                      padding: "0 10px",
                      overflow: "hidden",
                    }}>
                      <span style={{
                        fontSize: 13, fontWeight: 600,
                        color: "#0f2133",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        textShadow: "none",
                      }}>
                        {f.label}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#0f2133", minWidth: 28, textAlign: "right" }}>
                    {f.value}
                  </span>
                </div>
              ))}

              {/* Conversion */}
              <div style={{
                marginTop: 18, paddingTop: 14,
                borderTop: "1px solid rgba(200,225,240,0.5)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(20,45,70,0.65)" }}>Taxa de Conversão</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#2980b9" }}>7.2%</span>
                </div>
                <div style={{ height: 6, borderRadius: 6, background: "rgba(41,128,185,0.12)" }}>
                  <div style={{
                    height: "100%", width: "48%", borderRadius: 6,
                    background: "linear-gradient(90deg, #2980b9, #1abc9c)",
                  }} />
                </div>
                <div style={{ fontSize: 10, color: "rgba(20,45,70,0.4)", marginTop: 4 }}>Meta: 15%</div>
              </div>
            </motion.div>
          </div>

          {/* ── Bottom row ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>

            {/* Recent activities */}
            <motion.div
              className="glass-card"
              style={{ padding: "20px 20px" }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, delay: 0.5 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f2133" }}>Atividades Recentes</div>
                <button style={{
                  display: "flex", alignItems: "center", gap: 3,
                  fontSize: 10, fontWeight: 600, color: "#2980b9",
                  background: "none", border: "none", cursor: "pointer",
                }}>
                  Ver todas <ArrowRight style={{ width: 10, height: 10 }} />
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {recentActivities.map((a) => (
                  <div key={a.name} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                      background: a.color, display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff",
                    }}>{a.initials}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#0f2133" }}>{a.name}</div>
                      <div style={{ fontSize: 11, color: "rgba(20,45,70,0.55)", marginTop: 1, lineHeight: 1.4 }}>{a.action}</div>
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(20,45,70,0.35)", whiteSpace: "nowrap", flexShrink: 0 }}>{a.time}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Next activities */}
            <motion.div
              className="glass-card"
              style={{ padding: "20px 20px" }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, delay: 0.56 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f2133" }}>Próximas Atividades</div>
                <button style={{
                  display: "flex", alignItems: "center", gap: 3,
                  fontSize: 10, fontWeight: 600, color: "#2980b9",
                  background: "none", border: "none", cursor: "pointer",
                }}>
                  Agenda <ArrowRight style={{ width: 10, height: 10 }} />
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {nextActivities.map((a) => (
                  <div key={a.label} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px", borderRadius: 10,
                    background: "rgba(255,255,255,0.55)",
                    border: "1px solid rgba(200,225,240,0.6)",
                  }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                      background: `${a.color}18`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <a.icon style={{ width: 14, height: 14, color: a.color }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#0f2133" }}>{a.label}</div>
                      <div style={{ fontSize: 10, color: "rgba(20,45,70,0.45)", marginTop: 1 }}>{a.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Featured leads */}
            <motion.div
              className="glass-card"
              style={{ padding: "20px 20px" }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, delay: 0.62 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f2133" }}>Leads em Destaque</div>
                <button style={{
                  display: "flex", alignItems: "center", gap: 3,
                  fontSize: 10, fontWeight: 600, color: "#2980b9",
                  background: "none", border: "none", cursor: "pointer",
                }}>
                  Ver todos <ArrowRight style={{ width: 10, height: 10 }} />
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {featuredLeads.map((l) => (
                  <div key={l.name} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px", borderRadius: 10,
                    background: "rgba(255,255,255,0.55)",
                    border: "1px solid rgba(200,225,240,0.6)",
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                      background: l.bg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700, color: "#fff",
                    }}>{l.initials}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#0f2133" }}>{l.name}</div>
                      <div style={{ fontSize: 10, color: "rgba(20,45,70,0.45)", marginTop: 1 }}>{l.sub}</div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                      background: `${l.tagColor}18`, color: l.tagColor,
                      border: `1px solid ${l.tagColor}30`,
                    }}>{l.tag}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </div>
  );
}
