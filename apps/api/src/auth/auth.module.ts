import {
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  Injectable,
  Module,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { timingSafeEqual } from 'crypto';

const same = (a = '', b = '') => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Читання (GET) публічне, будь-які зміни — лише з JWT. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;
    if (req.path.endsWith('/auth/login') || req.path.endsWith('/protocol-import/preview')) return true;
    const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
    try {
      await this.jwt.verifyAsync(token);
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}

@Controller('auth')
export class AuthController {
  constructor(private readonly jwt: JwtService) {}

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    if (!same(body?.username, process.env.ADMIN_USERNAME) || !same(body?.password, process.env.ADMIN_PASSWORD))
      throw new UnauthorizedException('Невірний логін або пароль');
    return { token: await this.jwt.signAsync({ sub: 'admin' }) };
  }
}

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({ secret: process.env.JWT_SECRET || 'dev-secret', signOptions: { expiresIn: '7d' } }),
    }),
  ],
  controllers: [AuthController],
  providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
})
export class AuthModule {}
