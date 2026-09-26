import { Injectable } from '@nestjs/common';
import { IMessageBodyProvider } from '@/application/shared/services/message-body-provider.service';

@Injectable()
export class NullMessageBodyProvider implements IMessageBodyProvider {
  getBody(): Promise<string | null> {
    return Promise.resolve(null);
  }
}
