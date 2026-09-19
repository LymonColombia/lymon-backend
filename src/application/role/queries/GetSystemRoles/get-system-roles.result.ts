import { Permission } from '@/domain/role/value-objects/permission.vo';

export class RoleDto {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly permissions: Permission[],
  ) {}
}

export class GetSystemRolesResult {
  constructor(public readonly roles: RoleDto[]) {}
}
