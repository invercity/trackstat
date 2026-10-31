import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MongoExceptionFilter } from './common/mongo-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalFilters(new MongoExceptionFilter());
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4010;
  await app.listen(port, '0.0.0.0');
  console.log(`TrackStat API successfully started on port ${port} (0.0.0.0)`);
}

bootstrap().catch((err) => {
  console.error('[FATAL] Failed to start TrackStat API:', err);
  process.exit(1);
});
