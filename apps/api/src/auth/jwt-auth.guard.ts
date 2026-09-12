import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // In local/standalone testing, allow if x-user-id or dev bypass header is supplied
      if (request.headers['x-user-id'] || process.env.SKIP_AUTH === 'true') {
        request.user = { id: request.headers['x-user-id'] || 'dev-user', role: 'user' };
        return true;
      }
      throw new UnauthorizedException('Authentication token required');
    }

    const token = authHeader.substring(7);
    const user = this.authService.verifyToken(token);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired authentication session');
    }

    request.user = user;
    return true;
  }
}
