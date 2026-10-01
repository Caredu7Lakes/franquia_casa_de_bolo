import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * tenant_id com DEFAULT = tenant corrente da sessão RLS.
 *
 * As tabelas de dado têm tenant_id NOT NULL e política RLS com
 *   WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid)
 * mas o código de aplicação (bot do WhatsApp, webhooks) não preenche tenant_id
 * nos inserts. Resultado: tenant_id saía NULL → violava NOT NULL e o WITH CHECK
 * → o INSERT era rejeitado e nada era gravado.
 *
 * Damos à coluna um DEFAULT que lê o mesmo app.current_tenant setado por
 * requisição (interceptor / tenant-resolver). Como o TypeORM omite a coluna do
 * INSERT quando a entidade não a atribui, o DEFAULT é aplicado e o valor casa
 * com a política RLS. Centraliza o preenchimento no banco, sem espalhar
 * atribuições de tenant_id por cada service.
 *
 * Idempotente.
 */
export class TenantIdDefaultFromSession1790857851602 implements MigrationInterface {
  name = 'TenantIdDefaultFromSession1790857851602';

  private readonly tables = ['customers', 'products', 'orders', 'interaction_logs'];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const tbl of this.tables) {
      await queryRunner.query(
        `ALTER TABLE "${tbl}" ALTER COLUMN tenant_id SET DEFAULT current_setting('app.current_tenant', true)::uuid`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const tbl of this.tables) {
      await queryRunner.query(`ALTER TABLE "${tbl}" ALTER COLUMN tenant_id DROP DEFAULT`);
    }
  }
}
