import { Provider } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Cliente Redis dedicado ao estado conversacional do bot (rascunho de
 * encomenda + pausa de handoff). Separado do Redis do BullMQ. Mesma instancia
 * ja na stack (REDIS_HOST/REDIS_PORT).
 */
export const REDIS_CLIENT = 'WHATSAPP_REDIS_CLIENT';

export const RedisProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: (): Redis =>
    new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      maxRetriesPerRequest: null,
      lazyConnect: false,
    }),
};
