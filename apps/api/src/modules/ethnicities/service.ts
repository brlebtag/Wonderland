import { BadRequestError, NotFoundError } from '../../errors';
import { storyService } from '../stories/service';
import { ethnicityRepository as repo } from './repository';
import type { EthnicityCreate, EthnicityUpdate } from './schemas';

async function get(id: string) {
  const ethnicity = await repo.findById(id);
  if (!ethnicity) throw new NotFoundError('Ethnicity not found');
  return ethnicity;
}

async function getDeleted(id: string) {
  const ethnicity = await repo.findDeletedById(id);
  if (!ethnicity) throw new NotFoundError('Ethnicity not in trash');
  return ethnicity;
}

export const ethnicityService = {
  async listByStory(storyId: string) {
    await storyService.get(storyId);
    return repo.listByStory(storyId);
  },
  get,
  async create(storyId: string, input: EthnicityCreate) {
    await storyService.get(storyId);
    return repo.create(storyId, input);
  },
  async update(id: string, input: EthnicityUpdate) {
    await get(id);
    return repo.update(id, input);
  },
  // Personagens, regiões e territórios mantêm o vínculo enquanto a etnia está na lixeira.
  async remove(id: string) {
    await get(id);
    await repo.softDelete(id);
  },
  async restore(id: string) {
    await getDeleted(id);
    return repo.restore(id);
  },
  async purge(id: string) {
    await getDeleted(id);
    await repo.purge(id);
  },

  /** Garante que a etnia pertence à história (viva ou na lixeira). */
  async assertInStory(storyId: string, id: string | null | undefined) {
    if (!id) return;
    if (!(await repo.findInStory(storyId, id))) {
      throw new BadRequestError('Etnia inválida para esta história');
    }
  },
};
