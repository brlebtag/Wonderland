// Prepara um clone novo: cria apps/api/.env (se faltar), aplica as migrations e gera o Prisma Client.
// Uso: npm run setup   (depois de npm install)
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';

const api = new URL('../apps/api/', import.meta.url);
const env = new URL('.env', api);

if (!existsSync(env)) {
  copyFileSync(new URL('.env.example', api), env);
  console.log('Criado apps/api/.env a partir de .env.example');
}

// migrate deploy só aplica migrations pendentes; nunca apaga dados.
for (const cmd of ['npx prisma migrate deploy', 'npx prisma generate']) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd: api, stdio: 'inherit' });
}
