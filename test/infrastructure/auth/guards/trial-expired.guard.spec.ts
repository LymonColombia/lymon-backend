import { type ExecutionContext, ForbiddenException } from '@nestjs/common';
import { TrialExpiredGuard } from '@/infrastructure/auth/guards/trial-expired.guard';

describe('TrialExpiredGuard', () => {
  const makeContext = (user?: unknown): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  it('allows the request when there is no user (public routes)', () => {
    const guard = new TrialExpiredGuard();

    expect(guard.canActivate(makeContext(undefined))).toBe(true);
  });

  it('allows the request when trialEndsAt is null', () => {
    const guard = new TrialExpiredGuard();

    expect(guard.canActivate(makeContext({ trialEndsAt: null }))).toBe(true);
  });

  it('allows the request when trialEndsAt is in the future', () => {
    const guard = new TrialExpiredGuard();
    const future = new Date(Date.now() + 60_000).toISOString();

    expect(guard.canActivate(makeContext({ trialEndsAt: future }))).toBe(true);
  });

  it('throws ForbiddenException when trialEndsAt is in the past', () => {
    const guard = new TrialExpiredGuard();
    const past = new Date(Date.now() - 60_000).toISOString();

    expect(() => guard.canActivate(makeContext({ trialEndsAt: past }))).toThrow(
      ForbiddenException,
    );
  });
});
