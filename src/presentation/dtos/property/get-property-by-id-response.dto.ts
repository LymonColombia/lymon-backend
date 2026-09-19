import { ApiProperty } from '@nestjs/swagger';

export class PropertyLocationDto {
  @ApiProperty({ type: Number })
  lat: number;

  @ApiProperty({ type: Number })
  lng: number;
}

export class GetPropertyByIdResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  propertyType: string;

  @ApiProperty()
  address: string;

  @ApiProperty()
  city: string;

  @ApiProperty()
  state: string;

  @ApiProperty()
  country: string;

  @ApiProperty()
  zipCode: string;

  @ApiProperty({ type: () => PropertyLocationDto, nullable: true })
  location: { lat: number; lng: number } | null;

  @ApiProperty()
  checkInTime: string;

  @ApiProperty()
  checkOutTime: string;

  @ApiProperty()
  cancellationPolicy: string;

  @ApiProperty()
  hostPhone: string;

  @ApiProperty()
  hostEmail: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ nullable: true })
  imageUrl: string | null;
}

export class GetPropertyByIdSuccessResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty({ type: () => GetPropertyByIdResponseDto })
  data: GetPropertyByIdResponseDto;
}

export class GetPropertyByIdNotFoundResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty({ nullable: true })
  data: null;
}
