import { MigrationInterface, QueryRunner } from "typeorm";

export class BaselineSchema1790857851600 implements MigrationInterface {
    name = 'BaselineSchema1790857851600'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "ifood_order_id" character varying NOT NULL, "display_id" character varying, "total" numeric(10,2), "items" jsonb, "status" character varying, "sales_channel" character varying, "ordered_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "customer_id" uuid, CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_527dd6efd5f3402f729c6b3e82" ON "orders" ("tenant_id") `);
        await queryRunner.query(`CREATE TABLE "customers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "phone_number" character varying(30) NOT NULL, "name" character varying(250), "email" character varying(250), "delivery_address" text, "opt_in_promotions" boolean NOT NULL DEFAULT false, "opt_in_updated_at" TIMESTAMP WITH TIME ZONE, "tags" text array NOT NULL DEFAULT '{}', "notes" text, "nps_score" smallint, "orders_count" integer NOT NULL DEFAULT '0', "total_spent" numeric(10,2), "average_ticket" numeric(10,2), "last_order_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_133ec679a801fab5e070f73d3ea" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_fc01751d01f8e793234ed77fe3" ON "customers" ("tenant_id", "phone_number") `);
        await queryRunner.query(`CREATE TABLE "interaction_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "menuOption" character varying, "userMessage" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "customer_id" uuid, CONSTRAINT "PK_f71f134b81f9b5721e20947d5b2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_be742e0f2445a19e9357a88d1d" ON "interaction_logs" ("tenant_id") `);
        await queryRunner.query(`CREATE TABLE "tenants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(200) NOT NULL, "active" boolean NOT NULL DEFAULT true, "evolution_instance" character varying, "ifood_merchant_id" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_702d69603536613fd9d4703ca8b" UNIQUE ("evolution_instance"), CONSTRAINT "UQ_487e99809a911454de2d60292ba" UNIQUE ("ifood_merchant_id"), CONSTRAINT "PK_53be67a04681c66b87ee27c9321" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('OWNER', 'OPERATOR')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(250) NOT NULL, "password_hash" character varying NOT NULL, "name" character varying(200), "role" "public"."users_role_enum" NOT NULL DEFAULT 'OWNER', "active" boolean NOT NULL DEFAULT true, "tenant_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
        await queryRunner.query(`CREATE TYPE "public"."products_category_enum" AS ENUM('BOLOS', 'MINI_BABY', 'BITES', 'RECHEADOS', 'CASEIRO_POTE', 'GELADOS', 'CUCAS_TORTAS', 'COBERTURAS', 'ESPECIAIS', 'ACESSORIOS')`);
        await queryRunner.query(`CREATE TABLE "products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "name" character varying(150) NOT NULL, "description" text, "price" numeric(10,2), "category" "public"."products_category_enum" NOT NULL DEFAULT 'BOLOS', "imageUrl" character varying, "available" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9c365ebf78f0e8a6d9e4827ea7" ON "products" ("tenant_id") `);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_772d0ce0473ac2ccfa26060dbe9" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "interaction_logs" ADD CONSTRAINT "FK_53c2035bd3670b729b43fada49c" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_109638590074998bb72a2f2cf08" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_109638590074998bb72a2f2cf08"`);
        await queryRunner.query(`ALTER TABLE "interaction_logs" DROP CONSTRAINT "FK_53c2035bd3670b729b43fada49c"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_772d0ce0473ac2ccfa26060dbe9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9c365ebf78f0e8a6d9e4827ea7"`);
        await queryRunner.query(`DROP TABLE "products"`);
        await queryRunner.query(`DROP TYPE "public"."products_category_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP TABLE "tenants"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_be742e0f2445a19e9357a88d1d"`);
        await queryRunner.query(`DROP TABLE "interaction_logs"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fc01751d01f8e793234ed77fe3"`);
        await queryRunner.query(`DROP TABLE "customers"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_527dd6efd5f3402f729c6b3e82"`);
        await queryRunner.query(`DROP TABLE "orders"`);
    }

}
