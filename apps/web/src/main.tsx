import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router';
import { CharacterFormPage } from './pages/CharacterFormPage';
import { CharacterPage } from './pages/CharacterPage';
import { CharactersPage } from './pages/CharactersPage';
import { EthnicitiesPage } from './pages/EthnicitiesPage';
import { EthnicityFormPage } from './pages/EthnicityFormPage';
import { EventFormPage } from './pages/EventFormPage';
import { MapEditorPage } from './pages/MapEditorPage';
import { MapPage } from './pages/MapPage';
import { StoriesPage } from './pages/StoriesPage';
import { StoryFormPage } from './pages/StoryFormPage';
import { StoryPage } from './pages/StoryPage';
import { StoryTrashPage } from './pages/StoryTrashPage';
import { TrashPage } from './pages/TrashPage';
import './styles.css';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<StoriesPage />} />
          <Route path="/trash" element={<TrashPage />} />
          <Route path="/stories/:id/trash" element={<StoryTrashPage />} />
          <Route path="/stories/new" element={<StoryFormPage />} />
          <Route path="/stories/:id" element={<StoryPage />} />
          <Route path="/stories/:id/edit" element={<StoryFormPage />} />
          <Route path="/stories/:id/events/new" element={<EventFormPage />} />
          <Route path="/stories/:id/events/:eventId/edit" element={<EventFormPage />} />
          <Route path="/stories/:id/characters" element={<CharactersPage />} />
          <Route path="/stories/:id/ethnicities" element={<EthnicitiesPage />} />
          <Route path="/stories/:id/ethnicities/new" element={<EthnicityFormPage />} />
          <Route path="/stories/:id/ethnicities/:ethnicityId/edit" element={<EthnicityFormPage />} />
          <Route path="/stories/:id/map" element={<MapPage />} />
          <Route path="/stories/:id/map/edit" element={<MapEditorPage />} />
          <Route path="/stories/:id/characters/new" element={<CharacterFormPage />} />
          <Route path="/stories/:id/characters/:characterId" element={<CharacterPage />} />
          <Route path="/stories/:id/characters/:characterId/edit" element={<CharacterFormPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
