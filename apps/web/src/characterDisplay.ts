import type { AttributeValue, CharacterAttributes, CharacterField } from '@wonderland/shared';
import { characterFieldGroups } from '@wonderland/shared';
import { formatDate } from './api';

const optionLabel = (field: CharacterField, value: string) =>
  field.options?.find((o) => o.value === value)?.label ?? value;

/** Valor da ficha formatado para leitura. */
export function formatAttribute(field: CharacterField, value: AttributeValue): string {
  switch (field.type) {
    case 'boolean':
      return value ? 'Sim' : 'Não';
    case 'date':
      return formatDate(`${value}T00:00:00.000Z`);
    case 'number':
      return field.unit ? `${value} ${field.unit}` : String(value);
    case 'select':
      return optionLabel(field, String(value));
    case 'multiselect':
      return (value as string[]).map((v) => optionLabel(field, v)).join(', ');
    default:
      return String(value);
  }
}

/** Grupos da ficha só com os campos preenchidos. */
export function filledGroups(attributes: CharacterAttributes) {
  return characterFieldGroups
    .map((group) => ({
      ...group,
      fields: group.fields.filter((f) => attributes[f.key] !== undefined),
    }))
    .filter((group) => group.fields.length > 0);
}
