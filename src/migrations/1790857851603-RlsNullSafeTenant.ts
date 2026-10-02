import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Torna as políticas RLS à prova de contexto vazio.
 *
 * A política anterior fazia current_setting('app.current_tenant', true)::uuid.
 * Quando o GUC não está setado (ex.: rota pública sem tenant), o valor pode vir
 * como string vazia e o cast ''::uuid lança 22P02 (invalid input syntax),
 * derrubando a query com 500. Com NULLIF(...,'') o vazio vira NULL — a
 * comparação apenas não casa (retorna 0 linhas), sem erro.
 */
export class RlsNullSafeTenant1790857851603 implements MigrationInterface {
  name = 'RlsNullSafeTenant1790857851603';

  private readonly tables = ['customers', 'products', 'orders', 'interaction_logs'];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const tbl of this.tables) {
      await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation ON "${tbl}"`);
      await queryRunner.query(`
        CREATE POLICY tenant_isolation ON "${tbl}"
        USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
        WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const tbl of this.tables) {
      await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation ON "${tbl}"`);
      await queryRunner.query(`
        CREATE POLICY tenant_isolation ON "${tbl}"
        USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
        WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid)
      `);
    }
  }
}
