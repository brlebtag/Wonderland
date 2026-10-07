import { parseZoom, ZOOMS, type ZoomPref } from './useFitZoom';

export function ZoomSelect({ value, onChange }: { value: ZoomPref; onChange: (z: ZoomPref) => void }) {
  // zoom livre (vindo da roda do mouse) aparece como uma opção a mais
  const custom = typeof value === 'number' && !ZOOMS.includes(value);
  return (
    <label className="inline" title="Roda do mouse sobre o mapa também dá zoom">
      Zoom
      <select value={String(value)} onChange={(e) => onChange(parseZoom(e.target.value) ?? 'fit')}>
        <option value="fit">Ajustar à tela</option>
        {custom && <option value={String(value)}>{Math.round(value * 100)}%</option>}
        {ZOOMS.map((z) => (
          <option key={z} value={z}>
            {z * 100}%
          </option>
        ))}
      </select>
    </label>
  );
}
