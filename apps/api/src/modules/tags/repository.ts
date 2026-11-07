import { prisma } from '../../db';

// Uma tag só é visível se a sua história não estiver apagada.
const alive = { story: { deletedAt: null } };
// Só contam personagens fora da lixeira.
const characterCount = { _count: { select: { characters: { where: { character: { deletedAt: null } } } } } };

const withCount = <T extends { _count: { characters: number } }>({ _count, ...tag }: T) => ({
  ...tag,
  characterCount: _count.characters,
});

export const tagRepository = {
  // ordem alfabética em pt-BR (o banco diferenciaria maiúsculas)
  listByStory: async (storyId: string) =>
    (await prisma.tag.findMany({ where: { storyId, ...alive }, include: characterCount }))
      .map(withCount)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
  findById: (id: string) => prisma.tag.findFirst({ where: { id, ...alive } }),
  /** Todas as tags da história (para comparar nomes sem diferenciar maiúsculas/acentos). */
  allInStory: (storyId: string) => prisma.tag.findMany({ where: { storyId } }),
  create: (storyId: string, name: string) => prisma.tag.create({ data: { storyId, name } }),
  createMany: (storyId: string, names: string[]) =>
    prisma.$transaction(names.map((name) => prisma.tag.create({ data: { storyId, name } }))),
  update: (id: string, name: string) => prisma.tag.update({ where: { id }, data: { name } }),
  /** Apaga de vez; os vínculos com personagens caem em cascata (os personagens ficam). */
  delete: (id: string) => prisma.tag.delete({ where: { id } }),
};
