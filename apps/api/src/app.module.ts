import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { DomainModule } from './domain/domain.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      useFactory: () => {
        const rawUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trackstat';
        const sanitized = rawUri.replace(/:([^@]+)@/, ':***@');
        console.log(`[Database] Connecting to MongoDB: ${sanitized}`);
        return {
          uri: rawUri,
          dbName: 'trackstat',
          serverSelectionTimeoutMS: 15000,
        };
      },
    }),
    AuthModule,
    DomainModule,
  ],
})
export class AppModule {}
