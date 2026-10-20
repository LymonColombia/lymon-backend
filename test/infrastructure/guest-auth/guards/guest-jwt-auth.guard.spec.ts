import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GuestJwtAuthGuard } from '@/infrastructure/guest-auth/guards/guest-jwt-auth.guard';

describe('GuestJwtAuthGuard', () => {
  const makeContext = () =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
    }) as unknown as ExecutionContext;

  it('returns true for public routes', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(true),
    } as unknown as Reflector;

    const guard = new GuestJwtAuthGuard(reflector);

    expect(guard.canActivate(makeContext())).toBe(true);
  });

  it('throws when guest context is missing', () => {
    const reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as Reflector;

    const guard = new GuestJwtAuthGuard(reflector);

    expect(() => {
      guard.handleRequest(null, null);
    }).toThrow(UnauthorizedException);
  });

  it('returns user when request is valid', () => {
    const reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as Reflector;

    const guard = new GuestJwtAuthGuard(reflector);
    const user = { guestAccountId: '65f1a1a2-b3c4-d5e6-f7a8-b9c500000000' };

    expect(guard.handleRequest(null, user)).toEqual(user);
  });
});
