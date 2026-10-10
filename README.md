# Wonderland

Gerenciador de histórias para escritores: cadastre histórias, eventos e personagens e acompanhe
tudo numa **timeline** que preserva a distância no tempo entre os eventos — para manter a
consistência da narrativa.

## Funcionalidades

- **Histórias** — criar, listar, editar e mover para a lixeira (soft delete).
- **Eventos** — título, data e descrição, exibidos numa timeline e numa lista.
  - **Timeline com escala de tempo**: a distância entre eventos é proporcional ao tempo entre eles,
    em escala logarítmica (dias, anos e séculos cabem na mesma tela).
  - Eventos que caem no mesmo ponto viram um círculo com o número de eventos; o hover mostra todos.
  - Vertical ou horizontal (botão para alternar), controle de escala, e as duas preferências ficam salvas.
  - **"Dias atuais"**: o evento mais recente da história é o presente; os demais mostram
    "(37 anos atrás)" na lista e no hover.
- **Personagens** — ficha completa com mais de 100 campos (dados básicos, aparência, saúde,
  personalidade, passado, relacionamentos, trabalho, habilidades, gostos, sobrenatural).
  - Vinculados a eventos (muitos-para-muitos); a página do personagem mostra a timeline só dos eventos dele.
  - Personagens podem ser criados direto do formulário de evento, só com o nome.
  - A **idade é calculada** pela data de nascimento até os "dias atuais" da história (não há campo
    de idade). Na página do personagem, cada evento mostra a idade que ele tinha ("nascimento",
    "12 anos"...).
  - Selo colorido **Vivo / Falecido** (falecido = data de falecimento preenchida), com "faleceu aos
    N anos"; no mapa no tempo o personagem sai depois dessa data.
  - **Local de nascimento** vinculado a um lugar do mapa, como o local dos eventos.
  - **Família**: vincule outros personagens como pai/mãe, filho/filha, avô/avó, irmão/irmã, tio/tia,
    primo/prima, cônjuge, padrasto/madrasta, sogro/sogra, cunhado/cunhada, padrinho/madrinha...
    Cada vínculo aparece nas duas fichas, com o papel invertido (pai ↔ filha) e no gênero do parente.
  - Campos de **objetivos, desejos e trivialidades**.

- **Etnias** — nações, reinos, povos, tribos... com tipo, cor e descrição. Cada personagem pode ser
  vinculado a uma etnia; no mapa, regiões e territórios também.
- **Mapa da história** — editor no estilo "paint":
  - pinte **terra, mar e lagos** com pincel e divida a terra em **regiões** (pintadas por cima);
  - marque **cidades, vilarejos, castelos, portos, templos, ruínas, vulcões, montanhas,
    cordilheiras, florestas, cavernas**, locais genéricos e rótulos de texto (nomes de mares,
    continentes...); cada marcador pode ser **redimensionado** pelas alças nos cantos ou pelo controle
    de tamanho;
  - desenhe **rios, estradas e cordilheiras em linha** (montanhas distribuídas ao longo do traço);
  - delimite **territórios** de uma etnia com linha tracejada (círculo/"raio" ou polígono), que podem
    atravessar várias regiões — ex.: uma tribo que transita entre dois países;
  - selecionar e arrastar, desfazer (Ctrl+Z), apagar (Delete), zoom e salvar.
- **Local dos eventos** — cada evento pode apontar para um marcador, uma região, um território ou
  uma linha (rio, estrada, cordilheira) do mapa ("evento X, no ano Y, com W, K e Z, em P").
- **Mapa no tempo** — régua do primeiro ao último evento (com play, velocidade e saltos de evento em
  evento): os personagens aparecem no local do seu primeiro evento e se deslocam em linha reta entre
  os locais dos eventos seguintes, proporcional ao tempo; com trilhas do caminho percorrido.

