export const EMAIL_WEBHOOK_VERIFIER = Symbol('IEmailWebhookVerifier');

export interface IEmailWebhookVerifier {
  verify(rawBody: Buffer, signature: string): boolean;
}
