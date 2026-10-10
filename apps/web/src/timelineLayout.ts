// Posiciona eventos num eixo preservando a distância no tempo, em escala logarítmica.
//
// O log é aplicado ao intervalo entre eventos consecutivos, não à data absoluta:
//   pos[i] = pos[i-1] + pxPerLogDay * ln(1 + dias entre i-1 e i)
// Assim a ordem e a proporção dos intervalos se mantêm, mas um salto de séculos
// não empurra o resto da história para longe (1 dia ≈ 0,7 · k, 1 ano ≈ 5,9 · k, 100 anos ≈ 10,5 · k).

const DAY_MS = 86_400_000;

export type Orientation = 'horizontal' | 'vertical';

export type Cluster<T> = {
  pos: number;
  events: T[];
  /** Há espaço para mostrar o rótulo (data/título) sem colidir com o anterior. */
  showLabel: boolean;
};

export type Gap = {
  /** Ponto médio entre dois clusters. */
  pos: number;
  size: number;
  label: string;
  show: boolean;
};

export type LayoutOptions = {
  pxPerLogDay: number;
  /** Eventos a até esta distância do início de um cluster são agrupados num único círculo. */
  clusterPx: number;
  labelMinPx: number;
  gapLabelMinPx: number;
};

const toDays = (iso: string) => Date.parse(iso) / DAY_MS;

export function layoutTimeline<T extends { date: string }>(events: T[], opts: LayoutOptions) {
  const clusters: Cluster<T>[] = [];
  let prevPos = 0;
  let prevDay = 0;

  events.forEach((event, i) => {
    const day = toDays(event.date);
    const pos = i === 0 ? 0 : prevPos + opts.pxPerLogDay * Math.log1p(Math.max(0, day - prevDay));
    prevPos = pos;
    prevDay = day;

    const last = clusters.at(-1);
    if (last && pos - last.pos <= opts.clusterPx) last.events.push(event);
    else clusters.push({ pos, events: [event], showLabel: false });
  });

  let lastLabelPos = -Infinity;
  for (const cluster of clusters) {
    if (cluster.pos - lastLabelPos >= opts.labelMinPx) {
      cluster.showLabel = true;
      lastLabelPos = cluster.pos;
    }
  }

  const gaps: Gap[] = clusters.slice(1).map((b, i) => {
    const a = clusters[i];
    const days = toDays(b.events[0].date) - toDays(a.events.at(-1)!.date);
    const size = b.pos - a.pos;
    return {
      pos: (a.pos + b.pos) / 2,
      size,
      label: formatDuration(days),
      show: days > 0 && size >= opts.gapLabelMinPx,
    };
  });

  return { clusters, gaps, length: clusters.at(-1)?.pos ?? 0 };
}

/**
 * Tempo de um evento até os "dias atuais" (a data do evento mais recente da história).
 * Ex.: "37 anos atrás"; o próprio evento mais recente (ou do mesmo dia) é "dias atuais".
 */
export function formatSincePresent(date: string, present: string) {
  const days = toDays(present) - toDays(date);
  return days < 1 ? 'dias atuais' : `${formatDuration(days)} atrás`;
}

/** Idade completa em anos entre duas datas (ISO ou YYYY-MM-DD). */
export function ageAt(birth: string, at: string) {
  const b = new Date(birth.length === 10 ? `${birth}T00:00:00Z` : birth);
  const a = new Date(at.length === 10 ? `${at}T00:00:00Z` : at);
  let age = a.getUTCFullYear() - b.getUTCFullYear();
  const beforeBirthday =
    a.getUTCMonth() < b.getUTCMonth() ||
    (a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() < b.getUTCDate());
  if (beforeBirthday) age--;
  return age;
}

const dayOnly = (d: string) => d.slice(0, 10);

/** Idade por extenso entre duas datas: anos; abaixo de 1 ano, meses; abaixo de 1 mês, dias. */
export function formatAge(birth: string, at: string) {
  const years = ageAt(birth, at);
  if (years >= 1) return years === 1 ? '1 ano' : `${years} anos`;
  const days = Math.round(toDays(`${dayOnly(at)}T00:00:00Z`) - toDays(`${dayOnly(birth)}T00:00:00Z`));
  if (days >= 31) {
    const months = Math.floor(days / 30.44);
    return months === 1 ? '1 mês' : `${months} meses`;
  }
  return days === 1 ? '1 dia' : `${days} dias`;
}

/**
 * O que um evento representa na vida do personagem: "nascimento", a idade que ele tinha,
 * "antes de nascer", "falecimento (N anos)" ou "após o falecimento".
 * Sem data de nascimento não há o que dizer (undefined).
 */
export function lifeMoment(eventDate: string, birth?: string, death?: string) {
  if (!birth) return undefined;
  const day = dayOnly(eventDate);
  if (day === dayOnly(birth)) return 'nascimento';
  if (day < dayOnly(birth)) return 'antes de nascer';
  if (death && day === dayOnly(death)) return `falecimento (${formatAge(birth, death)})`;
  if (death && day > dayOnly(death)) return 'após o falecimento';
  return formatAge(birth, eventDate);
}

export function formatDuration(days: number) {
  const d = Math.round(days);
  if (d < 31) return d === 1 ? '1 dia' : `${d} dias`;
  if (days < 365) {
    const m = Math.round(days / 30.44);
    return m === 1 ? '1 mês' : `${m} meses`;
  }
  const y = days / 365.25;
  const years = y < 10 ? Math.round(y * 10) / 10 : Math.round(y);
  return `${years.toLocaleString('pt-BR')} ${years === 1 ? 'ano' : 'anos'}`;
}
