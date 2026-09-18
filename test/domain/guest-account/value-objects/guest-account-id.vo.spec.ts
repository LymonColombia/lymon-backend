import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';

describe('GuestAccountId value object', () => {
  it('creates id from valid string', () => {
    const id = GuestAccountId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c200000000');
    expect(id.toString()).toBe('65f1a1a2-b3c4-d5e6-f7a8-b9c200000000');
  });

  it('throws for empty value', () => {
    expect(() => GuestAccountId.createFromString('')).toThrow(
      'GuestAccountId cannot be empty',
    );
  });

  it('equals returns true for same value', () => {
    const a = GuestAccountId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c200000000');
    const b = GuestAccountId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c200000000');
    expect(a.equals(b)).toBe(true);
  });

  it('equals returns false for different values', () => {
    const a = GuestAccountId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c200000000');
    const b = GuestAccountId.createFromString('guest-456');
    expect(a.equals(b)).toBe(false);
  });
});
