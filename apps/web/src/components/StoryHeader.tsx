import { Link, NavLink } from 'react-router';
import type { Story } from '../api';

/** Título da história + abas. */
export function StoryHeader({ story }: { story: Story }) {
  const base = `/stories/${story.id}`;
  return (
    <>
      <Link to="/">← Histórias</Link>
      <header className="page-header">
        <div>
          <h1>{story.title}</h1>
          {story.description && <p className="story-desc">{story.description}</p>}
        </div>
        <Link className="button ghost" to={`${base}/edit`}>
          Editar
        </Link>
      </header>
      <nav className="tabs">
        <NavLink end to={base}>
          Eventos
        </NavLink>
        <NavLink to={`${base}/characters`}>Personagens</NavLink>
        <NavLink to={`${base}/ethnicities`}>Etnias</NavLink>
        <NavLink to={`${base}/map`}>Mapa</NavLink>
        <NavLink to={`${base}/trash`}>Lixeira</NavLink>
      </nav>
    </>
  );
}
