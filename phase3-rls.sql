-- ============================================================
-- FASE 3 — RLS multi-tenant
-- Roda como casadobolo_user (owner/superuser).
-- Idempotente: pode rodar mais de uma vez.
-- ============================================================

-- 1) Role restrito que o BACKEND usará em runtime (respeita RLS).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'casadobolo_app') THEN
    CREATE ROLE casadobolo_app LOGIN PASSWORD 'k27RMlpAd7-YrwJ348ctipTFnGf6xFrc';
  END IF;
END $$;

-- Sem superuser, sem bypassrls (garante que RLS vale para ele).
ALTER ROLE casadobolo_app NOSUPERUSER NOBYPASSRLS;

-- Permissões de dados (não de DDL).
GRANT USAGE ON SCHEMA public TO casadobolo_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO casadobolo_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO casadobolo_app;
-- Futuras tabelas herdam as permissões.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO casadobolo_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO casadobolo_app;

-- 2) tenant_id nas tabelas de dado (nullable primeiro, para o backfill).
ALTER TABLE customers        ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE products         ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE orders           ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE interaction_logs ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- 3) Backfill: vincula todo dado existente ao tenant "Casa do Bolo".
DO $$
DECLARE t_id uuid;
BEGIN
  SELECT id INTO t_id FROM tenants WHERE evolution_instance = 'casa_do_bolo_instance' LIMIT 1;
  IF t_id IS NULL THEN RAISE EXCEPTION 'Tenant Casa do Bolo não encontrado'; END IF;

  UPDATE customers        SET tenant_id = t_id WHERE tenant_id IS NULL;
  UPDATE products         SET tenant_id = t_id WHERE tenant_id IS NULL;
  UPDATE orders           SET tenant_id = t_id WHERE tenant_id IS NULL;
  UPDATE interaction_logs SET tenant_id = t_id WHERE tenant_id IS NULL;
END $$;

-- 4) Agora que não há nulos, torna NOT NULL.
ALTER TABLE customers        ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE products         ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE orders           ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE interaction_logs ALTER COLUMN tenant_id SET NOT NULL;

-- 5) Índice por tenant (performance das queries filtradas).
CREATE INDEX IF NOT EXISTS idx_customers_tenant        ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant         ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant           ON orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_interaction_logs_tenant ON interaction_logs(tenant_id);

-- 6) Ativa RLS + FORCE (força até para o owner das tabelas) + política.
--    A política compara tenant_id com o app.current_tenant setado por requisição.
DO $$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['customers','products','orders','interaction_logs'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
      USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid)
    $f$, tbl);
  END LOOP;
END $$;