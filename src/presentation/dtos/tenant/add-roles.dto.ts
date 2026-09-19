import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RoleAssignment } from '@/domain/user/entities/user.entity';

class RoleAssignmentDto implements RoleAssignment {
  roleId: string;
  scope: any;
}

export class AddRolesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleAssignmentDto)
  roleAssignments!: RoleAssignment[];
}
