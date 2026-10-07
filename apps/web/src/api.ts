import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CharacterAttributes, EventLocation, LocationKind, MapData } from '@wonderland/shared';

export type Story = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type CharacterRef = { id: string; name: string };

export type StoryEvent = {
  id: string;
  storyId: string;
  title: string;
  description: string;
  date: string; // ISO, meia-noite UTC
  characters: CharacterRef[];
  locationKind: LocationKind | null;
  locationId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Character = {
  id: string;
  storyId: string;
  name: string;
  nickname: string;
  attributes: CharacterAttributes;
  ethnicityId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Ethnicity = {
  id: string;
  storyId: string;
  name: string;
  kind: string;
  color: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type StoryInput = { title: string; description: string };
export type EventInput = {
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  characterIds: string[];
  location: EventLocation | null;
};
export type CharacterInput = {
  name: string;
  nickname: string;
  attributes: CharacterAttributes;
  ethnicityId: string | null;
};
export type EthnicityInput = { name: string; kind: string; color: string; description: string };
export type StoryMapResponse = { data: MapData | null; updatedAt: string | null };

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

// Tudo de uma história fica sob ['stories', id] e tudo de um personagem sob ['characters', id],
// então invalidar o prefixo recarrega o que depende dele.
const keys = {
  stories: ['stories'] as const,
  story: (id: string) => ['stories', id] as const,
  events: (storyId: string) => ['stories', storyId, 'events'] as const,
  characters: (storyId: string) => ['stories', storyId, 'characters'] as const,
  allCharacters: ['characters'] as const,
  character: (id: string) => ['characters', id] as const,
  characterEvents: (id: string) => ['characters', id, 'events'] as const,
  storyTrash: (storyId: string) => ['stories', storyId, 'trash'] as const,
  ethnicities: (storyId: string) => ['stories', storyId, 'ethnicities'] as const,
  ethnicity: (id: string) => ['ethnicities', id] as const,
  map: (storyId: string) => ['stories', storyId, 'map'] as const,
  trash: ['trash'] as const,
};

// ---------- histórias ----------

export const useStories = () =>
  useQuery({ queryKey: keys.stories, queryFn: () => request<Story[]>('/stories') });

export const useStory = (id: string | undefined) =>
  useQuery({
    queryKey: keys.story(id ?? ''),
    queryFn: () => request<Story>(`/stories/${id}`),
    enabled: !!id,
    retry: false,
  });

export function useCreateStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: StoryInput) => request<Story>('/stories', 'POST', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.stories }),
  });
}

export function useUpdateStory(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: StoryInput) => request<Story>(`/stories/${id}`, 'PATCH', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.stories }),
  });
}

export function useDeleteStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request<void>(`/stories/${id}`, 'DELETE'),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: keys.stories }),
        qc.invalidateQueries({ queryKey: keys.trash }),
      ]),
  });
}

// ---------- eventos ----------

export const useEvents = (storyId: string) =>
  useQuery({
    queryKey: keys.events(storyId),
    queryFn: () => request<StoryEvent[]>(`/stories/${storyId}/events`),
  });

/** Eventos mudam também a lixeira da história e as listas de eventos por personagem. */
function useInvalidateEvents(storyId: string) {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: keys.story(storyId) }),
      qc.invalidateQueries({ queryKey: keys.allCharacters }),
    ]);
}

export function useCreateEvent(storyId: string) {
  const invalidate = useInvalidateEvents(storyId);
  return useMutation({
    mutationFn: (input: EventInput) =>
      request<StoryEvent>(`/stories/${storyId}/events`, 'POST', input),
    onSuccess: invalidate,
  });
}

export function useUpdateEvent(storyId: string) {
  const invalidate = useInvalidateEvents(storyId);
  return useMutation({
    mutationFn: ({ id, ...input }: EventInput & { id: string }) =>
      request<StoryEvent>(`/events/${id}`, 'PATCH', input),
    onSuccess: invalidate,
  });
}

export function useDeleteEvent(storyId: string) {
  const invalidate = useInvalidateEvents(storyId);
  return useMutation({
    mutationFn: (id: string) => request<void>(`/events/${id}`, 'DELETE'),
    onSuccess: invalidate,
  });
}

// ---------- personagens ----------

export const useCharacters = (storyId: string) =>
  useQuery({
    queryKey: keys.characters(storyId),
    queryFn: () => request<Character[]>(`/stories/${storyId}/characters`),
  });

export const useCharacter = (id: string | undefined) =>
  useQuery({
    queryKey: keys.character(id ?? ''),
    queryFn: () => request<Character>(`/characters/${id}`),
    enabled: !!id,
    retry: false,
  });

export const useCharacterEvents = (id: string) =>
  useQuery({
    queryKey: keys.characterEvents(id),
    queryFn: () => request<StoryEvent[]>(`/characters/${id}/events`),
  });

/** Personagens aparecem nos eventos (nome), então recarrega a história e os personagens. */
function useInvalidateCharacters(storyId: string) {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: keys.story(storyId) }),
      qc.invalidateQueries({ queryKey: keys.allCharacters }),
    ]);
}

export function useCreateCharacter(storyId: string) {
  const invalidate = useInvalidateCharacters(storyId);
  return useMutation({
    mutationFn: (input: CharacterInput) =>
      request<Character>(`/stories/${storyId}/characters`, 'POST', input),
    onSuccess: invalidate,
  });
}