- **Lixeira** — nada é apagado de imediato: histórias, eventos, personagens e etnias vão para a lixeira.
  - **Lixeira geral** (`/trash`, botão na lista de histórias): histórias apagadas, com quantos
    eventos e personagens cada uma contém.
  - **Lixeira da história** (aba da história): eventos, personagens e etnias apagados.
  - Cada item pode ser **restaurado** ou **excluído permanentemente** (com confirmação; só vale para
    o que já está na lixeira). Excluir uma história remove junto seus eventos e personagens; excluir
    um personagem mantém os eventos dele. Restaurar um personagem devolve os vínculos com os eventos.

Ainda **não** há login.

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Node.js + [Fastify](https://fastify.dev) + [Zod](https://zod.dev) (validação) |
| Banco | [Prisma](https://www.prisma.io) com **SQLite** (troca simples para Postgres) |
| Frontend | React + [Vite](https://vite.dev) + [TanStack Query](https://tanstack.com/query) + React Router |
| Testes | [Vitest](https://vitest.dev) |
| Linguagem | TypeScript em tudo (monorepo com npm workspaces) |

## Pré-requisitos

- **Node.js 22.12+** (desenvolvido com Node 24; o Vitest exige 22.12, 24 ou 26+) e npm.

## Como rodar

```bash
git clone git@github.com:brlebtag/Wonderland.git
cd Wonderland
npm install
npm run setup   # cria apps/api/.env, cria o banco (apps/api/prisma/dev.db) e gera o Prisma Client
npm run dev     # sobe API e frontend juntos
```

Abra **http://localhost:5173**.

- API: http://127.0.0.1:3333 (o Vite repassa `/api/*` para ela).
- O banco SQLite fica em `apps/api/prisma/dev.db` e **não** vai para o git.

### Scripts (na raiz)

| Comando | O que faz |
|---|---|
| `npm run setup` | Prepara um clone novo: `.env`, migrations pendentes e Prisma Client. Nunca apaga dados. |
| `npm run dev` | API (com reload automático) + frontend. |
| `npm test` | Testes da API e do frontend. |
| `npm run typecheck` | Checagem de tipos dos dois apps. |
| `npm run build` | Build de produção do frontend (`apps/web/dist`). |
| `npm run db:migrate` | Cria uma nova migration depois de alterar `schema.prisma` (dev). |

### Configuração

`apps/api/.env` (criado pelo `npm run setup` a partir de `.env.example`):

| Variável | Padrão | Uso |
|---|---|---|
| `DATABASE_URL` | `file:./dev.db` | Banco (caminho relativo a `apps/api/prisma/`). |
| `API_PORT` | `3333` | Porta da API. Se mudar, ajuste o proxy em `apps/web/vite.config.ts`. |

## Estrutura

```
Wonderland/
├── apps/
│   ├── api/                     backend
│   │   ├── prisma/              schema.prisma + migrations
│   │   ├── src/
│   │   │   ├── app.ts           Fastify, rotas e tratamento de erros
│   │   │   └── modules/
│   │   │       ├── stories/     routes → service → repository
│   │   │       ├── events/
│   │   │       ├── characters/
│   │   │       ├── ethnicities/
│   │   │       ├── map/         documento do mapa + validação
│   │   │       └── trash/
│   │   └── test/                testes de API (banco próprio: prisma/test.db)
│   └── web/                     frontend
│       └── src/
│           ├── api.ts           cliente HTTP + hooks do TanStack Query
│           ├── pages/           uma tela por rota
│           ├── components/      Timeline, EventList, CharacterForm, CharacterPicker…
│           ├── map/             MapView (canvas + SVG), desenho da grade, documento editável
│           └── timelineLayout.ts  cálculo das posições da timeline (com testes)
├── packages/shared/             código usado pelos dois lados
│   └── src/
│       ├── characterFields.ts   catálogo da ficha de personagem
│       └── map.ts               formato do mapa, RLE, locais e deslocamento no tempo
└── scripts/setup.mjs
```

### Arquitetura do backend

Cada módulo tem três camadas:

- **routes** — HTTP: valida a entrada com Zod e chama o service.
- **service** — regras de negócio (ex.: o evento só pode vincular personagens da mesma história).
- **repository** — único lugar que fala com o Prisma.

O **soft delete** é centralizado nos repositories: tudo tem `deletedAt`, e toda consulta filtra os
apagados. Uma história na lixeira esconde seus eventos e personagens; ao restaurá-la, eles voltam.

### Modelo de dados

```
                          Character *───* Character (CharacterRelation: parentesco)
Story 1───* Event *───* Character *───0..1 Ethnicity
  │            │
  │            └── location → { kind, id } de um elemento do mapa
  └── 1───0..1 StoryMap (JSON)
```

- `Story`: `title`, `description`
- `Event`: `title`, `description`, `date` (ordenação da timeline), `locationKind` + `locationId`
- `Character`: `name`, `nickname`, `attributes` (JSON com a ficha), `ethnicityId`,
  `birthLocationKind` + `birthLocationId` (local de nascimento no mapa)
- `CharacterRelation`: `characterId`, `relatedId`, `role` — "related é role de character", um
  registro por par; o outro lado usa o papel inverso (`packages/shared/src/familyRoles.ts`)
- `Ethnicity`: `name`, `kind`, `color`, `description`
- `StoryMap`: `data` (JSON, um documento por história)
- Todos (menos o mapa): `createdAt`, `updatedAt`, `deletedAt`

### Mapa

O mapa é **um documento JSON por história** (formato em
[`packages/shared/src/map.ts`](packages/shared/src/map.ts)), salvo de uma vez pelo editor:

- **Grade pintada**: `terrain` (mar/terra/lago por célula) e `regionGrid` (região de cada célula),
  guardadas em RLE (`valor*quantidade,...`). Tamanho escolhido ao criar (160×100, 240×150 ou 360×225).
- **Elementos vetoriais** em coordenadas de célula: `features` (marcadores, com `size` opcional),
  `paths` (rios, estradas e cordilheiras, com `size` opcional), `territories` (círculo ou
  polígono, com etnia) e `regions` (nome, cor, etnia).

Um evento (e o local de nascimento de um personagem) referencia um marcador, uma região, um
território ou uma linha pelo id. Ao salvar o mapa, eventos e personagens que apontavam para um
elemento removido **ficam sem local** (a API informa quantos). Para posicionar uma
região usa-se a célula dela mais próxima do seu centro; um território usa o centro do círculo/polígono;
uma linha, o ponto no meio do seu comprimento.

### Ficha de personagem

Os campos da ficha **não** são colunas: ficam em `Character.attributes` (JSON) e são descritos em
[`packages/shared/src/characterFields.ts`](packages/shared/src/characterFields.ts). Esse catálogo gera:

- a validação no backend (tipos, opções permitidas; chaves desconhecidas são descartadas);
- o formulário (seções recolhíveis) e a exibição da ficha no frontend.

Para **adicionar ou remover um campo**, edite só o catálogo — não precisa de migration.
Tipos disponíveis: `text`, `textarea`, `number`, `date`, `boolean` (Sim/Não), `select`, `multiselect`.
Não renomeie o `value` de uma opção já usada: é o que fica gravado no banco.

### Timeline

A posição de cada evento é `posição anterior + escala × ln(1 + dias desde o evento anterior)`.
O log é aplicado ao **intervalo** entre eventos (não à data), então a ordem e a proporção se mantêm,
mas um salto de séculos não empurra o resto para longe. Detalhes e testes em
`apps/web/src/timelineLayout.ts`.

## API

Todas as rotas começam com `/api`. Datas de evento usam `YYYY-MM-DD`.
Erros de validação respondem `400`; registros inexistentes ou na lixeira, `404`.

| Método | Rota | Descrição |
|---|---|---|
| GET | `/stories` | Lista as histórias |
| POST | `/stories` | Cria `{ title, description? }` |
| GET | `/stories/:id` | Detalhe |
| PATCH | `/stories/:id` | Atualiza |
| DELETE | `/stories/:id` | Lixeira (soft delete) |
| POST | `/stories/:id/restore` | Restaura da lixeira |
| GET | `/stories/:id/events` | Eventos ordenados por data, com `characters: [{ id, name }]` |
| POST | `/stories/:id/events` | Cria `{ title, date, description?, characterIds?, location? }`; `location` = `{ kind, id }` com kind `feature`, `region`, `territory` ou `path` |
| PATCH | `/events/:id` | Atualiza (`characterIds` substitui os vínculos) |
| DELETE | `/events/:id` | Lixeira |
| GET | `/stories/:id/characters` | Personagens da história |
| POST | `/stories/:id/characters` | Cria `{ name, nickname?, attributes?, ethnicityId?, birthLocation? }` |
| GET | `/characters/:id` | Detalhe |
| PATCH | `/characters/:id` | Atualiza (`attributes` substitui a ficha inteira) |
| DELETE | `/characters/:id` | Lixeira (some dos eventos; o vínculo é mantido) |
| GET | `/characters/:id/events` | Eventos do personagem |
| GET | `/characters/:id/relations` | Parentescos do ponto de vista do personagem: `[{ role, other: { id, name, sex } }]` |
| PUT | `/characters/:id/relations` | Substitui os parentescos: `{ relations: [{ otherId, role }] }` |
| GET | `/stories/:id/ethnicities` | Etnias da história |
| POST | `/stories/:id/ethnicities` | Cria `{ name, kind?, color?, description? }` |
| GET · PATCH · DELETE | `/ethnicities/:id` | Detalhe, atualiza, lixeira |
| GET | `/stories/:id/map` | Mapa da história (`data: null` se ainda não existe) |
| PUT | `/stories/:id/map` | Salva `{ data }`; responde `clearedEvents` e `clearedCharacters` (quem ficou sem local) |
| GET | `/trash/stories` | Histórias na lixeira (com `_count` de eventos e personagens) |
| GET | `/stories/:id/trash` | Eventos e personagens na lixeira da história |
| POST | `/events/:id/restore` · `/characters/:id/restore` · `/ethnicities/:id/restore` | Restaura da lixeira |
| DELETE | `/stories/:id/permanent` | Exclui de vez a história (já na lixeira) com eventos e personagens |
| DELETE | `/events/:id/permanent` · `/characters/:id/permanent` · `/ethnicities/:id/permanent` | Exclui de vez (só itens na lixeira) |

## Migrando para Postgres

1. Em `apps/api/prisma/schema.prisma`, troque `provider = "sqlite"` por `"postgresql"`.
2. Em `apps/api/.env`: `DATABASE_URL="postgresql://usuario:senha@host:5432/wonderland"`.
3. Apague `apps/api/prisma/migrations/` e rode `npm run db:migrate` para gerar as migrations do Postgres.
4. Os dados do SQLite não são migrados automaticamente (exporte/importe se precisar).

O código da aplicação não muda: todo acesso ao banco passa pelo Prisma.

## Problemas comuns

- **Tela em branco depois de atualizar o código** — o Vite às vezes perde mudanças de arquivo no
  Windows. Pare o `npm run dev` e rode de novo.
- **`prisma migrate dev` pede para resetar o banco** — isso apaga todos os dados. Em vez disso, use
  `npm run setup` (aplica só as migrations pendentes).
- **Porta em uso** — mude `API_PORT` no `.env` (e o proxy no `vite.config.ts`) ou a porta do Vite em
  `apps/web/vite.config.ts`.

## Licença

[MIT](LICENSE)
