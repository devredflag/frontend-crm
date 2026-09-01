import { useMemo } from "react";
import { motion } from "framer-motion";

import { dataLocal, inicioDoDia, mesmoDia, diasDesde } from "../utils/data";
import type { EmpresaSerie } from "./EvolucaoDaBase";

// ── Precisam de atenção ────────────────────────────────────
// Quatro contagens de coisa parada. Tudo sai da lista de empresas que a tela
// ja carregou -- nenhuma chamada nova. Rascunhos, fechados e perdidos ficam
// de fora: não ha o que cobrar de quem ja saiu do funil.
// `diasDesde` e `mesmoDia` agora vêm de utils/data: as datas destes campos
// saem de <input type="date"> e chegam como "YYYY-MM-DD", que o JS lê como
// meia-noite UTC. Em Brasília isso virava 21h do dia anterior — um retorno
// marcado para HOJE caía como vencido e sumia da contagem de hoje.
export default function PrecisamDeAtencao({ empresas }: { empresas: EmpresaSerie[] }) {
  const alertas = useMemo(() => {
    const ativas = empresas.filter(e =>
      e.status !== "Rascunho" && e.status !== "Fechado" && e.status !== "Perdido"
    );

    return [
      {
        titulo: "Sem contato há 15+ dias",
        sub: "Risco de perder o vínculo",
        valor: ativas.filter(e => diasDesde(e.ultima_interacao) >= 15).length,
        cor: "#F0A05A",
        destaca: true,
      },
      {
        titulo: "Quentes esfriando",
        sub: "Sem contato há 5+ dias",
        valor: ativas.filter(e => e.temperatura === "Quente" && diasDesde(e.ultima_interacao) >= 5).length,
        cor: "#F87171",
        destaca: false,
      },
      {
        // Substituiu "Leads sem responsável": essa contagem não existe mais
        // como situação real. É a mesma ideia de cobrança — compromisso
        // combinado que passou da data — e sai dos dados que a tela já tem.
        titulo: "Retorno vencido",
        sub: "Follow-up passou da data",
        valor: ativas.filter(e => {
          const d = dataLocal(e.data_proxima_acao);
          return !!d && inicioDoDia(d).getTime() < inicioDoDia().getTime();
        }).length,
        cor: "#F87171",
        destaca: true,
      },
      {
        titulo: "Retornos agendados hoje",
        sub: "Follow-up marcado",
        valor: ativas.filter(e => mesmoDia(e.data_proxima_acao)).length,
        cor: "#8FC4FA",
        destaca: false,
      },
    ];
  }, [empresas]);

  return (
    <motion.div
      className="glass-card"
      style={{padding:"22px 24px",height:"100%",display:"flex",flexDirection:"column"}}
      initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:0.4,delay:0.5}}
    >
      <div style={{fontSize:16,fontWeight:800,color:"#FFFFFF",letterSpacing:"-0.01em"}}>Precisam de atenção</div>
      <div style={{fontSize:12,color:"#B6CFE4",marginTop:3}}>Base em risco de esfriar</div>

      {/* as quatro linhas se espalham pelo que sobrar, para o card acompanhar
          a altura do gráfico ao lado em vez de parar no meio */}
      <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"space-around",marginTop:8}}>
      {alertas.map((a,i)=>(
        <div
          key={a.titulo}
          style={{
            display:"flex",alignItems:"center",gap:12,padding:"14px 0",
            borderTop:i===0?"none":"1px solid rgba(126,176,219,0.16)",
          }}
        >
          <span style={{width:7,height:7,borderRadius:"50%",background:a.cor,flexShrink:0}}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:700,color:"#FFFFFF"}}>{a.titulo}</div>
            <div style={{fontSize:11,color:"#B6CFE4",marginTop:2}}>{a.sub}</div>
          </div>
          <span style={{fontSize:15,fontWeight:800,color:a.valor>0&&a.destaca?a.cor:"#FFFFFF",flexShrink:0}}>
            {a.valor}
          </span>
        </div>
      ))}
      </div>
    </motion.div>
  );
}
