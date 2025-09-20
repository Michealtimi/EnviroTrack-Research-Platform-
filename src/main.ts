// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('EnviroTrack Research Platform')
    .setDescription('API for environmental monitoring (stations + air quality)')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(3000);
  console.log('🚀 Server running on http://localhost:3000');
  console.log('📄 Swagger docs available on http://localhost:3000/docs');
}
bootstrap();
