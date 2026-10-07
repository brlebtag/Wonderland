import { describe, expect, it } from 'vitest';
import {
  createEmptyMap,
  decodeRle,
  encodeRle,
  listLocations,
  positionAt,
  regionAnchors,
  type MapData,
} from '@wonderland/shared';

describe('RLE', () => {
  it('codifica e decodifica', () => {
    const values = Uint8Array.from([0, 0, 0, 1, 1, 2, 0]);
    const rle = encodeRle(values);
    expect(rle).toBe('0*3,1*2,2*1,0*1');
    expect([...decodeRle(rle, new Uint8Array(7))]).toEqual([...values]);
  });

  it('rejeita tamanho errado ou lixo', () => {
    expect(() => decodeRle('0*3', new Uint8Array(4))).toThrow();
    expect(() => decodeRle('0*5', new Uint8Array(4))).toThrow();
    expect(() => decodeRle('x*1', new Uint8Array(1))).toThrow();
  });

  it('mapa vazio é todo mar', () => {
    const map = createEmptyMap(10, 5);
    expect([...decodeRle(map.terrain, new Uint8Array(50))].every((v) => v === 0)).toBe(true);
  });
});

describe('regionAnchors', () => {
  it('escolhe uma célula dentro da região, mesmo em formato de "C"', () => {
    // região 1 em forma de C numa grade 3x3 (centro vazio)
    const grid = Uint16Array.from([1, 1, 1, 1, 0, 0, 1, 1, 1]);
    const a = regionAnchors(3, grid).get(1)!;
    const cell = Math.floor(a.y) * 3 + Math.floor(a.x);
    expect(grid[cell]).toBe(1);
  });
});

describe('listLocations', () => {
  it('lista marcadores, regiões (com células) e territórios', () => {
    const map: MapData = {
      ...createEmptyMap(4, 1),
      regionGrid: '0*2,7*2',
      regions: [
        { id: 'r1', code: 7, name: 'Norte', color: '#f00', ethnicityId: null },
        { id: 'r2', code: 8, name: 'Vazia', color: '#0f0', ethnicityId: null },
      ],
      features: [{ id: 'f1', type: 'city', name: 'Capital', x: 1, y: 0.5 }],
      territories: [
        { id: 't1', name: 'Tribo', ethnicityId: null, shape: { kind: 'circle', cx: 2, cy: 0.5, r: 1 } },
      ],
    };
    const locs = listLocations(map);
    expect(locs.map((l) => `${l.kind}:${l.name}`)).toEqual(['feature:Capital', 'region:Norte', 'territory:Tribo']);
    expect(locs[1]).toMatchObject({ x: 2.5, y: 0.5 });
  });
});

describe('positionAt', () => {
  const stops = [
    { t: 0, x: 0, y: 0, eventId: 'a' },
    { t: 10, x: 10, y: 0, eventId: 'b' },
    { t: 20, x: 10, y: 10, eventId: 'c' },
  ];

  it('não aparece antes do primeiro evento', () => {
    expect(positionAt(stops, -1)).toBeNull();
  });

  it('anda em linha reta proporcional ao tempo', () => {
    expect(positionAt(stops, 5)).toMatchObject({ x: 5, y: 0, moving: true });
    expect(positionAt(stops, 15)).toMatchObject({ x: 10, y: 5 });
  });

  it('fica parado depois do último evento', () => {
    expect(positionAt(stops, 99)).toMatchObject({ x: 10, y: 10, moving: false });
  });
});
