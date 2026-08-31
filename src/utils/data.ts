/**
 * Leitura de datas da API.
 *
 * O JavaScript trata as duas formas ISO de maneira DIFERENTE:
 *
 *   new Date("2026-08-01")            -> meia-noite UTC
 *   new Date("2026-08-01T00:00:00")   -> meia-noite LOCAL
 *
 * Boa parte dos campos deste CRM sai de um <input type="date"> — que sempre
 * envia "YYYY-MM-DD" — e cai no primeiro caso: `data_proxima_acao`,
 * `ultima_interacao` e a `data` do evento do calendário. Em Brasília (UTC-3)
 * essas datas viravam 21h do dia ANTERIOR, e daí saíam erros de um dia:
 * follow-up marcado para hoje contava como atrasado, evento do dia 1º entrava
 * no mês anterior.
 *
 * Aqui a data pura é montada ao MEIO-DIA local — longe das viradas de horário
 * de verão, que acontecem de madrugada — e o timestamp completo é lido como
 * está, porque nele o fuso já vem explícito e o instante é o real.
 */

/** Converte data pura ou timestamp da API para um Date no fuso local. */
export function dataLocal(valor?: string | null): Date | null {
  if (!valor) return null;
  const soData = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor.trim());
  if (soData) return new Date(+soData[1], +soData[2] - 1, +soData[3], 12, 0, 0, 0);
  const d = new Date(valor);
  return isNaN(d.getTime()) ? null : d;
}

/** Meia-noite local do dia informado (hoje, por padrão). */
export function inicioDoDia(base: Date = new Date()): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0, 0);
}

/** true quando o valor cai no mesmo dia de calendário local que `base`. */
export function mesmoDia(valor?: string | null, base: Date = new Date()): boolean {
  const d = dataLocal(valor);
  if (!d) return false;
  return d.getFullYear() === base.getFullYear()
    && d.getMonth() === base.getMonth()
    && d.getDate() === base.getDate();
}

/**
 * Dias de CALENDÁRIO passados desde o valor — 1 significa "ontem", não
 * "24 horas atrás". Sem valor devolve Infinity: nunca ter acontecido é o pior
 * caso em toda cobrança de follow-up, não o melhor.
 */
export function diasDesde(valor?: string | null): number {
  const d = dataLocal(valor);
  if (!d) return Infinity;
  return Math.floor((inicioDoDia().getTime() - inicioDoDia(d).getTime()) / 86_400_000);
}

/** Dias até o valor: negativo quando já passou, 0 quando é hoje. */
export function diasAte(valor?: string | null): number | null {
  const d = dataLocal(valor);
  if (!d) return null;
  return Math.round((inicioDoDia(d).getTime() - inicioDoDia().getTime()) / 86_400_000);
}
