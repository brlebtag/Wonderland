import { Link, NavLink } from 'react-router';
import type { Story } from '../api';

/** Título da história + abas Eventos / Personagens. */
export function StoryHeader({ story }: { story: Story }) {
  return (
    <>
      <Link to="/">← Histórias</Link>
      <header className="page-header">
        <div>
          <h1>{story.title}</h1>
          {story.description && <p className="story-desc">{story.description}</p>}
        </div>
        <Link className="button ghost" to={`/stories/${story.id}/edit`}>
          Editar
        </Link>
      </header>
      <nav className="tabs">
        <NavLink end to={`/stories/${story.id}`}>
          Eventos
        </NavLink>
        <NavLink to={`/stories/${story.id}/characters`}>Personagens</NavLink>
      </nav>
    </>
  );
}
