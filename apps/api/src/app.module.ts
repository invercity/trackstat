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
        let fixedUri = rawUri;
        // If URI connects to root / without db name, enforce /trackstat
        if (fixedUri.includes('/?')) {
          fixedUri = fixedUri.replace('/?', '/trackstat?');
        } else if (fixedUri.endsWith('/')) {
          fixedUri = `${fixedUri}trackstat`;
        }
        const sanitized = fixedUri.replace(/:([^@]+)@/, ':***@');
        console.log(`[Database] Connecting to MongoDB: ${sanitized}`);
        return {
          uri: fixedUri,
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
