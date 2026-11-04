import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Avisos operacionais editáveis pelo OWNER (ex.: "sábado só loja física",
 * "após 17h sem reservas"). O bot exibe os avisos ativos cuja janela de
 * dia/horário bate com o momento atual (fuso America/Sao_Paulo, avaliado na
 * aplicação). Segue o mesmo padrão multi-tenant das demais tabelas:
 * tenant_id NOT NULL com DEFAULT do tenant da sessão + RLS ENABLE/FORCE +
 * política tenant_isolation. Idempotente.
 */
export class AddOperationalNotices1793903000000 implements MigrationInterface {
  name = 'AddOperationalNotices1793903000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "operational_notices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL DEFAULT current_setting('app.current_tenant', true)::uuid,
        "message" text NOT NULL,
        "active" boolean NOT NULL DEFAULT false,
        "weekdays" integer array NOT NULL DEFAULT '{}',
        "start_time" character varying(5),
        "end_time" character varying(5),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_operational_notices" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_operational_notices_tenant" ON "operational_notices" ("tenant_id")`,
    );

    // RLS no mesmo molde das tabelas de dado.
    await queryRunner.query(`ALTER TABLE "operational_notices" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "operational_notices" FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation ON "operational_notices"`);
    await queryRunner.query(`
      CREATE POLICY tenant_isolation ON "operational_notices"
      USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid)
    `);

    // Garante o grant ao role de runtime (ALTER DEFAULT PRIVILEGES já cobre
    // tabelas futuras, mas reforçamos para ser idempotente em bancos antigos).
    await queryRunner.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON "operational_notices" TO casadobolo_app`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation ON "operational_notices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "operational_notices"`);
  }
}
