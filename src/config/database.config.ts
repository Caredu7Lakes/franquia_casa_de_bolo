import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER || 'casadobolo_user',
  password: process.env.DB_PASS || 'casadobolo_pass',
  database: process.env.DB_NAME || 'casadobolo_db',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: true, // Em produção, altere para false e utilize migrations
}));