import { IEmailService } from '@/application/shared/services/email.service';

export function createEmailServiceMock(): jest.Mocked<IEmailService> {
  return {
    sendEmail: jest.fn(),
    sendVerificationEmail: jest.fn(),
    sendRecoveryEmail: jest.fn(),
    sendLowStockAlertEmail: jest.fn(),
  };
}
