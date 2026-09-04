/**
 * A barra de filtro da tela.
 *
 * Fica ACIMA de tudo e vale para tudo, de propósito. Antes o seletor de
 * período morava dentro do card do gráfico de evolução, e os outros seis
 * blocos o ignoravam — dois números na mesma tela podiam estar falando de
 * janelas de tempo diferentes sem nada avisando. Filtro dentro de um card
 * filtra um card; a pergunta do gerente é sobre a tela inteira.
 *
 * ── Hierarquia ─────────────────────────────────────────────────────────────
 * A lista de vendedores vem de `GET /usuarios`, que o backend já entrega
 * escopada: o gerente recebe a conta inteira, o supervisor recebe a si mesmo e
 * os vendedores que apontam para ele. Este componente NÃO reimplementa esse
 * recorte — ele monta as opções com o que chegou. Um segundo filtro de
 * hierarquia aqui poderia divergir do backend, e a divergência apareceria como
 * um vendedor que existe no menu e não tem dado nenhum.
 */

import { Users, CalendarRange, Layers, GitCompareArrows } from "lucide-react";

import Dropdown from "../../components/Dropdown";
import useIsMobile from "../../hooks/useIsMobile";
import type { Filtro, UsuarioMetrica } from "../../utils/metricas";

const MESES_LONGOS = ["janeiro","fevereiro","março","abril","maio","junho",
                      "julho","agosto","setembro","outubro","novembro","dezembro"];

/** "julho a dezembro de 2025" — o intervalo em palavras, para a legenda. */
export function intervaloEmPalavras(inicio: Date, fim: Date): string {
  const mi = MESES_LONGOS[inicio.getMonth()], mf = MESES_LONGOS[fim.getMonth()];
  if (inicio.getFullYear() !== fim.getFullYear()) {
    return `${mi} de ${inicio.getFullYear()} a ${mf} de ${fim.getFullYear()}`;
  }
  return `${mi} a ${mf} de ${fim.getFullYear()}`;
}

export default function FiltroGlobal({
  filtro, aoMudar, usuarios, segmentos, comparar, aoTrocarComparar, intervalo,
}: {
  filtro: Filtro;
  aoMudar: (f: Filtro) => void;
  usuarios: UsuarioMetrica[];
  segmentos: string[];
  comparar: boolean;
  aoTrocarComparar: () => void;
  /** Texto do período atual, mostrado à direita — "janeiro a junho de 2026". */
  intervalo: string;
}) {
  const isMobile = useIsMobile();

  const opcoesVendedor = [{ valor: "todos", rotulo: "Todos os vendedores" }].concat(
    usuarios
      .filter(u => u.role === "vendedor" || u.role === "supervisor")
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
      .map(u => ({
        valor: u.usuario_id,
        rotulo: u.nome,
        // O supervisor aparece marcado: sem isso, ver o nome dele numa lista de
        // vendedores parece erro de cadastro.
        detalhe: u.role === "supervisor" ? "supervisor" : (u.supervisor_nome || undefined),
      })) as any
  );

  const opcoesSegmento = [{ valor: "todos", rotulo: "Todos os segmentos" }].concat(
    segmentos.map(s => ({ valor: s, rotulo: s })) as any
  );

  return (
    <div className="glass-card barra-filtro"
         style={{ padding: isMobile ? "12px 14px" : "12px 16px", display: "flex",
                  alignItems: "center", gap: 10, flexWrap: "wrap" }}>

      <Campo icone={CalendarRange} rotulo="Período">
        <Dropdown
          valor={String(filtro.meses)} onChange={v => aoMudar({ ...filtro, meses: Number(v) })}
          ariaLabel="Período analisado" largura={isMobile ? 128 : 138} altura={36}
          opcoes={[3, 6, 12].map(n => ({ valor: String(n), rotulo: `${n} meses` }))}
        />
      </Campo>

      <Campo icone={Users} rotulo="Vendedor">
        <Dropdown
          valor={filtro.vendedor} onChange={v => aoMudar({ ...filtro, vendedor: v })}
          ariaLabel="Filtrar por vendedor" largura={isMobile ? 168 : 196} altura={36}
          busca={opcoesVendedor.length > 8} opcoes={opcoesVendedor}
        />
      </Campo>

      <Campo icone={Layers} rotulo="Segmento">
        <Dropdown
          valor={filtro.segmento} onChange={v => aoMudar({ ...filtro, segmento: v })}
          ariaLabel="Filtrar por segmento" largura={isMobile ? 168 : 196} altura={36}
          busca={opcoesSegmento.length > 8} opcoes={opcoesSegmento}
        />
      </Campo>

      {/* O botão de comparar controla só a SOBREPOSIÇÃO nos gráficos. O Δ das
          caixas de indicador não depende dele: ali a comparação é o ponto da
          caixa, e escondê-la deixaria um número solto sem referência. */}
      <button type="button" onClick={aoTrocarComparar} aria-pressed={comparar}
        title="Sobrepõe a curva do período anterior nos gráficos de evolução"
        style={{ display: "flex", alignItems: "center", gap: 7, height: 36, padding: "0 12px",
                 borderRadius: 9, cursor: "pointer", fontSize: 12, fontWeight: 600,
                 border: `1px solid ${comparar ? "rgba(126,176,219,0.45)" : "rgba(126,176,219,0.18)"}`,
                 background: comparar ? "#1A3F63" : "transparent",
                 color: comparar ? "#FFFFFF" : "#B6CFE4", alignSelf: "flex-end" }}>
        <GitCompareArrows style={{ width: 14, height: 14 }} aria-hidden="true" />
        Comparar
      </button>

      <div style={{ marginLeft: isMobile ? 0 : "auto", alignSelf: "flex-end",
                    fontSize: 11.5, color: "#8AA9C6", paddingBottom: 9 }}>
        {intervalo}
      </div>
    </div>
  );
}

function Campo({ icone: Icone, rotulo, children }: {
  icone: any; rotulo: string; children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10,
                     fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                     color: "rgba(182,207,228,0.75)" }}>
        <Icone style={{ width: 11, height: 11 }} aria-hidden="true" />
        {rotulo}
      </span>
      {children}
    </div>
  );
}
