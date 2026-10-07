import { useNavigate, useParams } from 'react-router';
import { useCreateStory, useStory, useUpdateStory } from '../api';
import { StoryForm } from '../components/StoryForm';
import { useGoBack } from '../navigation';

/** Cria (/stories/new) ou edita (/stories/:id/edit) uma história. */
export function StoryFormPage() {
  const { id } = useParams();
  const isNew = !id;
  const story = useStory(id);
  const createStory = useCreateStory();
  const updateStory = useUpdateStory(id ?? '');
  const navigate = useNavigate();
  const goBack = useGoBack(id ? `/stories/${id}` : '/');

  if (!isNew && story.isLoading) return <main className="container muted">Carregando…</main>;
  if (!isNew && !story.data) {
    return (
      <main className="container">
        <p className="error">História não encontrada.</p>
        <button className="ghost" onClick={goBack}>← Voltar</button>
      </main>
    );
  }

  return (
    <main className="container">
      <button className="link" onClick={goBack}>← Voltar</button>
      <h1>{isNew ? 'Nova história' : 'Editar história'}</h1>
      <section className="card">
        <StoryForm
          initial={story.data && { title: story.data.title, description: story.data.description }}
          submitLabel={isNew ? 'Criar' : 'Salvar'}
          onSubmit={async (input) => {
            if (isNew) {
              const created = await createStory.mutateAsync(input);
              navigate(`/stories/${created.id}`, { replace: true });
            } else {
              await updateStory.mutateAsync(input);
              goBack();
            }
          }}
          onCancel={goBack}
        />
      </section>
    </main>
  );
}
