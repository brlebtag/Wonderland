// Tempo de viagem num ritmo leve a moderado, com pausas, para viagens de vários dias.
// Referências históricas aproximadas: a pé ~25–30 km/dia; a cavalo ~40–50 km/dia sem esgotar o animal.

export type TravelMode = { key: 'foot' | 'horse'; label: string; icon: string; kmPerHour: number; hoursPerDay: number };

export const TRAVEL_MODES: TravelMode[] = [
  { key: 'foot', label: 'A pé', icon: '🚶', kmPerHour: 4.5, hoursPerDay: 6 },
  { key: 'horse', label: 'A cavalo', icon: '🐎', kmPerHour: 6.5, hoursPerDay: 7 },
];

/** Horas de deslocamento (sem contar o descanso) e dias de viagem para percorrer `km`. */
export function travelTime(km: number, mode: TravelMode) {
  const hours = km / mode.kmPerHour;
  return { hours, days: hours / mode.hoursPerDay, kmPerDay: mode.kmPerHour * mode.hoursPerDay };
}

const fmt = (n: number, digits = 1) => (Math.round(n * 10 ** digits) / 10 ** digits).toLocaleString('pt-BR');

/**
 * Texto curto: até um dia de viagem em horas ("≈ 3 h 20 min"); acima, em dias ("≈ 4,5 dias").
 */
export function formatTravel(km: number, mode: TravelMode) {
  const { hours, days } = travelTime(km, mode);
  if (days <= 1) {
    const totalMin = Math.max(1, Math.round(hours * 60));
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h === 0) return `≈ ${m} min`;
    return m ? `≈ ${h} h ${m} min` : `≈ ${h} h`;
  }
  return days < 10 ? `≈ ${fmt(days)} dias` : `≈ ${Math.round(days).toLocaleString('pt-BR')} dias`;
}
