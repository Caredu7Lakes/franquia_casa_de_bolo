import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { RedisHealthIndicator } from './redis.health';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly config: ConfigService,
  ) {}

  // Liveness: o processo está no ar e respondendo. Sem dependências externas.
  // Usado pelo healthcheck do container (reinicia se não responder).
  @Get()
  @HealthCheck()
  live() {
    return this.health.check([]);
  }

  // Readiness: pronto para servir — Postgres e Redis acessíveis.
  // Usado por monitor externo / healthcheck para decidir rotear tráfego.
  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.db.pingCheck('postgres', { timeout: 2000 }),
      () => this.redis.pingCheck('redis', this.config),
    ]);
  }
}
