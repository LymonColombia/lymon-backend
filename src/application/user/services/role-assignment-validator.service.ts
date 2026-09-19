import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  PROPERTY_REPOSITORY,
  type PropertyRepository,
} from '@/domain/property/repositories/property.repository';
import {
  UNIT_REPOSITORY,
  type UnitRepository,
} from '@/domain/unit/repositories/unit.repository';
import {
  ROLE_REPOSITORY,
  type RoleRepository,
} from '@/domain/role/repositories/role.repository';
import { RoleId } from '@/domain/role/entities/role.entity';
import { RoleAssignment } from '@/domain/user/entities/user.entity';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

@Injectable()
export class RoleAssignmentValidator {
  constructor(
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepository: PropertyRepository,
    @Inject(UNIT_REPOSITORY)
    private readonly unitRepository: UnitRepository,
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: RoleRepository,
  ) {}

  async validate(
    assignments: RoleAssignment[],
    tenantId: string,
  ): Promise<void> {
    let validPropertyIds: Set<string> | null = null;
    let validUnitIds: Set<string> | null = null;

    for (const assignment of assignments) {
      const roleId = RoleId.createFromString(assignment.roleId);
      const role = await this.roleRepository.findById(roleId);
      if (!role) {
        throw new BadRequestException(
          `Role '${assignment.roleId}' does not exist`,
        );
      }

      if (assignment.scope.type === 'PROPERTY') {
        validPropertyIds = await this.validatePropertyScope(
          assignment.scope.resourceIds,
          tenantId,
          validPropertyIds,
        );
      }

      if (assignment.scope.type === 'UNIT') {
        validUnitIds = await this.validateUnitScope(
          assignment.scope.resourceIds,
          tenantId,
          validUnitIds,
        );
      }
    }
  }

  private async validatePropertyScope(
    resourceIds: string[],
    tenantId: string,
    cache: Set<string> | null,
  ): Promise<Set<string>> {
    if (!cache) {
      const tid = TenantId.createFromString(tenantId);
      const properties = await this.propertyRepository.findByTenantId(tid);
      cache = new Set(properties.map((p) => p.getId()!.toString()));
    }
    const invalid = resourceIds.filter((id) => !cache.has(id));
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Property IDs not found in this tenant: ${invalid.join(', ')}`,
      );
    }
    return cache;
  }

  private async validateUnitScope(
    resourceIds: string[],
    tenantId: string,
    cache: Set<string> | null,
  ): Promise<Set<string>> {
    if (!cache) {
      const tid = TenantId.createFromString(tenantId);
      const units = await this.unitRepository.findByTenantId(tid);
      cache = new Set(units.map((u) => u.getId()!.toString()));
    }
    const invalid = resourceIds.filter((id) => !cache.has(id));
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Unit IDs not found in this tenant: ${invalid.join(', ')}`,
      );
    }
    return cache;
  }
}
