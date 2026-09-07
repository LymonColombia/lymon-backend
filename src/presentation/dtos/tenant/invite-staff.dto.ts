import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsString,
  MinLength,
  ValidateNested,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
  ValidationArguments,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ScopeTypeDto {
  TENANT = 'TENANT',
  PROPERTY = 'PROPERTY',
  UNIT = 'UNIT',
}

@ValidatorConstraint({ name: 'ScopeResourceIds', async: false })
class ScopeResourceIdsConstraint implements ValidatorConstraintInterface {
  validate(resourceIds: unknown, args: ValidationArguments): boolean {
    const scope = args.object as ScopeDto;
    if (scope.type === ScopeTypeDto.TENANT) {
      return resourceIds === undefined || resourceIds === null;
    }
    return (
      Array.isArray(resourceIds) &&
      resourceIds.length > 0 &&
      resourceIds.every((id) => typeof id === 'string')
    );
  }

  defaultMessage(args: ValidationArguments): string {
    const scope = args.object as ScopeDto;
    if (scope.type === ScopeTypeDto.TENANT) {
      return 'resourceIds must not be provided when scope type is TENANT';
    }
    return 'resourceIds must be a non-empty array of strings when scope type is PROPERTY or UNIT';
  }
}

export class ScopeDto {
  @ApiProperty({ enum: ScopeTypeDto, example: 'TENANT' })
  @IsEnum(ScopeTypeDto)
  type: ScopeTypeDto;

  @ApiProperty({
    type: [String],
    required: false,
    example: ['propertyId1', 'propertyId2'],
    description:
      'Required when type is PROPERTY or UNIT. Must be omitted when type is TENANT.',
  })
  @Validate(ScopeResourceIdsConstraint)
  @ValidateIf(
    (scope: ScopeDto) =>
      scope.type !== ScopeTypeDto.TENANT || scope.resourceIds !== undefined,
  )
  resourceIds?: string[];
}

export class RoleAssignmentDto {
  @ApiProperty({
    example: '64a1b2c3-d4e5-f6a7-b8c9-d0e100000000',
    description: 'ID of the role to assign',
  })
  @IsString()
  roleId: string;

  @ApiProperty({
    type: ScopeDto,
    description: 'Scope at which this role applies',
  })
  @ValidateNested()
  @Type(() => ScopeDto)
  scope: ScopeDto;
}

export class InviteStaffDto {
  @ApiProperty({ example: 'staff@hotel.com' })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @ApiProperty({ example: 'SecurePass123!', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  document: string;

  @ApiProperty({
    type: [RoleAssignmentDto],
    description: 'One or more role assignments for the staff member',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleAssignmentDto)
  roleAssignments: RoleAssignmentDto[];
}
