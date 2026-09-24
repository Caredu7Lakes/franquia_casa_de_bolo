import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { DataSource } from 'typeorm';
import { runInTransaction } from 'typeorm-transactional';

/**
 * Núcleo do isolamento RLS.
 *
 * Para cada requisição com tenant resolvido (req.tenantId, posto pelo guard),
 * abre uma transação (via typeorm-transactional, que fixa UMA conexão para toda
 * a requisição) e, como primeira instrução, roda:
 *     SET LOCAL app.current_tenant = <tenantId>
 *
 * A partir daí, as políticas RLS no Postgres filtram cada tabela pelo tenant.
 * SET LOCAL expira ao fim da transação — a conexão volta limpa ao pool.
 *
 * Requisições sem tenantId (webhooks resolvem o tenant por conta própria mais
 * tarde; rotas públicas não tocam dado de tenant) seguem sem transação aqui.
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private readonly dataSource: DataSource) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const tenantId: string | undefined = req?.tenantId;

    if (!tenantId) {
      return next.handle();
    }

    return from(
      runInTransaction(async () => {
        // Escapa o uuid com quote_literal implícito via parâmetro seguro.
        await this.dataSource.query(
          `SELECT set_config('app.current_tenant', $1, true)`,
          [tenantId],
        );
        return await new Promise((resolve, reject) => {
          next.handle().subscribe({ next: resolve, error: reject });
        });
      }),
    );
  }
}