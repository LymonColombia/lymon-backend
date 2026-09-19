export interface WompiWebhookSignature {
  properties: string[];
  checksum: string;
}

export interface WompiWebhookTransactionData {
  id: string;
  amount_in_cents: number;
  reference: string;
  currency: 'COP';
  status: 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR' | 'EXPIRED';
  customer_email?: string | null;
  payment_method_type?: string | null;
  redirect_url?: string | null;
  payment_link_id?: string | null;
  payment_source_id?: string | null;
  shipping_address?: unknown;
}

export interface WompiWebhookData {
  transaction: WompiWebhookTransactionData;
}

export interface WompiWebhookPayload {
  event: string;
  data: WompiWebhookData;
  environment: 'test' | 'prod';
  signature: WompiWebhookSignature;
  timestamp: number;
  sent_at: string;
}
