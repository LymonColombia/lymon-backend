export interface IMessageBodyProvider {
  getBody(providerMessageId: string): Promise<string | null>;
}

export const MESSAGE_BODY_PROVIDER = Symbol('MESSAGE_BODY_PROVIDER');
