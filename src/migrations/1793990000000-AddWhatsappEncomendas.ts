import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Encomendas originadas no WhatsApp (fluxo do bot: sabor -> data -> horario ->
 * nome -> confirmacao humana). Diferente de `orders` (iFood, sem PII): esta
 * tabela liga o titular (customer_id) + nome informado, entao ENTRA no regime
 * LGPD (export/anonimizacao do CRM a tratam).
 *
 * Mesmo molde multi-tenant das demais: tenant_id NOT NULL com DEFAULT do tenant
 * da sessao + RLS ENABLE/FORCE + politica tenant_isolation + grant ao role de
 * runtime. Idempotente.
 */
export class AddWhatsappEncomendas1793990000000 implements MigrationInterface {
  name = 'AddWhatsappEncomendas1793990000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "whatsapp_encomendas" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL DEFAULT current_setting('app.current_tenant', true)::uuid,
        "customer_id" uuid,
        "customer_name" character varying(250),
        "flavor" character varying(250) NOT NULL,
        "pickup_date" date NOT NULL,
        "pickup_time" character varying(5) NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'pending',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_whatsapp_encomendas" PRIMARY KEY ("id"),
        CONSTRAINT "FK_whatsapp_encomendas_customer" FOREIGN KEY ("customer_id")
          REFERENCES "customers"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_whatsapp_encomendas_tenant" ON "whatsapp_encomendas" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_whatsapp_encomendas_status" ON "whatsapp_encomendas" ("tenant_id", "status")`,
    );

    // RLS no mesmo molde das tabelas de dado.
    await queryRunner.query(`ALTER TABLE "whatsapp_encomendas" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "whatsapp_encomendas" FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation ON "whatsapp_encomendas"`);
    await queryRunner.query(`
      CREATE POLICY tenant_isolation ON "whatsapp_encomendas"
      USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid)
    `);

    await queryRunner.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON "whatsapp_encomendas" TO casadobolo_app`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation ON "whatsapp_encomendas"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "whatsapp_encomendas"`);
  }
}
