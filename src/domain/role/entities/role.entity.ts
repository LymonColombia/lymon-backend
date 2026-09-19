import { Permission } from '@/domain/role/value-objects/permission.vo';

export class RoleId {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static createFromString(value: string): RoleId {
    if (!value || value.trim() === '') {
      throw new Error('RoleId cannot be empty');
    }
    return new RoleId(value);
  }

  toString(): string {
    return this.value;
  }
}

export class Role {
  private constructor(
    private readonly id: RoleId | null,
    private readonly name: string,
    private readonly permissions: Permission[],
    private readonly createdAt: Date,
    private readonly updatedAt: Date,
  ) {}

  /** Create a built-in system role */
  static createSystem(name: string, permissions: Permission[]): Role {
    return new Role(null, name, permissions, new Date(), new Date());
  }

  /** Reconstitute from persistence */
  static reconstitute(
    id: RoleId,
    name: string,
    permissions: Permission[],
    createdAt: Date,
    updatedAt: Date,
  ): Role {
    return new Role(id, name, permissions, createdAt, updatedAt);
  }

  hasPermission(permission: Permission): boolean {
    return this.permissions.includes(permission);
  }

  getId(): RoleId | null {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getPermissions(): Permission[] {
    return [...this.permissions];
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }
}
