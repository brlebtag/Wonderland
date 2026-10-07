import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CharacterAttributes } from '@wonderland/shared';

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
  createdAt: string;
  updatedAt: string;
};

export type Character = {
  id: string;
  storyId: string;
  name: string;
  nickname: string;
  attributes: CharacterAttributes;
  createdAt: string;
  updatedAt: string;
};

export type StoryInput = { title: string; description: string };
export type EventInput = {
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  characterIds: string[];
};
export type CharacterInput = { name: string; nickname: string; attributes: CharacterAttributes };

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
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.stories }),
  });
}

// ---------- eventos ----------

export const useEvents = (storyId: string) =>
  useQuery({
    queryKey: keys.events(storyId),
    queryFn: () => request<StoryEvent[]>(`/stories/${storyId}/events`),
  });

/** Eventos mudam também as listas de eventos por personagem. */
function useInvalidateEvents(storyId: string) {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: keys.events(storyId) }),
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

// ---------- datas ----------

export const toInputDate = (iso: string) => iso.slice(0, 10);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
