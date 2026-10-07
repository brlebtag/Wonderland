import { prisma } from '../../db';
import type { StoryCreate, StoryUpdate } from './schemas';

// Toda consulta de "histórias vivas" passa por aqui: o soft delete fica centralizado.
const alive = { deletedAt: null };

export const storyRepository = {
  list: () => prisma.story.findMany({ where: alive, orderBy: { updatedAt: 'desc' } }),
  findById: (id: string) => prisma.story.findFirst({ where: { id, ...alive } }),
  findDeletedById: (id: string) =>
    prisma.story.findFirst({ where: { id, deletedAt: { not: null } } }),
  create: (data: StoryCreate) => prisma.story.create({ data }),
  update: (id: string, data: StoryUpdate) => prisma.story.update({ where: { id }, data }),
  softDelete: (id: string) =>
    prisma.story.update({ where: { id }, data: { deletedAt: new Date() } }),
  restore: (id: string) => prisma.story.update({ where: { id }, data: { deletedAt: null } }),
};
