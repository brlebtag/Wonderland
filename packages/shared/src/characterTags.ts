// Tags livres dos personagens (ex.: "protagonista", "mentor", "família real").

/** Sugeridas no campo de tags mesmo antes de alguém usá-las. */
export const SUGGESTED_TAGS = ['protagonista', 'antagonista', 'deuteragonista', 'coadjuvante'];

export const MAX_TAGS = 30;
export const MAX_TAG_LENGTH = 40;

/** Chave de comparação: sem acentos, minúsculas e espaços simples ("Protagonista" = "protagonista"). */
export const tagKey = (tag: string) =>
  tag.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Limpa uma tag digitada: espaços simples, sem vírgulas (separam tags ao digitar), tamanho máximo. */
export const cleanTag = (tag: string) =>
  tag.replace(/,/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_TAG_LENGTH).trim();

/** Limpa e remove repetidas (pela chave), mantendo a primeira grafia e a ordem. */
export function cleanTags(tags: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = cleanTag(raw);
    const key = tagKey(tag);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}
