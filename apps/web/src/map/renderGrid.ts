import { LAND, TERRAIN_TYPES } from '@wonderland/shared';
import type { EditableMap } from './mapDoc';

/** Pixels de canvas por célula (só afeta a nitidez das bordas; o tamanho na tela vem do zoom). */
export const CANVAS_SCALE = 4;

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const TERRAIN_RGB = TERRAIN_TYPES.map((t) => hexToRgb(t.color));
const REGION_ALPHA = 0.42;

/**
 * Desenha a grade: terreno, regiões (tingidas com `regionColors`, código → cor) e as linhas
 * de costa e de fronteira entre regiões.
 */
export function renderGrid(
  canvas: HTMLCanvasElement,
  map: EditableMap,
  regionColors: Map<number, string>,
) {
  const { width: W, height: H, terrain, regionGrid } = map;

  // 1) uma cor por célula num canvas W×H...
  const cells = document.createElement('canvas');
  cells.width = W;
  cells.height = H;
  const cctx = cells.getContext('2d')!;
  const img = cctx.createImageData(W, H);
  const regionRgb = new Map([...regionColors].map(([code, hex]) => [code, hexToRgb(hex)]));
  for (let i = 0; i < W * H; i++) {
    let [r, g, b] = TERRAIN_RGB[terrain[i]] ?? TERRAIN_RGB[0];
    const tint = regionGrid[i] ? regionRgb.get(regionGrid[i]) : undefined;
    if (tint && terrain[i] === LAND) {
      r = r + (tint[0] - r) * REGION_ALPHA;
      g = g + (tint[1] - g) * REGION_ALPHA;
      b = b + (tint[2] - b) * REGION_ALPHA;
    }
    img.data.set([r, g, b, 255], i * 4);
  }
  cctx.putImageData(img, 0, 0);

  // 2) ...ampliado sem suavizar (pixels nítidos)
  const S = CANVAS_SCALE;
  canvas.width = W * S;
  canvas.height = H * S;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(cells, 0, 0, W * S, H * S);

  // 3) bordas: costa (terra ↔ água) e fronteira entre regiões
  const coast = new Path2D();
  const borders = new Path2D();
  const isLand = (i: number) => terrain[i] === LAND;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (x + 1 < W) {
        const j = i + 1;
        if (isLand(i) !== isLand(j)) {
          coast.moveTo((x + 1) * S, y * S);
          coast.lineTo((x + 1) * S, (y + 1) * S);
        } else if (isLand(i) && regionGrid[i] !== regionGrid[j]) {
          borders.moveTo((x + 1) * S, y * S);
          borders.lineTo((x + 1) * S, (y + 1) * S);
        }
      }
      if (y + 1 < H) {
        const j = i + W;
        if (isLand(i) !== isLand(j)) {
          coast.moveTo(x * S, (y + 1) * S);
          coast.lineTo((x + 1) * S, (y + 1) * S);
        } else if (isLand(i) && regionGrid[i] !== regionGrid[j]) {
          borders.moveTo(x * S, (y + 1) * S);
          borders.lineTo((x + 1) * S, (y + 1) * S);
        }
      }
    }
  }
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(90, 70, 45, 0.55)';
  ctx.stroke(borders);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#6b5a3c';
  ctx.stroke(coast);
}
