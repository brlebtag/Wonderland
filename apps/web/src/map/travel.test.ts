import { describe, expect, it } from 'vitest';
import { formatTravel, TRAVEL_MODES, travelTime } from './travel';

const [foot, horse] = TRAVEL_MODES;

describe('tempo de viagem', () => {
  it('usa ~27 km/dia a pé e ~45 km/dia a cavalo', () => {
    expect(travelTime(27, foot).days).toBeCloseTo(1);
    expect(travelTime(45.5, horse).days).toBeCloseTo(1);
  });

  it('até um dia de viagem mostra horas e minutos', () => {
    expect(formatTravel(15, foot)).toBe('≈ 3 h 20 min');
    expect(formatTravel(9, foot)).toBe('≈ 2 h');
    expect(formatTravel(2, horse)).toBe('≈ 18 min');
  });

  it('acima de um dia mostra dias', () => {
    expect(formatTravel(121.5, foot)).toBe('≈ 4,5 dias');
    expect(formatTravel(1887, foot)).toBe('≈ 70 dias');
    expect(formatTravel(1887, horse)).toBe('≈ 41 dias');
  });
});