export function useUpdateCharacter(storyId: string, id: string) {
  const invalidate = useInvalidateCharacters(storyId);
  return useMutation({
    mutationFn: (input: CharacterInput) => request<Character>(`/characters/${id}`, 'PATCH', input),
    onSuccess: invalidate,
  });
}

export function useDeleteCharacter(storyId: string) {
  const invalidate = useInvalidateCharacters(storyId);
  return useMutation({
    mutationFn: (id: string) => request<void>(`/characters/${id}`, 'DELETE'),
    onSuccess: invalidate,
  });
}

// ---------- lixeira ----------

type Trashed = { deletedAt: string };
export type TrashedStory = Story &
  Trashed & { _count: { events: number; characters: number; ethnicities: number } };
export type StoryTrash = {
  events: (StoryEvent & Trashed)[];
  characters: (Character & Trashed)[];
  ethnicities: (Ethnicity & Trashed)[];
};

export const useTrashedStories = () =>
  useQuery({ queryKey: keys.trash, queryFn: () => request<TrashedStory[]>('/trash/stories') });

export const useStoryTrash = (storyId: string) =>
  useQuery({
    queryKey: keys.storyTrash(storyId),
    queryFn: () => request<StoryTrash>(`/stories/${storyId}/trash`),
  });

/** Restaurar/remover histórias mexe na lista de histórias e na lixeira geral. */
function useStoryTrashMutation(action: (id: string) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: keys.stories }),
        qc.invalidateQueries({ queryKey: keys.trash }),
        qc.invalidateQueries({ queryKey: keys.allCharacters }),
      ]),
  });
}

export const useRestoreStory = () =>
  useStoryTrashMutation((id) => request(`/stories/${id}/restore`, 'POST'));
export const usePurgeStory = () =>
  useStoryTrashMutation((id) => request(`/stories/${id}/permanent`, 'DELETE'));

/** Restaurar/remover eventos e personagens recarrega tudo da história e dos personagens. */
function useItemTrashMutation(storyId: string, action: (id: string) => Promise<unknown>) {
  const invalidate = useInvalidateCharacters(storyId);
  return useMutation({ mutationFn: action, onSuccess: invalidate });
}

export const useRestoreEvent = (storyId: string) =>
  useItemTrashMutation(storyId, (id) => request(`/events/${id}/restore`, 'POST'));
export const usePurgeEvent = (storyId: string) =>
  useItemTrashMutation(storyId, (id) => request(`/events/${id}/permanent`, 'DELETE'));
export const useRestoreCharacter = (storyId: string) =>
  useItemTrashMutation(storyId, (id) => request(`/characters/${id}/restore`, 'POST'));
export const usePurgeCharacter = (storyId: string) =>
  useItemTrashMutation(storyId, (id) => request(`/characters/${id}/permanent`, 'DELETE'));
export const useRestoreEthnicity = (storyId: string) =>
  useItemTrashMutation(storyId, (id) => request(`/ethnicities/${id}/restore`, 'POST'));
export const usePurgeEthnicity = (storyId: string) =>
  useItemTrashMutation(storyId, (id) => request(`/ethnicities/${id}/permanent`, 'DELETE'));

// ---------- etnias ----------

export const useEthnicities = (storyId: string) =>
  useQuery({
    queryKey: keys.ethnicities(storyId),
    queryFn: () => request<Ethnicity[]>(`/stories/${storyId}/ethnicities`),
  });

export const useEthnicity = (id: string | undefined) =>
  useQuery({
    queryKey: keys.ethnicity(id ?? ''),
    queryFn: () => request<Ethnicity>(`/ethnicities/${id}`),
    enabled: !!id,
    retry: false,
  });

/** Etnias aparecem em personagens e no mapa: recarrega tudo da história. */
function useEthnicityMutation<T>(storyId: string, action: (input: T) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: keys.story(storyId) }),
        qc.invalidateQueries({ queryKey: ['ethnicities'] }),
        qc.invalidateQueries({ queryKey: keys.allCharacters }),
      ]),
  });
}

export const useCreateEthnicity = (storyId: string) =>
  useEthnicityMutation(storyId, (input: EthnicityInput) =>
    request<Ethnicity>(`/stories/${storyId}/ethnicities`, 'POST', input),
  );
export const useUpdateEthnicity = (storyId: string, id: string) =>
  useEthnicityMutation(storyId, (input: EthnicityInput) =>
    request<Ethnicity>(`/ethnicities/${id}`, 'PATCH', input),
  );
export const useDeleteEthnicity = (storyId: string) =>
  useEthnicityMutation(storyId, (id: string) => request(`/ethnicities/${id}`, 'DELETE'));

// ---------- mapa ----------

export const useMap = (storyId: string) =>
  useQuery({
    queryKey: keys.map(storyId),
    queryFn: () => request<StoryMapResponse>(`/stories/${storyId}/map`),
  });

/** Salvar o mapa pode tirar o local de eventos: recarrega tudo da história. */
export function useSaveMap(storyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: MapData) =>
      request<StoryMapResponse & { clearedEvents: number }>(`/stories/${storyId}/map`, 'PUT', { data }),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: keys.story(storyId) }),
        qc.invalidateQueries({ queryKey: keys.allCharacters }),
      ]),
  });
}

// ---------- datas ----------

export const formatDateTime = (iso: string) => new Date(iso).toLocaleString('pt-BR');

export const toInputDate = (iso: string) => iso.slice(0, 10);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
