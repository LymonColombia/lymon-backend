import { IsOptional, IsArray, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { RoleAssignment } from '@/domain/user/entities/user.entity';

class RoleAssignmentDto implements RoleAssignment {
  @IsString()
  roleId: string;

  // scope is left as any shape; front-end should follow same pattern
  @IsOptional()
  scope: any;
}

export class UpdateStaffDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleAssignmentDto)
  roleAssignments?: RoleAssignment[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleAssignmentDto)
  addPermissions?: RoleAssignment[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleAssignmentDto)
  removePermissions?: RoleAssignment[];

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  document?: string;
}
