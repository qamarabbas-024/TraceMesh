import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
  private readonly clients = new Map<string, RateLimitRecord>();
  private readonly WINDOW_MS = 60 * 1000; // 1 minute

  use(req: Request, res: Response, next: NextFunction) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    const isSensitive =
      req.url.startsWith('/auth') ||
      req.url.startsWith('/runs/batch') ||
      req.url.startsWith('/import');

    const maxLimit = isSensitive ? 60 : 200;
    const now = Date.now();
    const key = `${ip}:${isSensitive ? 'sensitive' : 'standard'}`;

    let record = this.clients.get(key);

    if (!record || now > record.resetAt) {
      record = { count: 1, resetAt: now + this.WINDOW_MS };
      this.clients.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, maxLimit - record.count);
    res.setHeader('X-RateLimit-Limit', maxLimit);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000));

    if (record.count > maxLimit) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Maximum ${maxLimit} requests per minute allowed.`,
          retryAfter: Math.ceil((record.resetAt - now) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Periodically clean stale records
    if (this.clients.size > 5000) {
      for (const [k, v] of this.clients.entries()) {
        if (now > v.resetAt) {
          this.clients.delete(k);
        }
      }
    }

    next();
  }
}
