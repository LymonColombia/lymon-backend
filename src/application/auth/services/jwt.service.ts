import { Permission } from '@/domain/role/value-objects/permission.vo';
import { UserScope } from '@/domain/user/entities/user.entity';
import { Injectable } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';

/**
 * Resolved at login time — permissions are embedded in the token
 * so guards never need a DB hit per request.
 */
export interface ResolvedRoleAssignment {
  roleId: string;
  roleName: string;
  permissions: Permission[];
  scope: UserScope;
}

export interface JwtPayload {
  userId: string;
  email: string;
  tenantId: string;
  activePlan: string;
  isOwner: boolean;
  emailVerified: boolean;
  /** Empty array for owners — full access is implied by isOwner flag */
  roleAssignments: ResolvedRoleAssignment[];
  trialEndsAt: string | null;
}

export interface ITokenService {
  generateAccesToken(payload: JwtPayload): string;
  generateRefreshToken(payload: JwtPayload): string;
  verifyToken(token: string): JwtPayload;
}

export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');

@Injectable()
export class JwtTokenService implements ITokenService {
  constructor(private readonly jwtService: NestJwtService) {}
  generateAccesToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, { expiresIn: '15m' });
  }
  generateRefreshToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, { expiresIn: '7d' });
  }
  verifyToken(token: string): JwtPayload {
    return this.jwtService.verify(token);
  }
}
