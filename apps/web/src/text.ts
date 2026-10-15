/** Sem acentos e em minúsculas, para buscas não dependerem de como o texto foi digitado. */
export const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
