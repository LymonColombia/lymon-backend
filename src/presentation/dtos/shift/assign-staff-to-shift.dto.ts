import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class AssignStaffToShiftDto {
  @ApiProperty({
    example: ['680c79f3-8b4f-98f4-f638-3b1200000000', '680c79f3-8b4f-98f4-f638-3b1400000000'],
    description: 'Staff member IDs to assign to the shift (additive)',
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  staffMemberIds!: string[];
}
