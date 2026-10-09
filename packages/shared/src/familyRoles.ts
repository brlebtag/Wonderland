// Parentescos entre personagens. Cada vínculo é guardado uma vez, como
// "relacionado é <papel> de personagem"; o outro lado é mostrado com o papel inverso
// (pai ↔ filho, avô ↔ neto...). O rótulo segue o sexo de quem exerce o papel.

export type FamilyRole = {
  value: string;
  male: string;
  female: string;
  /** Rótulo quando o sexo não é masculino nem feminino (ou não foi informado). */
  neutral: string;
  inverse: string;
};

const r = (value: string, male: string, female: string, inverse: string): FamilyRole => ({
  value,
  male,
  female,
  neutral: `${male}/${female}`,
  inverse,
});

export const FAMILY_ROLES: FamilyRole[] = [
  r('parent', 'Pai', 'Mãe', 'child'),
  r('child', 'Filho', 'Filha', 'parent'),
  r('grandparent', 'Avô', 'Avó', 'grandchild'),
  r('grandchild', 'Neto', 'Neta', 'grandparent'),
  r('great-grandparent', 'Bisavô', 'Bisavó', 'great-grandchild'),
  r('great-grandchild', 'Bisneto', 'Bisneta', 'great-grandparent'),
  r('sibling', 'Irmão', 'Irmã', 'sibling'),
  r('half-sibling', 'Meio-irmão', 'Meia-irmã', 'half-sibling'),
  r('uncle', 'Tio', 'Tia', 'nephew'),
  r('nephew', 'Sobrinho', 'Sobrinha', 'uncle'),
  r('cousin', 'Primo', 'Prima', 'cousin'),
  r('spouse', 'Marido', 'Esposa', 'spouse'),
  r('stepparent', 'Padrasto', 'Madrasta', 'stepchild'),
  r('stepchild', 'Enteado', 'Enteada', 'stepparent'),
  r('parent-in-law', 'Sogro', 'Sogra', 'child-in-law'),
  r('child-in-law', 'Genro', 'Nora', 'parent-in-law'),
  r('sibling-in-law', 'Cunhado', 'Cunhada', 'sibling-in-law'),
  r('godparent', 'Padrinho', 'Madrinha', 'godchild'),
  r('godchild', 'Afilhado', 'Afilhada', 'godparent'),
  r('adoptive-parent', 'Pai adotivo', 'Mãe adotiva', 'adopted-child'),
  r('adopted-child', 'Filho adotivo', 'Filha adotiva', 'adoptive-parent'),
];

export const FAMILY_ROLE_VALUES = FAMILY_ROLES.map((f) => f.value);

const byValue = new Map(FAMILY_ROLES.map((f) => [f.value, f]));

export const inverseRole = (role: string) => byValue.get(role)?.inverse ?? role;

/** Rótulo do papel conforme o sexo (valor do campo "sex" da ficha) de quem o exerce. */
export function familyRoleLabel(role: string, sex?: unknown) {
  const f = byValue.get(role);
  if (!f) return role;
  return sex === 'male' ? f.male : sex === 'female' ? f.female : f.neutral;
}
