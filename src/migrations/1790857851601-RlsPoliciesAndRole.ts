import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * RLS multi-tenant: role restrito de runtime + políticas de isolamento.
 * O TypeORM não gera isso a partir das entidades — é DDL de segurança escrito
 * à mão. Idempotente: pode rodar em banco novo ou já parcialmente configurado.
 *
 * A senha do role app vem de env (APP_DB_PASSWORD) para não ficar hardcoded.
 */
export class RlsPoliciesAndRole1790857851601 implements MigrationInterface {
  name = 'RlsPoliciesAndRole1790857851601';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const appPassword = process.env.APP_DB_PASSWORD;
    if (!appPassword) {
      throw new Error('APP_DB_PASSWORD não definida — necessária para criar o role de runtime.');
    }

    // 1) Role restrito que o backend usa em runtime (respeita RLS).
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'casadobolo_app') THEN
          CREATE ROLE casadobolo_app LOGIN PASSWORD '${appPassword}';
        END IF;
      END $$;
    `);
    await queryRunner.query(`ALTER ROLE casadobolo_app NOSUPERUSER NOBYPASSRLS`);
    await queryRunner.query(`GRANT USAGE ON SCHEMA public TO casadobolo_app`);
    await queryRunner.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO casadobolo_app`);
    await queryRunner.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO casadobolo_app`);
    await queryRunner.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO casadobolo_app`);
    await queryRunner.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO casadobolo_app`);

    // 2) RLS + FORCE + política por tabela de dado.
    const tables = ['customers', 'products', 'orders', 'interaction_logs'];
    for (const tbl of tables) {
      await queryRunner.query(`ALTER TABLE "${tbl}" ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE "${tbl}" FORCE ROW LEVEL SECURITY`);
      await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation ON "${tbl}"`);
      await queryRunner.query(`
        CREATE POLICY tenant_isolation ON "${tbl}"
        USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
        WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid)
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = ['customers', 'products', 'orders', 'interaction_logs'];
    for (const tbl of tables) {
      await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation ON "${tbl}"`);
      await queryRunner.query(`ALTER TABLE "${tbl}" NO FORCE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE "${tbl}" DISABLE ROW LEVEL SECURITY`);
    }
    // Não dropamos o role no down (pode estar em uso por conexões ativas).
  }
}