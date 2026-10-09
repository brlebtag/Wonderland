import { useNavigate, useParams } from 'react-router';
import {
  useCharacter,
  useCharacterRelations,
  useCharacters,
  useCreateCharacter,
  useEthnicities,
  useSaveRelations,
  useUpdateCharacter,
} from '../api';
import { CharacterForm } from '../components/CharacterForm';
import { useGoBack } from '../navigation';

/** Cria (/stories/:id/characters/new) ou edita (/stories/:id/characters/:characterId/edit). */
export function CharacterFormPage() {
  const { id: storyId = '', characterId } = useParams();
  const isNew = !characterId;
  const character = useCharacter(characterId);
  const ethnicities = useEthnicities(storyId);
  const characters = useCharacters(storyId);
  const relations = useCharacterRelations(characterId);
  const saveRelations = useSaveRelations();
  const createCharacter = useCreateCharacter(storyId);
  const updateCharacter = useUpdateCharacter(storyId, characterId ?? '');
  const navigate = useNavigate();
  const goBack = useGoBack(
    characterId ? `/stories/${storyId}/characters/${characterId}` : `/stories/${storyId}/characters`,
  );

  if ((!isNew && (character.isLoading || relations.isLoading)) || characters.isLoading) return <main className="container muted">Carregando…</main>;
  if (!isNew && !character.data) {
    return (
      <main className="container">
        <p className="error">Personagem não encontrado.</p>
        <button className="ghost" onClick={goBack}>← Voltar</button>
      </main>
    );
  }

  const c = character.data;

  return (
    <main className="container">
      <button className="link" onClick={goBack}>← Voltar</button>
      <h1>{isNew ? 'Novo personagem' : `Editar ${c!.name}`}</h1>
      <section className="card">
        <CharacterForm
          initial={
            c && {
              name: c.name,
              nickname: c.nickname,
              attributes: c.attributes,
              ethnicityId: c.ethnicityId,
            }
          }
          ethnicities={ethnicities.data ?? []}
          relatives={(characters.data ?? []).filter((x) => x.id !== characterId)}
          initialRelations={relations.data?.map((r) => ({ otherId: r.other.id, role: r.role }))}
          submitLabel={isNew ? 'Criar' : 'Salvar'}
          onSubmit={async (input, rels) => {
            if (isNew) {
              const created = await createCharacter.mutateAsync(input);
              if (rels.length) await saveRelations.mutateAsync({ id: created.id, relations: rels });
              navigate(`/stories/${storyId}/characters/${created.id}`, { replace: true });
            } else {
              await updateCharacter.mutateAsync(input);
              await saveRelations.mutateAsync({ id: characterId!, relations: rels });
              goBack();
            }
          }}
          onCancel={goBack}
        />
      </section>
    </main>
  );
}
