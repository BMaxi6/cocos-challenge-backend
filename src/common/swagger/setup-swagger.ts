import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Cocos Challenge API')
    .setDescription(
      'API REST para consulta de instrumentos, portfolio y gestión de órdenes.',
    )
    .setVersion('1.0')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-USER-ID',
        in: 'header',
        description: 'Simulated authenticated user id',
      },
      'X-USER-ID',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document, {
    useGlobalPrefix: false,
  });
}
