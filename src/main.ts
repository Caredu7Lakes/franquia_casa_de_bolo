import 'reflect-metadata';
import { initializeTransactionalContext, StorageDriver } from 'typeorm-transactional';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // Precisa vir ANTES de criar o app: prepara a propagação de transação/conexão.
  initializeTransactionalContext({ storageDriver: StorageDriver.AUTO });

  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();