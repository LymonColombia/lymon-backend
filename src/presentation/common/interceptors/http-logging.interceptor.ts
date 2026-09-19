import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { enterRequestAuditContext } from '@/infrastructure/audit/request-audit-context';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const { method, url } = req;
    const start = Date.now();

    enterRequestAuditContext({
      ipAddress: this.getRequestIp(req),
    });

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - start;
        this.logger.log(`${method} ${url} - ${res.statusCode} - ${ms}ms`);
      }),
      catchError((err: unknown) => {
        const ms = Date.now() - start;
        const status =
          err instanceof Error && 'status' in err
            ? (err as { status: number }).status
            : 500;
        const message = err instanceof Error ? err.message : 'Unknown error';

        if (status >= 500) {
          this.logger.error(
            `${method} ${url} - ${status} - ${ms}ms | ${message}`,
          );
        } else {
          this.logger.warn(
            `${method} ${url} - ${status} - ${ms}ms | ${message}`,
          );
        }

        return throwError(() => err);
      }),
    );
  }

  private getRequestIp(request: Request): string | undefined {
    const candidates = [
      ...this.extractForwardedForValues(
        this.getHeaderValue(request.headers['x-forwarded-for']),
      ),
      ...this.extractForwardedHeaderValues(
        this.getHeaderValue(request.headers['forwarded']),
      ),
      this.getHeaderValue(request.headers['x-real-ip'])?.trim(),
      this.getHeaderValue(request.headers['x-client-ip'])?.trim(),
      this.getHeaderValue(request.headers['x-original-forwarded-for'])?.trim(),
      this.getHeaderValue(request.headers['cf-connecting-ip'])?.trim(),
      ...(request.ips ?? []),
      request.ip,
      request.socket.remoteAddress,
    ]
      .filter(
        (value): value is string =>
          typeof value === 'string' && value.trim() !== '',
      )
      .map((value) => this.normalizeIp(value.trim()));

    const nonLoopbackIp = candidates.find((ip) => !this.isLoopbackIp(ip));
    return nonLoopbackIp ?? candidates[0];
  }

  private getHeaderValue(
    value: string | string[] | undefined,
  ): string | undefined {
    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }

  private normalizeIp(ip: string): string {
    return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  }

  private isLoopbackIp(ip: string): boolean {
    return ip === '::1' || ip === '127.0.0.1' || ip === 'localhost';
  }

  private extractForwardedForValues(value: string | undefined): string[] {
    if (!value) {
      return [];
    }

    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  private extractForwardedHeaderValues(value: string | undefined): string[] {
    if (!value) {
      return [];
    }

    return value
      .split(',')
      .map((entry) => entry.trim())
      .flatMap((entry) => {
        const match = new RegExp(/for=(?:"?\[?)([^";\]]+)(?:\]?"?)/i).exec(
          entry,
        );
        return match?.[1] ? [match[1]] : [];
      });
  }
}
