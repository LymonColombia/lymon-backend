import { Body, Controller, Headers, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';
import { Public } from '@/infrastructure/auth/decorators/public.decorator';
import { ProcessWompiWebhookCommand } from '@/application/payment/commands/process-wompi-webhook/process-wompi-webhook.command';
import type { WompiWebhookPayload } from '@/application/payment/wompi-webhook.types';

@Public()
@Controller('payments/wompi')
export class WompiWebhookController {
  private readonly eventSecret: string;

  constructor(
    private readonly commandBus: CommandBus,
    configService: ConfigService,
  ) {
    const secret = configService.get<string>('WOMPI_EVENT_SECRET');
    if (!secret || secret.trim() === '') {
      throw new Error(
        'WOMPI_EVENT_SECRET environment variable is not configured. Please add WOMPI_EVENT_SECRET to your .env file.',
      );
    }

    this.eventSecret = secret;
  }

  @Post('webhook')
  async receiveEvent(
    @Body() payload: WompiWebhookPayload,
    @Headers('x-event-checksum') headerChecksum?: string,
  ): Promise<{ accepted: true; processed: boolean }> {
    if (!this.isValidChecksum(payload, headerChecksum)) {
      return { accepted: true, processed: false };
    }

    await this.commandBus.execute(new ProcessWompiWebhookCommand(payload));
    return { accepted: true, processed: true };
  }

  private isValidChecksum(
    payload: WompiWebhookPayload,
    headerChecksum?: string,
  ): boolean {
    const providedChecksum =
      headerChecksum?.trim() || payload.signature?.checksum?.trim();

    if (!providedChecksum || !payload.signature?.properties?.length) {
      return false;
    }

    const concatenated = payload.signature.properties
      .map((property) => this.resolvePropertyValue(payload, property))
      .join('')
      .concat(String(payload.timestamp), this.eventSecret);

    const calculatedChecksum = createHash('sha256')
      .update(concatenated)
      .digest('hex');

    const expected = Buffer.from(calculatedChecksum.toLowerCase(), 'utf8');
    const provided = Buffer.from(providedChecksum.toLowerCase(), 'utf8');

    if (expected.length !== provided.length) {
      return false;
    }

    return timingSafeEqual(expected, provided);
  }

  private resolvePropertyValue(
    payload: WompiWebhookPayload,
    propertyPath: string,
  ): string {
    const value = propertyPath.split('.').reduce<unknown>(
      (current, key) => {
        if (current === null || current === undefined) {
          return undefined;
        }

        return (current as Record<string, unknown>)[key];
      },
      payload as unknown as Record<string, unknown>,
    );

    if (value === null || value === undefined) {
      return '';
    }

    return String(value);
  }
}
