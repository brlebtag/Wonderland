import { buildApp } from './app';

const app = buildApp();
await app.listen({ port: Number(process.env.API_PORT ?? 3333), host: '127.0.0.1' });
