export interface EmailRecipient {
  email: string;
  name: string;
}

export interface EmailAttachment {
  url: string;
  name: string;
}

export interface SendEmailParams {
  to: EmailRecipient[];
  subject: string;
  htmlContent: string;
  sender?: EmailRecipient;
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  attachments?: EmailAttachment[];
}

export interface IEmailService {
  sendEmail(params: SendEmailParams): Promise<{ messageId: string }>;
  sendVerificationEmail(email: string, token: string): Promise<void>;
  sendRecoveryEmail(email: string, plainToken: string): Promise<void>;
  sendLowStockAlertEmail(params: SendLowStockAlertEmailParams): Promise<void>;
}

export interface SendLowStockAlertEmailParams {
  ownerEmail: string;
  ownerName: string;
  tenantName: string;
  propertyName: string;
  itemName: string;
  itemSku: string;
  currentStock: number;
  minStock: number;
}

export const EMAIL_SERVICE = Symbol('EMAIL_SERVICE');
