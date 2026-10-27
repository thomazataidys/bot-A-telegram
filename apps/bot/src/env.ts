// Deve ser o primeiro import do index: @animebot/db lê DATABASE_URL ao ser carregado.
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';

// .env fica na raiz do monorepo; variáveis já definidas no ambiente têm prioridade.
config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });
