import { formatKm, SPINS, type MapMeta, type Spin } from '@wonderland/shared';
import { useStoredState } from '../storage';
import { CELL_PX } from './MapView';

type Props = {
  map: { width: number; height: number };
  meta: MapMeta;
  zoom: number;
};

const spinShort = (s: Spin) => SPINS.find((x) => x.value === s)!.short;

/** Comprimento "redondo" (1, 2 ou 5 × 10ⁿ km) para a barra de escala ficar com ~110 px. */
function niceScale(pxPerKm: number, targetPx = 110) {
  const raw = targetPx / pxPerKm;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const km = [1, 2, 5, 10].map((m) => m * pow).reverse().find((v) => v <= raw) ?? pow;
  return { km, px: km * pxPerKm };
}

/** Rosa dos ventos de 8 pontas, com o norte em destaque. */
function CompassRose() {
  const long = (angle: number, fill: string) => (
    <g transform={`rotate(${angle})`}>
      <polygon points="0,-38 6,0 0,6" fill={fill} />
      <polygon points="0,-38 -6,0 0,6" fill="#f4eee0" stroke={fill} strokeWidth="0.8" />
    </g>
  );
  const short = (angle: number) => (
    <g transform={`rotate(${angle})`}>
      <polygon points="0,-24 4,0 -4,0" fill="#8a7a5c" opacity="0.85" />
    </g>
  );
  return (
    <svg className="compass" viewBox="-50 -50 100 100" aria-label="Rosa dos ventos: norte para cima">
      <circle r="30" fill="none" stroke="#6b5a3c" strokeWidth="1" opacity="0.6" />
      {[45, 135, 225, 315].map((a) => (
        <g key={a}>{short(a)}</g>
      ))}
      {long(0, '#9c1f1f')}
      {[90, 180, 270].map((a) => (
        <g key={a}>{long(a, '#4a3b25')}</g>
      ))}
      <circle r="3" fill="#4a3b25" />
      <text y="-41" className="compass-n">N</text>
      <text y="48" className="compass-l">S</text>
      <text x="45" y="3" className="compass-l">L</text>
      <text x="-45" y="3" className="compass-l">O</text>
    </svg>
  );
}

/** Globo com uma seta curva mostrando o sentido de rotação (prograde = para o leste/direita). */
function RotationIcon({ spin }: { spin: Spin }) {
  const east = spin === 'prograde';
  return (
    <svg viewBox="-16 -16 32 32" className="spin-icon" aria-hidden>
      <circle r="9" fill="#9cc3de" stroke="#3f6f94" strokeWidth="1.2" />
      <ellipse rx="9" ry="3.2" fill="none" stroke="#3f6f94" strokeWidth="0.8" opacity="0.7" />
      <path d="M -13 3 Q 0 11 13 3" fill="none" stroke="#c0392b" strokeWidth="1.8" />
      <polygon
        points={east ? '13,3 8,1 9,7' : '-13,3 -8,1 -9,7'}
        fill="#c0392b"
      />
    </svg>
  );
}

/** Três linhas onduladas com setas no sentido dos ventos. */
function WindIcon({ spin }: { spin: Spin }) {
  const east = spin === 'prograde';
  return (
    <svg viewBox="0 0 32 24" className="spin-icon" aria-hidden>
      {[5, 12, 19].map((y) => (
        <g key={y} transform={east ? undefined : 'translate(32 0) scale(-1 1)'}>
          <path d={`M 2 ${y} q 5 -3 10 0 t 10 0 t 6 0`} fill="none" stroke="#3f86c4" strokeWidth="1.6" />
          <polygon points={`30,${y} 25,${y - 3} 25,${y + 3}`} fill="#3f86c4" />
        </g>
      ))}
    </svg>
  );
}

/**
 * Canto inferior direito do mapa: rosa dos ventos, barra de escala em km e a legenda
 * de rotação do planeta e direção dos ventos. Fica fixo enquanto o mapa rola.
 */
export function MapOverlay({ map, meta, zoom }: Props) {
  const kmPerCellX = meta.widthKm / map.width;
  const pxPerKm = (CELL_PX * zoom) / kmPerCellX;
  const scale = niceScale(pxPerKm, 80);
  // minimizado: só a rosa dos ventos (para não cobrir o mapa em telas pequenas)
  const [collapsed, setCollapsed] = useStoredState('wonderland.mapOverlayCollapsed', false, (raw) =>
    raw === 'true' ? true : raw === 'false' ? false : undefined,
  );
  return (
    <div className={`map-overlay ${collapsed ? 'collapsed' : ''}`}>
      <button
        type="button"
        className="overlay-toggle"
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? 'Mostrar escala e legenda' : 'Minimizar'}
      >
        {collapsed ? '+' : '–'}
      </button>
      <CompassRose />
      {collapsed ? null : (
        <>
      <div className="map-scale" title="Escala na largura do mapa">
        <div className="map-scale-bar" style={{ width: scale.px }} />
        <span>{formatKm(scale.km)}</span>
      </div>
      <div className="spin-row" title="Sentido de rotação do planeta">
        <RotationIcon spin={meta.rotation} />
        <span>
          Rotação: <strong>{spinShort(meta.rotation)}</strong>
        </span>
      </div>
      <div className="spin-row" title="Direção predominante dos ventos">
        <WindIcon spin={meta.winds} />
        <span>
          Ventos: <strong>{spinShort(meta.winds)}</strong>
        </span>
      </div>
        </>
      )}
    </div>
  );
}
