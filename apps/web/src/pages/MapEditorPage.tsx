import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  createEmptyMap,
  FEATURE_TYPES,
  LAND,
  MAX_SIZE,
  MIN_SIZE,
  PATH_TYPES,
  TERRAIN_TYPES,
  type FeatureType,
  type MapData,
  type PathType,
  type Point,
} from '@wonderland/shared';
import { useEthnicities, useMap, useSaveMap, useStory, type Ethnicity } from '../api';
import { cloneMap, fromData, newId, REGION_PALETTE, toData, type EditableMap } from '../map/mapDoc';
import {
  CELL_PX,
  featureExtent,
  MapView,
  parseColorMode,
  type MapSelection,
  type RegionColorMode,
} from '../map/MapView';
import { parseZoom, useFitZoom, type ZoomPref } from '../map/useFitZoom';
import { useMapNavigation } from '../map/useMapNavigation';
import { ZoomSelect } from '../map/ZoomSelect';
import { useStoredState } from '../storage';

type Tool = 'pan' | 'select' | 'terrain' | 'region' | 'feature' | 'path' | 'circle' | 'polygon';

const TOOLS: { value: Tool; label: string; hint: string }[] = [
  { value: 'pan', label: '✋ Mover', hint: 'Arraste para mover o mapa. Em qualquer ferramenta: Espaço + arrastar ou botão do meio.' },
  { value: 'select', label: '🖱️ Selecionar', hint: 'Clique num elemento para editar; arraste marcadores para mover.' },
  { value: 'terrain', label: '🖌️ Terreno', hint: 'Pinte terra, mar e lagos.' },
  { value: 'region', label: '🗺️ Regiões', hint: 'Pinte regiões sobre a terra (a borracha tira a região).' },
  { value: 'feature', label: '📍 Marcador', hint: 'Clique para colocar cidades, vulcões, cordilheiras, rótulos... Arraste as alças nos cantos para redimensionar.' },
  { value: 'path', label: '〰️ Linhas', hint: 'Rios, estradas e cordilheiras: clique ponto a ponto; duplo clique ou Enter conclui, Esc cancela.' },
  { value: 'circle', label: '◯ Território (raio)', hint: 'Arraste do centro para fora para definir o raio.' },
  { value: 'polygon', label: '⬠ Território (polígono)', hint: 'Clique os vértices; duplo clique ou Enter conclui.' },
];

const SIZE_PRESETS = [
  { label: 'Pequeno (160 × 100)', width: 160, height: 100 },
  { label: 'Médio (240 × 150)', width: 240, height: 150 },
  { label: 'Grande (360 × 225)', width: 360, height: 225 },
];


