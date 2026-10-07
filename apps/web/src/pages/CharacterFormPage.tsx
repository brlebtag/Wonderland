import { useNavigate, useParams } from 'react-router';
import { useCharacter, useCreateCharacter, useEthnicities, useUpdateCharacter } from '../api';
import { CharacterForm } from '../components/CharacterForm';
import { useGoBack } from '../navigation';

/** Cria (/stories/:id/characters/new) ou edita (/stories/:id/characters/:characterId/edit). */
export function CharacterFormPage() {
  const { id: storyId = '', characterId } = useParams();
  const isNew = !characterId;
  const character = useCharacter(characterId);
  const ethnicities = useEthnicities(storyId);
  const createCharacter = useCreateCharacter(storyId);
  const updateCharacter = useUpdateCharacter(storyId, characterId ?? '');
  const navigate = useNavigate();
  const goBack = useGoBack(
    characterId ? `/stories/${storyId}/characters/${characterId}` : `/stories/${storyId}/characters`,
  );

  if (!isNew && character.isLoading) return <main className="container muted">Carregando…</main>;
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
          submitLabel={isNew ? 'Criar' : 'Salvar'}
          onSubmit={async (input) => {
            if (isNew) {
              const created = await createCharacter.mutateAsync(input);
              navigate(`/stories/${storyId}/characters/${created.id}`, { replace: true });
            } else {
              await updateCharacter.mutateAsync(input);
              goBack();
            }
          }}
          onCancel={goBack}
        />
      </section>
    </main>
  );
}
