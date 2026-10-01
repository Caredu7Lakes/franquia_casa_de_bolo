import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * DataSource exclusivo da CLI de migrations.
 * Separado do runtime (que registra o DataSource no typeorm-transactional).
 * Usado apenas pelos comandos: migration:generate / run / revert.
 *
 * Importante: conecta como o OWNER (casadobolo_user), não o role restrito —
 * migrations fazem DDL (criar tabela, índice, política RLS), o que o role de
 * runtime não tem permissão para fazer.
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_MIGRATION_USER || 'casadobolo_user',
  password: process.env.DB_MIGRATION_PASS || 'casadobolo_pass',
  database: process.env.DB_NAME || 'casadobolo_db',
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  migrationsRun: false,
});