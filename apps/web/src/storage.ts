import { useState } from 'react';

/**
 * useState que lembra o último valor no localStorage (preferências do navegador).
 * `parse` valida o que foi salvo; se não houver valor válido (ou não houver localStorage), usa `initial`.
 */
export function useStoredState<T>(
  key: string,
  initial: T,
  parse: (raw: string) => T | undefined,
) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return (raw === null ? undefined : parse(raw)) ?? initial;
    } catch {
      return initial;
    }
  });

  function update(next: T) {
    setValue(next);
    try {
      localStorage.setItem(key, String(next));
    } catch {
      // sem localStorage: o valor só vale para esta visita
    }
  }

  return [value, update] as const;
}
