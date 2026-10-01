import 'reflect-metadata';
import { initializeTransactionalContext, StorageDriver, addTransactionalDataSource } from 'typeorm-transactional';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm'; // 1. Importe o DataSource
import { AppModule } from './app.module';

async function bootstrap() {
  // Precisa vir ANTES de criar o app: prepara a propagação de transação/conexão.
  initializeTransactionalContext({ storageDriver: StorageDriver.ASYNC_LOCAL_STORAGE });

  const app = await NestFactory.create(AppModule);
   await app.listen(3000);
}
bootstrap();