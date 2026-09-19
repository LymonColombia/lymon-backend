import { IMessageBodyProvider } from '@/application/shared/services/message-body-provider.service';

export function createMessageBodyProviderMock(): jest.Mocked<IMessageBodyProvider> {
  return {
    getBody: jest.fn(),
  };
}
