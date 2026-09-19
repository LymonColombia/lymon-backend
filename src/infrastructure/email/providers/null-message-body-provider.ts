import { Injectable } from '@nestjs/common';
import { IMessageBodyProvider } from '@/application/shared/services/message-body-provider.service';

@Injectable()
export class NullMessageBodyProvider implements IMessageBodyProvider {
  async getBody(_providerMessageId: string): Promise<string | null> {
    return null;
  }
}
