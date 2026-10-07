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
  - Com data de nascimento preenchida, mostra a idade nos "dias atuais" da história.

Ainda **não** há login nem tela de lixeira (a API já restaura histórias: `POST /api/stories/:id/restore`).

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
│   │   │       └── characters/
│   │   └── test/                testes de API (banco próprio: prisma/test.db)
│   └── web/                     frontend
│       └── src/
│           ├── api.ts           cliente HTTP + hooks do TanStack Query
│           ├── pages/           uma tela por rota
│           ├── components/      Timeline, EventList, CharacterForm, CharacterPicker…
│           └── timelineLayout.ts  cálculo das posições da timeline (com testes)
├── packages/shared/             código usado pelos dois lados
│   └── src/characterFields.ts   catálogo da ficha de personagem
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
Story 1───* Event *───* Character *───1 Story
```

- `Story`: `title`, `description`
- `Event`: `title`, `description`, `date` (ordenação da timeline)
- `Character`: `name`, `nickname`, `attributes` (JSON com a ficha)
- Todos: `createdAt`, `updatedAt`, `deletedAt`

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
| POST | `/stories/:id/events` | Cria `{ title, date, description?, characterIds? }` |
| PATCH | `/events/:id` | Atualiza (`characterIds` substitui os vínculos) |
| DELETE | `/events/:id` | Lixeira |
| GET | `/stories/:id/characters` | Personagens da história |
| POST | `/stories/:id/characters` | Cria `{ name, nickname?, attributes? }` |
| GET | `/characters/:id` | Detalhe |
| PATCH | `/characters/:id` | Atualiza (`attributes` substitui a ficha inteira) |
| DELETE | `/characters/:id` | Lixeira (some dos eventos; o vínculo é mantido) |
| GET | `/characters/:id/events` | Eventos do personagem |

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
