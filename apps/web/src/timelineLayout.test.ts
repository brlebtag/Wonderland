import { describe, expect, it } from 'vitest';
import { ageAt, formatDuration, formatSincePresent, layoutTimeline } from './timelineLayout';

const opts = { pxPerLogDay: 40, clusterPx: 20, labelMinPx: 100, gapLabelMinPx: 60 };
const ev = (id: string, date: string) => ({ id, date: `${date}T00:00:00.000Z` });

describe('layoutTimeline', () => {
  it('preserva a ordem e a proporção dos intervalos, comprimindo os grandes', () => {
    const { clusters } = layoutTimeline(
      [ev('a', '2000-01-01'), ev('b', '2000-01-11'), ev('c', '2000-04-10'), ev('d', '2100-01-01')],
      opts,
    );
    const [a, b, c, d] = clusters.map((cl) => cl.pos);
    expect(a).toBe(0);
    expect(b).toBeCloseTo(40 * Math.log1p(10));
    expect(c - b).toBeGreaterThan(b - a); // 90 dias > 10 dias
    expect(d - c).toBeGreaterThan(c - b); // 100 anos > 90 dias
    expect(d - c).toBeLessThan(5 * (c - b)); // ...mas comprimido pelo log
  });

  it('agrupa eventos do mesmo dia num único cluster', () => {
    const { clusters, gaps } = layoutTimeline(
      [ev('a', '2000-01-01'), ev('b', '2000-01-01'), ev('c', '2001-01-01')],
      opts,
    );
    expect(clusters.map((cl) => cl.events.map((e) => e.id))).toEqual([['a', 'b'], ['c']]);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].label).toBe('1 ano');
  });

  it('esconde rótulos que colidiriam com o anterior', () => {
    const { clusters } = layoutTimeline(
      [ev('a', '2000-01-01'), ev('b', '2000-01-03'), ev('c', '2010-01-01')],
      opts,
    );
    expect(clusters.map((cl) => cl.showLabel)).toEqual([true, false, true]);
  });

  it('lida com lista vazia', () => {
    expect(layoutTimeline([], opts)).toEqual({ clusters: [], gaps: [], length: 0 });
  });
});

describe('formatSincePresent', () => {
  const present = '2024-06-01T00:00:00.000Z';
  it('mede o tempo até o evento mais recente', () => {
    expect(formatSincePresent('1987-06-01T00:00:00.000Z', present)).toBe('37 anos atrás');
    expect(formatSincePresent('2024-05-20T00:00:00.000Z', present)).toBe('12 dias atrás');
    expect(formatSincePresent(present, present)).toBe('dias atuais');
  });
});

describe('ageAt', () => {
  it('conta anos completos, respeitando o aniversário', () => {
    expect(ageAt('1987-06-01', '2024-06-01')).toBe(37);
    expect(ageAt('1987-06-02', '2024-06-01T00:00:00.000Z')).toBe(36);
  });
});

describe('formatDuration', () => {
  it('formata dias, meses e anos', () => {
    expect(formatDuration(1)).toBe('1 dia');
    expect(formatDuration(12)).toBe('12 dias');
    expect(formatDuration(61)).toBe('2 meses');
    expect(formatDuration(365.25 * 2.5)).toBe('2,5 anos');
    expect(formatDuration(365.25 * 120)).toBe('120 anos');
  });
});
