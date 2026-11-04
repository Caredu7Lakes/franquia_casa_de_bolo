import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerAnonymizedAt1793900000000 implements MigrationInterface {
  name = 'AddCustomerAnonymizedAt1793900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "anonymized_at" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "customers" DROP COLUMN IF EXISTS "anonymized_at"`,
    );
  }
}
