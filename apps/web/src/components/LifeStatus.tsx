import { formatDate, type Character } from '../api';
import { formatAge } from '../timelineLayout';

/** Datas de vida do personagem. Está morto quando a data de falecimento está preenchida. */
export function lifeOf(character: Character) {
  const birth = character.attributes.birthDate as string | undefined;
  const death = character.attributes.deathDate as string | undefined;
  return { birth, death, dead: !!death, sex: character.attributes.sex as string | undefined };
}

/** Selo colorido: verde = vivo, vermelho = falecido (no gênero do personagem). */
export function LifeBadge({ character }: { character: Character }) {
  const { dead, sex } = lifeOf(character);
  const ending = sex === 'female' ? 'a' : sex === 'male' ? 'o' : 'o(a)';
  return (
    <span className={`life-badge ${dead ? 'dead' : 'alive'}`}>
      {dead ? `✝ Falecid${ending}` : `● Viv${ending}`}
    </span>
  );
}

/**
 * Idade em texto: calculada pela data de nascimento até os "dias atuais"
 * (o evento mais recente da história) ou, se faleceu, até a data de falecimento.
 */
export function lifeSummary(character: Character, presentDate?: string) {
  const { birth, death } = lifeOf(character);
  if (death) {
    const when = `Faleceu em ${formatDate(`${death}T00:00:00.000Z`)}`;
    return birth && death >= birth ? `${when}, aos ${formatAge(birth, death)}` : when;
  }
  if (!birth || !presentDate) return undefined;
  return presentDate.slice(0, 10) < birth
    ? 'Ainda não nasceu nos dias atuais'
    : `${formatAge(birth, presentDate)} nos dias atuais`;
}
