import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER || 'casadobolo_user',
  password: process.env.DB_PASS || 'casadobolo_pass',
  database: process.env.DB_NAME || 'casadobolo_db',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  subscribers: [__dirname + '/../**/*.subscriber{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  // Schema agora é gerenciado por migrations, não por synchronize.
  synchronize: false,
  // Aplica migrations pendentes automaticamente no boot.
  migrationsRun: false,
}));