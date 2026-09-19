import { Injectable, Logger } from '@nestjs/common';
import { IMessageBodyProvider } from '@/application/shared/services/message-body-provider.service';

@Injectable()
export class BrevoMessageBodyProvider implements IMessageBodyProvider {
  private readonly logger = new Logger(BrevoMessageBodyProvider.name);

  async getBody(providerMessageId: string): Promise<string | null> {
    this.logger.warn(
      `BrevoMessageBodyProvider.getBody called for ${providerMessageId} — body retrieval requires a paid Brevo plan (not yet implemented)`,
    );
    return null;
  }
}
