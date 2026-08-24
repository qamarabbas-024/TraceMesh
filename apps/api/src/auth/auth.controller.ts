import { Controller, Post, Get, Body, Headers, UnauthorizedException, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: { email: string; password: string; name?: string }) {
    return this.authService.register(body);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body);
  }

  @Get('me')
  async getMe(@Headers('authorization') authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }
    const token = authHeader.substring(7);
    const user = this.authService.verifyToken(token);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired session');
    }
    return user;
  }
}
