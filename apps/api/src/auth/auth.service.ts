import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

interface UserPayload {
  id: string;
  email: string;
  name?: string | null;
  role: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'tracemesh-hud-intel-secret-key-2026';
  
  // In-memory fallback user store
  private fallbackUsers: (UserPayload & { passwordHash: string })[] = [];

  constructor(private readonly prisma: PrismaService) {}

  private hashPassword(password: string): string {
    const salt = 'tracemesh_salt_2026';
    return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  }

  private generateToken(user: UserPayload): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days
    const payload = Buffer.from(JSON.stringify({ ...user, exp })).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url');
    return `${header}.${payload}.${signature}`;
  }

  verifyToken(token: string): UserPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const [header, payload, signature] = parts;
      const expectedSig = crypto
        .createHmac('sha256', this.JWT_SECRET)
        .update(`${header}.${payload}`)
        .digest('base64url');

      if (signature !== expectedSig) return null;

      const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null;

      return {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
      };
    } catch {
      return null;
    }
  }

  async register(body: { email: string; password: string; name?: string }): Promise<{ user: UserPayload; accessToken: string }> {
    if (!body.email || !body.password || body.password.length < 6) {
      throw new BadRequestException('Valid email and password (min 6 chars) are required');
    }

    const cleanEmail = body.email.trim().toLowerCase();
    const passwordHash = this.hashPassword(body.password);

    try {
      const existing = await this.prisma.user.findUnique({ where: { email: cleanEmail } });
      if (existing) {
        throw new ConflictException('User with this email already exists');
      }

      const created = await this.prisma.user.create({
        data: {
          email: cleanEmail,
          password: passwordHash,
          name: body.name || cleanEmail.split('@')[0],
          role: 'user',
        },
      });

      const user: UserPayload = {
        id: created.id,
        email: created.email,
        name: created.name,
        role: created.role,
      };

      return {
        user,
        accessToken: this.generateToken(user),
      };
    } catch (e) {
      if (e instanceof ConflictException) throw e;
      this.logger.warn(`Prisma unavailable, saving to memory: ${e}`);
    }

    // In-memory fallback
    if (this.fallbackUsers.some((u) => u.email === cleanEmail)) {
      throw new ConflictException('User with this email already exists');
    }

    const user: UserPayload = {
      id: `user-${Date.now()}`,
      email: cleanEmail,
      name: body.name || cleanEmail.split('@')[0],
      role: 'user',
    };

    this.fallbackUsers.push({ ...user, passwordHash });

    return {
      user,
      accessToken: this.generateToken(user),
    };
  }

  async login(body: { email: string; password: string }): Promise<{ user: UserPayload; accessToken: string }> {
    if (!body.email || !body.password) {
      throw new BadRequestException('Email and password required');
    }

    const cleanEmail = body.email.trim().toLowerCase();
    const passwordHash = this.hashPassword(body.password);

    try {
      const user = await this.prisma.user.findUnique({ where: { email: cleanEmail } });
      if (!user || user.password !== passwordHash) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const payload: UserPayload = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };

      return {
        user: payload,
        accessToken: this.generateToken(payload),
      };
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      this.logger.warn(`Prisma login fallback: ${e}`);
    }

    const fallbackUser = this.fallbackUsers.find(
      (u) => u.email === cleanEmail && u.passwordHash === passwordHash,
    );

    if (!fallbackUser) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: UserPayload = {
      id: fallbackUser.id,
      email: fallbackUser.email,
      name: fallbackUser.name,
      role: fallbackUser.role,
    };

    return {
      user: payload,
      accessToken: this.generateToken(payload),
    };
  }
}
