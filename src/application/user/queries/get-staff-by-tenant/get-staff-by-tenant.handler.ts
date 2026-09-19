import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetStaffByTenantQuery } from './get-staff-by-tenant.query';
import {
  GetStaffByTenantResult,
  StaffDto,
  StaffScopeDto,
} from './get-staff-by-tenant.result';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@/domain/user/repositories/user.repository';
import {
  PROPERTY_REPOSITORY,
  type PropertyRepository,
} from '@/domain/property/repositories/property.repository';
import {
  UNIT_REPOSITORY,
  type UnitRepository,
} from '@/domain/unit/repositories/unit.repository';
import type { UserScope } from '@/domain/user/entities/user.entity';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

@QueryHandler(GetStaffByTenantQuery)
export class GetStaffByTenantHandler implements IQueryHandler<
  GetStaffByTenantQuery,
  GetStaffByTenantResult
> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepository: PropertyRepository,
    @Inject(UNIT_REPOSITORY)
    private readonly unitRepository: UnitRepository,
  ) {}

  async execute(query: GetStaffByTenantQuery): Promise<GetStaffByTenantResult> {
    let tid: TenantId;
    try {
      tid = TenantId.createFromString(query.tenantId);
    } catch {
      return { items: [] };
    }

    const users = await this.userRepository.findByTenantId(tid);
    const properties = await this.propertyRepository.findByTenantId(tid);
    const units = await this.unitRepository.findByTenantId(tid);

    const propertyNameById = new Map(
      properties.map((property) => [
        property.getId()?.toString() ?? '',
        property.getName(),
      ]),
    );
    const unitNameById = new Map(
      units.map((unit) => [unit.getId()?.toString() ?? '', unit.getName()]),
    );

    const items: StaffDto[] = users
      .filter((u) => !u.isOwner())
      .map((u) => ({
        id: u.getId()?.toString() ?? '',
        email: u.getEmail().toString(),
        createdAt: u.getCreatedAt().toISOString(),
        fullName: u.getFullName(),
        document: u.getDocument(),
        isOwner: u.isOwner(),
        emailVerified: u.isEmailVerified(),
        roleAssignments: u.getRoleAssignments().map((assignment) => ({
          roleId: assignment.roleId,
          scope: this.mapScope(
            assignment.scope,
            propertyNameById,
            unitNameById,
          ),
        })),
      }));

    return { items };
  }

  private mapScope(
    scope: UserScope,
    propertyNameById: Map<string, string>,
    unitNameById: Map<string, string>,
  ): StaffScopeDto {
    if (scope.type === 'TENANT') {
      return { type: 'TENANT' };
    }

    if (scope.type === 'UNIT') {
      return {
        type: 'UNIT',
        resourceIds: [...scope.resourceIds],
        resources: scope.resourceIds
          .map((id) => {
            const name = unitNameById.get(id);
            if (!name) return null;
            return { id, name };
          })
          .filter(
            (resource): resource is { id: string; name: string } =>
              resource !== null,
          ),
      };
    }

    return {
      type: 'PROPERTY',
      resourceIds: [...scope.resourceIds],
      resources: scope.resourceIds
        .map((id) => {
          const name = propertyNameById.get(id);
          if (!name) return null;
          return { id, name };
        })
        .filter(
          (resource): resource is { id: string; name: string } =>
            resource !== null,
        ),
    };
  }
}
