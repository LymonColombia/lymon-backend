import { Email } from '@/domain/shared/value-objects/email.vo';

export interface CreateGuestAccountParams {
  fullName: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  email: Email;
  passwordHash: string;
}
