import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '@/infrastructure/auth/guards/jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const makeContext = (): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
    }) as unknown as ExecutionContext;

  it('returns true for public routes', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(true),
    } as unknown as Reflector;

    const guard = new JwtAuthGuard(reflector);
    const context = makeContext();

    expect(guard.canActivate(context)).toBe(true);
  });

  it('delegates to parent canActivate for non-public routes', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;

    const guard = new JwtAuthGuard(reflector);
    const context = makeContext();

    const parentProto = Object.getPrototypeOf(JwtAuthGuard.prototype) as {
      canActivate: (ctx: any) => boolean;
    };
    const superSpy = jest
      .spyOn(parentProto, 'canActivate')
      .mockReturnValue(true);

    expect(guard.canActivate(context)).toBe(true);
    expect(superSpy).toHaveBeenCalledWith(context);

    superSpy.mockRestore();
  });

  it('throws when user context is missing', () => {
    const reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as Reflector;

    const guard = new JwtAuthGuard(reflector);

    expect(() => {
      guard.handleRequest(null, null);
    }).toThrow(UnauthorizedException);
  });

  it('returns user when request is valid', () => {
    const reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as Reflector;

    const guard = new JwtAuthGuard(reflector);
    const user = { userId: 'u1' };

    expect(guard.handleRequest(null, user)).toEqual(user);
  });
});
