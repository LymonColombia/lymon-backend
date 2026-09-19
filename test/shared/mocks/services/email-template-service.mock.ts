import { EmailTemplateService } from '@/infrastructure/common/email-template.service';

export const createEmailTemplateServiceMock =
  (): jest.Mocked<EmailTemplateService> =>
    ({
      resolvePlaceholders: jest.fn(
        (text: string, vars: Record<string, unknown> = {}) => {
          if (!text) return '';
          return text.replace(/\{\{(.+?)\}\}/g, (_match, key: string) => {
            const value = vars[key.trim()];
            if (
              typeof value === 'string' ||
              typeof value === 'number' ||
              typeof value === 'boolean'
            ) {
              return String(value);
            }

            return '';
          });
        },
      ),
      renderTemplate: jest.fn(
        (name: string, vars: Record<string, unknown>) =>
          `<html><body>Template: ${name}, Body: ${typeof vars.body === 'string' || typeof vars.body === 'number' || typeof vars.body === 'boolean' ? String(vars.body) : ''}</body></html>`,
      ),
      renderVerifyEmailTemplate: jest.fn(
        (verificationUrl: string) =>
          `<html><body>Verification: ${verificationUrl}</body></html>`,
      ),
      renderRecoverPasswordTemplate: jest.fn(
        (recoveryUrl: string) =>
          `<html><body>Recovery: ${recoveryUrl}</body></html>`,
      ),
      renderLowStockAlertTemplate: jest.fn(
        (vars: {
          ownerName: string;
          tenantName: string;
          propertyName: string;
          itemName: string;
          itemSku: string;
          currentStock: number;
          minStock: number;
          difference: number;
        }) => `<html><body>Low stock: ${vars.itemName}</body></html>`,
      ),
    }) as unknown as jest.Mocked<EmailTemplateService>;