export function MapEditorPage() {
  const { id: storyId = '' } = useParams();
  const story = useStory(storyId);
  const map = useMap(storyId);
  const ethnicities = useEthnicities(storyId);
  const [fresh, setFresh] = useState<MapData | null>(null);
  const [preset, setPreset] = useState(1);

  if (story.isLoading || map.isLoading) return <main className="container muted">Carregando…</main>;
  if (!story.data) {
    return (
      <main className="container">
        <p className="error">História não encontrada.</p>
        <Link to="/">← Voltar</Link>
      </main>
    );
  }

  const initial = map.data?.data ?? fresh;
  if (!initial) {
    return (
      <main className="container">
        <Link to={`/stories/${storyId}/map`}>← {story.data.title}</Link>
        <h1>Novo mapa</h1>
        <section className="card form">
          <p className="muted">
            O mapa é uma grade de células que você pinta como num editor de imagem. Escolha o tamanho
            (não dá para mudar depois):
          </p>
          <label>
            Tamanho
            <select value={preset} onChange={(e) => setPreset(Number(e.target.value))}>
              {SIZE_PRESETS.map((p, i) => (
                <option key={p.label} value={i}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <div className="actions">
            <button
              onClick={() => setFresh(createEmptyMap(SIZE_PRESETS[preset].width, SIZE_PRESETS[preset].height))}
            >
              Criar mapa
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <MapEditor
      storyId={storyId}
      storyTitle={story.data.title}
      initial={initial}
      isNew={!map.data?.data}
      ethnicities={ethnicities.data ?? []}
    />
  );
}

function EthnicitySelect({
  value,
  ethnicities,
  onChange,
  onFocus,
}: {
  value: string | null;
  ethnicities: Ethnicity[];
  onChange: (id: string | null) => void;
  onFocus?: () => void;
}) {
  return (
    <select value={value ?? ''} onFocus={onFocus} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">— sem etnia —</option>
      {ethnicities.map((e) => (
        <option key={e.id} value={e.id}>
          {e.name}
        </option>
      ))}
      {value && !ethnicities.some((e) => e.id === value) && <option value={value}>(etnia na lixeira)</option>}
    </select>
  );
}

type Gesture =
  | { kind: 'paint'; last: Point }
  | { kind: 'circle' }
  | { kind: 'drag'; id: string; moved: boolean }
  | { kind: 'resize'; id: string; cx: number; cy: number; startDist: number; startSize: number };

function MapEditor({
  storyId,
  storyTitle,
  initial,
  isNew,
  ethnicities,
}: {
  storyId: string;
  storyTitle: string;
  initial: MapData;
  isNew: boolean;
  ethnicities: Ethnicity[];
}) {
  const navigate = useNavigate();
  const save = useSaveMap(storyId);
  const [doc, setDoc] = useState<EditableMap>(() => fromData(initial));
  const [gridVersion, setGridVersion] = useState(0);
  const [dirty, setDirty] = useState(isNew);
  const [message, setMessage] = useState<string>();

  const [tool, setToolState] = useState<Tool>('terrain');
  const [terrainCode, setTerrainCode] = useState<number>(LAND);
  const [brush, setBrush] = useState(6);
  const [regionCode, setRegionCode] = useState(0); // 0 = borracha de região
  // Ligado: o pincel de região só preenche terra sem região (ou da própria região),
  // então pintar uma região vizinha forma a fronteira em vez de "comer" a outra.
  const [protectRegions, setProtectRegions] = useStoredState('wonderland.protectRegions', true, (raw) =>
    raw === 'true' ? true : raw === 'false' ? false : undefined,
  );
  const [featureType, setFeatureType] = useState<FeatureType>('city');
  const [pathType, setPathType] = useState<PathType>('river');
  const [zoomPref, setZoomPref] = useStoredState<ZoomPref>('wonderland.mapZoomPref', 'fit', parseZoom);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fitZoom = useFitZoom(scrollRef, doc.width, doc.height);
  const zoom = zoomPref === 'fit' ? fitZoom : zoomPref;
  // Espaço segurado = arrastar o mapa com qualquer ferramenta
  const [spaceDown, setSpaceDown] = useState(false);
  const { panning, containerProps } = useMapNavigation({
    scrollRef,
    zoom,
    setZoom: setZoomPref,
    shouldPan: (e) => e.button === 1 || (e.button === 0 && (spaceDown || tool === 'pan')),
  });
  const [colorMode, setColorMode] = useStoredState<RegionColorMode>('wonderland.regionColorMode', 'region', parseColorMode);

  const [selected, setSelected] = useState<MapSelection | null>(null);
  const [draft, setDraft] = useState<Point[]>([]);
  const [circle, setCircle] = useState<{ cx: number; cy: number; r: number } | null>(null);
  const [hover, setHover] = useState<Point | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const undoStack = useRef<EditableMap[]>([]);
  // Os handlers de pintura mutam as grades do documento atual.
  const docRef = useRef(doc);
  docRef.current = doc;

  // ---------- documento / desfazer ----------

  function pushUndo() {
    undoStack.current.push(cloneMap(docRef.current));
    if (undoStack.current.length > 100) undoStack.current.shift();
    setDirty(true);
    setMessage(undefined);
  }

  function undo() {
    const prev = undoStack.current.pop();
    if (!prev) return;
    setDoc(prev);
    setGridVersion((v) => v + 1);
    setSelected(null);
    setDirty(true);
  }

  const update = (fn: (d: EditableMap) => EditableMap) => setDoc((d) => fn(d));

  function setTool(t: Tool) {
    setToolState(t);
    setDraft([]);
    setCircle(null);
    if (t !== 'select') setSelected(null);
  }

  // ---------- pintura ----------

  function paintAt([px, py]: Point) {
    const d = docRef.current;
    const r = Math.max(0.5, brush / 2);
    for (let y = Math.max(0, Math.floor(py - r)); y <= Math.min(d.height - 1, Math.floor(py + r)); y++) {
      for (let x = Math.max(0, Math.floor(px - r)); x <= Math.min(d.width - 1, Math.floor(px + r)); x++) {
        const inside = (x + 0.5 - px) ** 2 + (y + 0.5 - py) ** 2 <= r * r;
        const under = x === Math.floor(px) && y === Math.floor(py);
        if (!inside && !under) continue;
        const i = y * d.width + x;
        if (tool === 'terrain') {
          d.terrain[i] = terrainCode;
          if (terrainCode !== LAND) d.regionGrid[i] = 0; // região só existe sobre a terra
        } else if (d.terrain[i] === LAND) {
          const other = d.regionGrid[i] !== 0 && d.regionGrid[i] !== regionCode;
          // a borracha (código 0) sempre apaga; as regiões respeitam as vizinhas se protegido
          if (other && regionCode !== 0 && protectRegions) continue;
          d.regionGrid[i] = regionCode;
        }
      }
    }
  }

  function strokeTo(to: Point, from: Point) {
    const dist = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const steps = Math.max(1, Math.ceil(dist / Math.max(0.5, brush / 4)));
    for (let k = 1; k <= steps; k++) {
      paintAt([from[0] + ((to[0] - from[0]) * k) / steps, from[1] + ((to[1] - from[1]) * k) / steps]);
    }
  }

  // ---------- ponteiro ----------

  const toCell = (e: { clientX: number; clientY: number }): Point => {
    const r = svgRef.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * doc.width, ((e.clientY - r.top) / r.height) * doc.height];
  };

  function onPointerDown(e: PointerEvent<SVGSVGElement>) {
    if (e.button !== 0) return;
    const p = toCell(e);
    switch (tool) {
      case 'terrain':
      case 'region':
        pushUndo();
        paintAt(p);
        setGridVersion((v) => v + 1);
        gesture.current = { kind: 'paint', last: p };
        e.currentTarget.setPointerCapture(e.pointerId);
        break;
      case 'feature': {
        pushUndo();
        const feature = { id: newId(), type: featureType, name: '', x: p[0], y: p[1] };
        update((d) => ({ ...d, features: [...d.features, feature] }));
        setSelected({ kind: 'feature', id: feature.id });
        break;
      }
      case 'path':
      case 'polygon':
        setDraft((d) => [...d, p]);
        break;
      case 'circle':
        setCircle({ cx: p[0], cy: p[1], r: 0 });
        gesture.current = { kind: 'circle' };
        e.currentTarget.setPointerCapture(e.pointerId);
        break;
      case 'select':
        setSelected(null);
        break;
    }
  }

  function onPointerMove(e: PointerEvent<SVGSVGElement>) {
    const p = toCell(e);
    setHover(p);
    const g = gesture.current;
    if (!g) return;
    if (g.kind === 'paint') {
      strokeTo(p, g.last);
      g.last = p;
      setGridVersion((v) => v + 1);
    } else if (g.kind === 'circle') {
      setCircle((c) => c && { ...c, r: Math.hypot(p[0] - c.cx, p[1] - c.cy) });
    } else if (g.kind === 'drag') {
      if (!g.moved) {
        pushUndo();
        g.moved = true;
      }
      update((d) => ({
        ...d,
        features: d.features.map((f) => (f.id === g.id ? { ...f, x: p[0], y: p[1] } : f)),
      }));
    } else if (g.kind === 'resize') {
      // escala proporcional à distância do cursor ao centro do marcador
      const dist = Math.hypot(p[0] - g.cx, p[1] - g.cy);
      const size = Math.min(MAX_SIZE, Math.max(MIN_SIZE, (g.startSize * dist) / g.startDist));
      update((d) => ({
        ...d,
        features: d.features.map((f) => (f.id === g.id ? { ...f, size: Math.round(size * 100) / 100 } : f)),
      }));
    }
  }

  /** Alça de canto do marcador selecionado: começa a redimensionar. */
  function startResize(e: PointerEvent, featureId: string) {
    e.stopPropagation();
    const f = docRef.current.features.find((x) => x.id === featureId);
    if (!f) return;
    pushUndo();
    const p = toCell(e);
    gesture.current = {
      kind: 'resize',
      id: f.id,
      cx: f.x,
      cy: f.y,
      startDist: Math.max(0.5, Math.hypot(p[0] - f.x, p[1] - f.y)),
      startSize: f.size ?? 1,
    };
    svgRef.current?.setPointerCapture(e.pointerId);
  }

  function onPointerUp() {
    const g = gesture.current;
    gesture.current = null;
    if (g?.kind === 'circle' && circle) {
      if (circle.r >= 1) {
        pushUndo();
        const territory = {
          id: newId(),
          name: '',
          ethnicityId: null,
          shape: { kind: 'circle' as const, ...circle },
        };
        update((d) => ({ ...d, territories: [...d.territories, territory] }));
        setToolState('select');
        setSelected({ kind: 'territory', id: territory.id });
      }
      setCircle(null);
    }
  }

  function onElementPointerDown(selection: MapSelection, e: PointerEvent) {
    setSelected(selection);
    if (selection.kind === 'feature') {
      gesture.current = { kind: 'drag', id: selection.id, moved: false };
      svgRef.current?.setPointerCapture(e.pointerId);
    }
  }

  function finishDraft() {
    // duplo clique gera cliques extras no mesmo ponto: remove pontos repetidos
    const points = draft.filter(
      (p, i) => i === 0 || Math.hypot(p[0] - draft[i - 1][0], p[1] - draft[i - 1][1]) > 0.3,
    );
    if (tool === 'path' && points.length >= 2) {
      pushUndo();
      const path = { id: newId(), type: pathType, name: '', points };
      update((d) => ({ ...d, paths: [...d.paths, path] }));
      setToolState('select');
      setSelected({ kind: 'path', id: path.id });
    } else if (tool === 'polygon' && points.length >= 3) {
      pushUndo();
      const territory = { id: newId(), name: '', ethnicityId: null, shape: { kind: 'polygon' as const, points } };
      update((d) => ({ ...d, territories: [...d.territories, territory] }));
      setToolState('select');
      setSelected({ kind: 'territory', id: territory.id });
    }
    setDraft([]);
  }

  function deleteSelected() {
    if (!selected) return;
    pushUndo();
    update((d) => ({
      ...d,
      features: d.features.filter((f) => !(selected.kind === 'feature' && f.id === selected.id)),
      paths: d.paths.filter((p) => !(selected.kind === 'path' && p.id === selected.id)),
      territories: d.territories.filter((t) => !(selected.kind === 'territory' && t.id === selected.id)),
    }));
    setSelected(null);
  }

  // ---------- teclado ----------

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof Element && e.target.closest('input, textarea, select');
      if (e.key === ' ' && !typing) {
        e.preventDefault(); // não rolar a página
        if (!e.repeat) setSpaceDown(true);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault();
        undo();
      } else if (e.key === 'Enter' && !typing && draft.length) {
        finishDraft();
      } else if (e.key === 'Escape') {
        setDraft([]);
        setCircle(null);
        setSelected(null);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !typing && selected) {
        deleteSelected();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') setSpaceDown(false);
    };
    // trocar de janela com o Espaço apertado não pode deixar o "arrastar" preso
    const onBlur = () => setSpaceDown(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  });

  // aviso ao fechar a aba com alterações não salvas
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  // ---------- regiões ----------

  function addRegion() {
    pushUndo();
    const code = Math.max(0, ...doc.regions.map((r) => r.code)) + 1;
    const region = {
      id: newId(),
      code,
      name: `Região ${doc.regions.length + 1}`,
      color: REGION_PALETTE[doc.regions.length % REGION_PALETTE.length],
      ethnicityId: null,
    };
    update((d) => ({ ...d, regions: [...d.regions, region] }));
    setRegionCode(code);
    setToolState('region');
  }

  function updateRegion(id: string, patch: Partial<EditableMap['regions'][number]>) {
    setDirty(true);
    update((d) => ({ ...d, regions: d.regions.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  }

  function deleteRegion(id: string) {
    const region = doc.regions.find((r) => r.id === id)!;
    if (!confirm(`Excluir a região "${region.name}"? As células dela ficam sem região e eventos neste local ficam sem local ao salvar.`)) return;
    pushUndo();
    const d = docRef.current;
    for (let i = 0; i < d.regionGrid.length; i++) if (d.regionGrid[i] === region.code) d.regionGrid[i] = 0;
    update((m) => ({ ...m, regions: m.regions.filter((r) => r.id !== id) }));
    if (regionCode === region.code) setRegionCode(0);
    setGridVersion((v) => v + 1);
  }

  // ---------- salvar ----------

  async function handleSave() {
    setMessage(undefined);
    try {
      const result = await save.mutateAsync(toData(doc));
      setDirty(false);
      setMessage(
        result.clearedEvents > 0
          ? `Mapa salvo. ${result.clearedEvents} evento(s) ficaram sem local (o lugar foi removido do mapa).`
          : 'Mapa salvo.',
      );
    } catch (err) {
      setMessage(`Erro ao salvar: ${(err as Error).message}`);
    }
  }

  function leave() {
    if (dirty && !confirm('Há alterações não salvas. Sair mesmo assim?')) return;
    navigate(`/stories/${storyId}/map`);
  }

  // ---------- render ----------

  const selFeature = selected?.kind === 'feature' ? doc.features.find((f) => f.id === selected.id) : undefined;
  const selPath = selected?.kind === 'path' ? doc.paths.find((p) => p.id === selected.id) : undefined;
  const selTerritory =
    selected?.kind === 'territory' ? doc.territories.find((t) => t.id === selected.id) : undefined;

  const patchFeature = (patch: Partial<typeof selFeature>) => {
    setDirty(true);
    update((d) => ({ ...d, features: d.features.map((f) => (f.id === selFeature!.id ? { ...f, ...patch } : f)) }));
  };
  const patchPath = (patch: Partial<typeof selPath>) => {
    setDirty(true);
    update((d) => ({ ...d, paths: d.paths.map((p) => (p.id === selPath!.id ? { ...p, ...patch } : p)) }));
  };
  const patchTerritory = (patch: Partial<typeof selTerritory>) => {
    setDirty(true);
    update((d) => ({
      ...d,
      territories: d.territories.map((t) => (t.id === selTerritory!.id ? { ...t, ...patch } : t)),
    }));
  };

  const brushTool = tool === 'terrain' || tool === 'region';
  const cursor =
    spaceDown || tool === 'pan'
      ? panning
        ? 'grabbing'
        : 'grab'
      : tool === 'select'
        ? 'default'
        : brushTool
          ? 'none'
          : 'crosshair';

  return (
    <main className="map-editor-page">
      <div className="page-header">
        <div>
          <button className="link" onClick={leave}>
            ← {storyTitle}
          </button>
          <h1>Editor de mapa</h1>
        </div>
        <div className="actions">
          {message && <span className={message.startsWith('Erro') ? 'error' : 'muted'}>{message}</span>}
          {dirty && !message && <span className="muted">Alterações não salvas</span>}
          <button className="ghost" onClick={undo} disabled={!undoStack.current.length} title="Ctrl+Z">
            ↶ Desfazer
          </button>
          <button onClick={handleSave} disabled={save.isPending}>
            {save.isPending ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>

      <div className="map-toolbar">
        {TOOLS.map((t) => (
          <button
            key={t.value}
            className={`ghost ${tool === t.value ? 'active' : ''}`}
            onClick={() => setTool(t.value)}
            title={t.hint}
          >
            {t.label}
          </button>
        ))}
        <span className="toolbar-spacer" />
        <ZoomSelect value={zoomPref} onChange={setZoomPref} />
      </div>
      <p className="muted tool-hint">
        {TOOLS.find((t) => t.value === tool)!.hint}
        <span className="nav-hint"> · Roda do mouse: zoom · Espaço + arrastar ou botão do meio: mover</span>
      </p>

      <div className="map-editor">
        <div className="map-scroll" ref={scrollRef} {...containerProps}>
          <MapView
            map={doc}
            gridVersion={gridVersion}
            zoom={zoom}
            regionColorMode={colorMode}
            ethnicities={ethnicities}
            selected={selected}
            onElementPointerDown={tool === 'select' ? onElementPointerDown : undefined}
            svgRef={svgRef}
            cursor={cursor}
            svgHandlers={{
              onPointerDown,
              onPointerMove,
              onPointerUp,
              onPointerLeave: () => setHover(null),
              onDoubleClick: finishDraft,
            }}
          >
            {/* pré-visualizações do editor */}
            {brushTool && hover && !spaceDown && <circle className="brush-preview" cx={hover[0]} cy={hover[1]} r={Math.max(0.5, brush / 2)} />}
            {draft.length > 0 && (
              <polyline
                className={`draft ${tool}`}
                points={[...draft, ...(hover ? [hover] : [])].map((p) => p.join(',')).join(' ')}
              />
            )}
            {circle && <circle className="draft circle" cx={circle.cx} cy={circle.cy} r={circle.r} />}
            {selFeature && <ResizeHandles feature={selFeature} zoom={zoom} onStart={startResize} />}
          </MapView>
        </div>

        <aside className="map-sidebar">
          {/* opções da ferramenta */}
          {brushTool && (
            <section className="card">
              <label>
                Tamanho do pincel: {brush}
                <input type="range" min={1} max={40} value={brush} onChange={(e) => setBrush(Number(e.target.value))} />
              </label>
              {tool === 'terrain' && (
                <div className="chips">
                  {TERRAIN_TYPES.map((t) => (
                    <button
                      key={t.code}
                      className={`chip ${terrainCode === t.code ? 'on' : ''}`}
                      onClick={() => setTerrainCode(t.code)}
                    >
                      <span className="swatch" style={{ background: t.color }} /> {t.label}
                    </button>
                  ))}
                </div>
              )}
              {tool === 'region' && (
                <>
                  <p className="muted">
                    Pintando: <strong>{doc.regions.find((r) => r.code === regionCode)?.name ?? 'borracha (sem região)'}</strong>
                  </p>
                  <label className="inline check">
                    <input
                      type="checkbox"
                      checked={protectRegions}
                      onChange={(e) => setProtectRegions(e.target.checked)}
                    />
                    Não pintar por cima de outras regiões
                  </label>
                  <p className="muted small">
                    {protectRegions
                      ? 'Só preenche terra sem região: a fronteira se forma onde as regiões se encontram.'
                      : 'Pinta por cima: use para mover a fronteira entre duas regiões.'}
                  </p>
                </>
              )}
            </section>
          )}

          {tool === 'feature' && (
            <section className="card">
              <h3>Tipo de marcador</h3>
              <div className="chips">
                {FEATURE_TYPES.map((f) => (
                  <button
                    key={f.value}
                    className={`chip ${featureType === f.value ? 'on' : ''}`}
                    onClick={() => setFeatureType(f.value)}
                  >
                    {f.icon} {f.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          {tool === 'path' && (
            <section className="card">
              <h3>Tipo de linha</h3>
              <div className="chips">
                {PATH_TYPES.map((p) => (
                  <button
                    key={p.value}
                    className={`chip ${pathType === p.value ? 'on' : ''}`}
                    onClick={() => setPathType(p.value)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {draft.length > 0 && (
                <div className="actions">
                  <button onClick={finishDraft}>Concluir ({draft.length} pontos)</button>
                  <button className="ghost" onClick={() => setDraft([])}>Cancelar</button>
                </div>
              )}
            </section>
          )}

          {tool === 'polygon' && draft.length > 0 && (
            <section className="card actions">
              <button onClick={finishDraft}>Concluir ({draft.length} vértices)</button>
              <button className="ghost" onClick={() => setDraft([])}>Cancelar</button>
            </section>
          )}

          {/* elemento selecionado */}
          {selFeature && (
            <section className="card form">
              <h3>Marcador</h3>
              <label>
                Nome
                <input autoFocus value={selFeature.name} onFocus={pushUndo} onChange={(e) => patchFeature({ name: e.target.value })} />
              </label>
              <label>
                Tipo
                <select value={selFeature.type} onFocus={pushUndo} onChange={(e) => patchFeature({ type: e.target.value as FeatureType })}>
                  {FEATURE_TYPES.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.icon} {f.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tamanho: {Math.round((selFeature.size ?? 1) * 100)}%
                <input
                  type="range"
                  min={MIN_SIZE}
                  max={MAX_SIZE}
                  step={0.05}
                  value={selFeature.size ?? 1}
                  onPointerDown={pushUndo}
                  onChange={(e) => patchFeature({ size: Number(e.target.value) })}
                />
              </label>
              <button className="danger" onClick={deleteSelected}>Excluir marcador</button>
            </section>
          )}

          {selPath && (
            <section className="card form">
              <h3>{PATH_TYPES.find((p) => p.value === selPath.type)?.label}</h3>
              <label>
                Nome
                <input autoFocus value={selPath.name} onFocus={pushUndo} onChange={(e) => patchPath({ name: e.target.value })} />
              </label>
              <label>
                Tipo
                <select value={selPath.type} onFocus={pushUndo} onChange={(e) => patchPath({ type: e.target.value as PathType })}>
                  {PATH_TYPES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {selPath.type === 'mountains' ? 'Tamanho das montanhas' : 'Espessura'}:{' '}
                {Math.round((selPath.size ?? 1) * 100)}%
                <input
                  type="range"
                  min={MIN_SIZE}
                  max={MAX_SIZE}
                  step={0.05}
                  value={selPath.size ?? 1}
                  onPointerDown={pushUndo}
                  onChange={(e) => patchPath({ size: Number(e.target.value) })}
                />
              </label>
              <button className="danger" onClick={deleteSelected}>Excluir linha</button>
            </section>
          )}

          {selTerritory && (
            <section className="card form">
              <h3>Território</h3>
              <label>
                Nome
                <input autoFocus value={selTerritory.name} onFocus={pushUndo} onChange={(e) => patchTerritory({ name: e.target.value })} />
              </label>
              <label>
                Etnia (nação/reino/povo)
                <EthnicitySelect
                  value={selTerritory.ethnicityId}
                  ethnicities={ethnicities}
                  onFocus={pushUndo}
                  onChange={(ethnicityId) => patchTerritory({ ethnicityId })}
                />
              </label>
              {selTerritory.shape.kind === 'circle' && (
                <label>
                  Raio: {selTerritory.shape.r.toFixed(1)} células
                  <input
                    type="range"
                    min={1}
                    max={Math.max(doc.width, doc.height)}
                    step={0.5}
                    value={selTerritory.shape.r}
                    onPointerDown={pushUndo}
                    onChange={(e) => {
                      const shape = selTerritory.shape;
                      if (shape.kind === 'circle') patchTerritory({ shape: { ...shape, r: Number(e.target.value) } });
                    }}
                  />
                </label>
              )}
              <button className="danger" onClick={deleteSelected}>Excluir território</button>
            </section>
          )}

          {/* regiões */}
          <section className="card">
            <div className="page-header compact">
              <h3>Regiões</h3>
              <button className="ghost" onClick={addRegion}>+ Nova</button>
            </div>
            <label className="inline">
              Colorir por
              <select value={colorMode} onChange={(e) => setColorMode(e.target.value as RegionColorMode)}>
                <option value="region">cor da região</option>
                <option value="ethnicity">etnia</option>
              </select>
            </label>
            {doc.regions.length === 0 && <p className="muted">Nenhuma região. Crie uma e pinte sobre a terra.</p>}
            <ul className="region-list">
              <li className={tool === 'region' && regionCode === 0 ? 'active' : ''}>
                <button className="link" onClick={() => { setRegionCode(0); setTool('region'); }}>
                  🧽 Borracha de região
                </button>
              </li>
              {doc.regions.map((r) => (
                <li key={r.id} className={tool === 'region' && regionCode === r.code ? 'active' : ''}>
                  <div className="row">
                    <input
                      type="color"
                      value={r.color}
                      onFocus={pushUndo}
                      onChange={(e) => updateRegion(r.id, { color: e.target.value })}
                    />
                    <input
                      className="grow"
                      value={r.name}
                      onFocus={pushUndo}
                      onChange={(e) => updateRegion(r.id, { name: e.target.value })}
                    />
                  </div>
                  <EthnicitySelect
                    value={r.ethnicityId}
                    ethnicities={ethnicities}
                    onFocus={pushUndo}
                    onChange={(ethnicityId) => updateRegion(r.id, { ethnicityId })}
                  />
                  <div className="actions">
                    <button className="ghost" onClick={() => { setRegionCode(r.code); setTool('region'); }}>
                      🖌️ Pintar
                    </button>
                    <button className="danger" onClick={() => deleteRegion(r.id)}>Excluir</button>
                  </div>
                </li>
              ))}
            </ul>
            {ethnicities.length === 0 && (
              <p className="muted">
                Para atribuir regiões e territórios a nações, cadastre-as em{' '}
                <Link to={`/stories/${storyId}/ethnicities`}>Etnias</Link>.
              </p>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}

/** Caixa tracejada + quatro alças nos cantos do marcador selecionado. */
function ResizeHandles({
  feature,
  zoom,
  onStart,
}: {
  feature: EditableMap['features'][number];
  zoom: number;
  onStart: (e: PointerEvent, featureId: string) => void;
}) {
  const { ex, ey } = featureExtent(feature);
  // alças com tamanho fixo na tela (~10px), independente do zoom
  const h = 10 / (CELL_PX * zoom);
  const corners = [
    { x: feature.x - ex, y: feature.y - ey, cursor: 'nwse-resize' },
    { x: feature.x + ex, y: feature.y - ey, cursor: 'nesw-resize' },
    { x: feature.x - ex, y: feature.y + ey, cursor: 'nesw-resize' },
    { x: feature.x + ex, y: feature.y + ey, cursor: 'nwse-resize' },
  ];
  return (
    <g>
      <rect
        className="resize-box"
        x={feature.x - ex}
        y={feature.y - ey}
        width={ex * 2}
        height={ey * 2}
        strokeWidth={1.5 / (CELL_PX * zoom)}
      />
      {corners.map((c, i) => (
        <rect
          key={i}
          className="resize-handle"
          x={c.x - h / 2}
          y={c.y - h / 2}
          width={h}
          height={h}
          strokeWidth={1.5 / (CELL_PX * zoom)}
          style={{ cursor: c.cursor }}
          onPointerDown={(e) => onStart(e, feature.id)}
        />
      ))}
    </g>
  );
}
