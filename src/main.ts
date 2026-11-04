import 'reflect-metadata';
import { initializeTransactionalContext, StorageDriver } from 'typeorm-transactional';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  // Precisa vir ANTES de criar o app: prepara a propagação de transação/conexão.
  initializeTransactionalContext({ storageDriver: StorageDriver.ASYNC_LOCAL_STORAGE });

  // rawBody: true preserva o corpo cru em req.rawBody — necessário para o
  // HmacSignatureGuard recalcular a assinatura sobre os bytes originais.
  // bufferLogs: true segura os logs até o logger (pino) estar pronto.
  const app = await NestFactory.create(AppModule, { rawBody: true, bufferLogs: true });

  // Substitui o logger padrão do Nest pelo pino (JSON estruturado no stdout).
  // Os `new Logger(...)` espalhados pelo código passam a sair em JSON sem alteração.
  app.useLogger(app.get(Logger));

  await app.listen(3000);
}
bootstrap();
