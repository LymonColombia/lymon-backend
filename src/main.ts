import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationError } from 'class-validator';
import { Request, Response, NextFunction } from 'express';
import { DomainExceptionFilter } from './presentation/common/filters/domain-exception.filter';
import { HttpLoggingInterceptor } from './presentation/common/interceptors/http-logging.interceptor';

function flattenValidationErrors(errors: ValidationError[]): string[] {
  return errors.flatMap((error) => {
    const messages = Object.values(error.constraints ?? {});
    const childMessages = error.children?.length
      ? flattenValidationErrors(error.children)
      : [];
    return [...messages, ...childMessages];
  });
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Habilitar CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Security headers
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
  });

  // Filtro global para errores de dominio
  app.useGlobalFilters(new DomainExceptionFilter());

  // Logging HTTP global
  app.useGlobalInterceptors(new HttpLoggingInterceptor());

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          statusCode: 400,
          message: flattenValidationErrors(errors),
          error: 'Bad Request',
        }),
    }),
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const isDevelopment = configService.get<string>('isDevelopment') === 'true';

  if (isDevelopment) {
    const config = new DocumentBuilder()
      .setTitle('Lymon Hotel API')
      .setDescription(
        'API para la gestión hotelera - Autenticación, Hoteles y Habitaciones',
      )
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Ingresa tu token JWT (sin la palabra Bearer)',
          in: 'header',
        },
        'JWT-auth',
      )
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT de cuenta de huésped',
          in: 'header',
        },
        'GuestJWT-auth',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      explorer: true,
      jsonDocumentUrl: 'api/docs-json',
      yamlDocumentUrl: 'api/docs-yaml',
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
    logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
    logger.log(`Swagger JSON: http://localhost:${port}/api/docs-json`);
  }

  await app.listen(port);
  logger.log(`Application running on: http://localhost:${port}`);
}
void bootstrap();
