import { Body, Controller, Post } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@/infrastructure/auth/decorators/current-user.decorator';
import { type JwtPayload } from '@/application/auth/services/jwt.service';
import { GeneratePresignedUrlDto } from '@/presentation/dtos/generate-presigned-url.dto';
import { GeneratePresignedUrlQuery } from '@/application/storage/queries/generate-presigned-url/generate-presigned-url.query';
import { GeneratePresignedUrlResult } from '@/application/storage/queries/generate-presigned-url/generate-presigned-url.result';

@ApiTags('storage')
@ApiBearerAuth('JWT-auth')
@Controller('storage')
export class StorageController {
  constructor(private readonly queryBus: QueryBus) {}

  @Post('presigned-url')
  @ApiOperation({
    summary: 'Generate a presigned R2 URL for direct file upload',
  })
  @ApiResponse({
    status: 201,
    description: 'Presigned URL generated successfully',
  })
  async generatePresignedUrl(
    @CurrentUser() user: JwtPayload,
    @Body() dto: GeneratePresignedUrlDto,
  ) {
    const result = await this.queryBus.execute<
      GeneratePresignedUrlQuery,
      GeneratePresignedUrlResult
    >(
      new GeneratePresignedUrlQuery(
        dto.fileName,
        dto.contentType,
        dto.fileSize,
        user.tenantId,
        dto.category,
      ),
    );

    return {
      message: 'Presigned URL generated',
      data: {
        presignedUrl: result.presignedUrl,
        fileUrl: result.fileUrl,
        key: result.key,
      },
    };
  }
}
