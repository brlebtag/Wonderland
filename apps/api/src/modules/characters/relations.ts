import { z } from 'zod';
import { FAMILY_ROLE_VALUES, inverseRole } from '@wonderland/shared';
import { prisma } from '../../db';
import { BadRequestError } from '../../errors';
import { characterRepository } from './repository';

// Parentescos do ponto de vista de um personagem: "outro é <role> de mim".
// No banco cada par é um registro só (CharacterRelation: related é role de character);
// visto do outro lado, o papel é invertido (pai ↔ filho).

export const relationsUpdate = z.object({
  relations: z
    .array(z.object({ otherId: z.string().min(1), role: z.enum(FAMILY_ROLE_VALUES) }))
    .max(500),
});
export type RelationInput = z.infer<typeof relationsUpdate>['relations'][number];

const otherSelect = { id: true, name: true, attributes: true, deletedAt: true } as const;

/** Parentescos de um personagem, só com parentes vivos (os da lixeira ficam guardados). */
export async function listRelations(characterId: string) {
  const rows = await prisma.characterRelation.findMany({
    where: { OR: [{ characterId }, { relatedId: characterId }] },
    include: { character: { select: otherSelect }, related: { select: otherSelect } },
    orderBy: { createdAt: 'asc' },
  });
  return rows.flatMap((row) => {
    const mine = row.characterId === characterId;
    const other = mine ? row.related : row.character;
    if (other.deletedAt) return [];
    const sex = (other.attributes as Record<string, unknown>)?.sex;
    return [
      {
        role: mine ? row.role : inverseRole(row.role),
        other: { id: other.id, name: other.name, sex: typeof sex === 'string' ? sex : null },
      },
    ];
  });
}

/**
 * Substitui os parentescos do personagem. Vínculos com parentes na lixeira são mantidos
 * (o formulário não os vê), para voltarem junto se o parente for restaurado.
 */
export async function replaceRelations(character: { id: string; storyId: string }, relations: RelationInput[]) {
  const ids = relations.map((r) => r.otherId);
  if (ids.includes(character.id)) throw new BadRequestError('Um personagem não pode ser parente de si mesmo');
  if (new Set(ids).size !== ids.length) throw new BadRequestError('Parente repetido');
  if ((await characterRepository.countInStory(character.storyId, ids)) !== ids.length) {
    throw new BadRequestError('Parente inválido para esta história');
  }

  await prisma.$transaction([
    prisma.characterRelation.deleteMany({
      where: {
        OR: [
          { characterId: character.id, related: { deletedAt: null } },
          { relatedId: character.id, character: { deletedAt: null } },
        ],
      },
    }),
    prisma.characterRelation.createMany({
      data: relations.map((r) => ({ characterId: character.id, relatedId: r.otherId, role: r.role })),
    }),
  ]);
  return listRelations(character.id);
}
