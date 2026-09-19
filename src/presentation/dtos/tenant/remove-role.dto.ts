import { IsOptional } from 'class-validator';

export class RemoveRoleDto {
  // optional scope to disambiguate which assignment to remove
  @IsOptional()
  scope?: any;
}
