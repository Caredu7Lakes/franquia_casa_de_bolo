import { Injectable } from '@nestjs/common';
import { HealthIndicatorService, HealthIndicatorResult } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { createConnection } from 'net';

/**
 * Health check do Redis sem dependência nova: abre um socket TCP para host:port
 * do config, envia PING e espera +PONG. O Redis é usado só via BullMQ, então
 * não há cliente ioredis exposto para reusar — este check é direto e barato.
 *
 * API do terminus v11: injeta HealthIndicatorService e usa check(key).up()/.down().
 */
@Injectable()
export class RedisHealthIndicator {
  constructor(private readonly healthIndicatorService: HealthIndicatorService) {}

  async pingCheck(key: string, config: ConfigService): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    const host = config.get<string>('redis.host') || 'localhost';
    const port = config.get<number>('redis.port') || 6379;

    const ok = await new Promise<boolean>((resolve) => {
      const socket = createConnection({ host, port });
      let settled = false;
      const done = (value: boolean) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        resolve(value);
      };
      socket.setTimeout(2000);
      socket.on('connect', () => socket.write('PING\r\n'));
      socket.on('data', (buf) => done(buf.toString().includes('PONG')));
      socket.on('timeout', () => done(false));
      socket.on('error', () => done(false));
    });

    return ok ? indicator.up() : indicator.down('Redis unreachable');
  }
}
