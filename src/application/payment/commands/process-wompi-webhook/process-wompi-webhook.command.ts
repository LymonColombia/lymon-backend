import { WompiWebhookPayload } from '../../wompi-webhook.types';

export class ProcessWompiWebhookCommand {
  constructor(public readonly payload: WompiWebhookPayload) {}
}