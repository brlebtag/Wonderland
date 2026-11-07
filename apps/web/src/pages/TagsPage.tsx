import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { SUGGESTED_TAGS, tagKey } from '@wonderland/shared';
import { useCreateTag, useDeleteTag, useRenameTag, useStory, useTags, type Tag } from '../api';
import { StoryHeader } from '../components/StoryHeader';

/** Mensagem da API sem o código de status ("400: {...}"). */
const apiMessage = (err: unknown) => {
  const raw = (err as Error).message;
  try {
    const body = JSON.parse(raw.replace(/^\d+:\s*/, ''));
    return body.message ?? body.issues?.[0]?.message ?? raw;
  } catch {
    return raw;
  }
};

/** Tags dos personagens: criar, renomear e apagar (apagar só tira a tag dos personagens). */
export function TagsPage() {
  const { id = '' } = useParams();
  const story = useStory(id);
  const tags = useTags(id);
  const createTag = useCreateTag(id);
  const [name, setName] = useState('');
  const [error, setError] = useState<string>();

  if (story.isLoading) return <main className="container muted">Carregando…</main>;
  if (!story.data) {
    return (
      <main className="container">
        <p className="error">História não encontrada.</p>
        <Link to="/">← Voltar</Link>
      </main>
    );
  }

  const list = tags.data ?? [];
  const missingSuggestions = SUGGESTED_TAGS.filter((s) => !list.some((t) => tagKey(t.name) === tagKey(s)));

  async function add(tagName: string) {
    setError(undefined);
    try {
      await createTag.mutateAsync(tagName);
      return true;
    } catch (err) {
      setError(apiMessage(err));
      return false;
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (await add(name)) setName('');
  }

  return (
    <main className="container wide">
      <StoryHeader story={story.data} />
      <Link to={`/stories/${id}/characters`}>← Personagens</Link>

      <div className="page-header">
        <h2>Tags</h2>
      </div>
      <p className="muted">
        Marcadores livres dos personagens (protagonista, mentor, família real...). Apagar uma tag só a
        tira dos personagens: eles continuam existindo.
      </p>

      <section className="card">
        <form className="tag-create" onSubmit={handleSubmit}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nova tag…"
            maxLength={40}
            aria-label="Nome da nova tag"
          />
          <button type="submit" disabled={!name.trim() || createTag.isPending}>
            + Criar tag
          </button>
        </form>
        {missingSuggestions.length > 0 && (
          <div className="chips">
            <span className="muted small">Sugestões:</span>
            {missingSuggestions.map((s) => (
              <button key={s} type="button" className="chip" onClick={() => add(s)}>
                + {s}
              </button>
            ))}
          </div>
        )}
        {error && <p className="error">{error}</p>}
      </section>

      {list.length === 0 && !tags.isLoading && <p className="muted">Nenhuma tag criada.</p>}

      <ul className="story-list">
        {list.map((t) => (
          <TagItem key={t.id} storyId={id} tag={t} />
        ))}
      </ul>
    </main>
  );
}

function TagItem({ storyId, tag }: { storyId: string; tag: Tag }) {
  const rename = useRenameTag(storyId);
  const remove = useDeleteTag(storyId);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tag.name);
  const [error, setError] = useState<string>();

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    try {
      await rename.mutateAsync({ id: tag.id, name });
      setEditing(false);
    } catch (err) {
      setError(apiMessage(err));
    }
  }

  const count = tag.characterCount;
  return (
    <li className="card story-item">
      {editing ? (
        <form className="tag-create" onSubmit={save}>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={40} aria-label="Novo nome" />
          <button type="submit" disabled={!name.trim() || rename.isPending}>
            Salvar
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              setEditing(false);
              setName(tag.name);
              setError(undefined);
            }}
          >
            Cancelar
          </button>
          {error && <span className="error">{error}</span>}
        </form>
      ) : (
        <div>
          <span className="tag">{tag.name}</span>{' '}
          {count > 0 ? (
            <Link className="muted" to={`/stories/${storyId}/characters?tag=${encodeURIComponent(tag.name)}`}>
              {count} personagem(ns)
            </Link>
          ) : (
            <span className="muted">nenhum personagem</span>
          )}
        </div>
      )}
      {!editing && (
        <div className="actions">
          <button className="ghost" onClick={() => setEditing(true)}>
            Renomear
          </button>
          <button
            className="danger"
            disabled={remove.isPending}
            onClick={() => {
              const who = count > 0 ? ` Ela será tirada de ${count} personagem(ns), que não serão apagados.` : '';
              if (confirm(`Apagar a tag "${tag.name}"?${who} Isso não pode ser desfeito.`)) remove.mutate(tag.id);
            }}
          >
            Apagar
          </button>
        </div>
      )}
    </li>
  );
}
