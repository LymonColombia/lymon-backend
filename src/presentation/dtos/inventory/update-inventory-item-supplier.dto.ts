import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ValidateIf, IsString, MinLength } from 'class-validator';

export class UpdateInventoryItemSupplierDto {
  @ApiProperty({ nullable: true, example: 'supplier-id-or-null' })
  @Transform(({ value }: { value: unknown }): unknown =>
    value === '' ? null : value,
  )
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MinLength(1)
  supplierId!: string | null;
}
