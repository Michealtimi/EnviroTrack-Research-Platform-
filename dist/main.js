"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/main.ts
const core_1 = require("@nestjs/core");
const app_module_js_1 = require("./app.module.js");
const swagger_1 = require("@nestjs/swagger");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_js_1.AppModule);
    // Swagger configuration
    const config = new swagger_1.DocumentBuilder()
        .setTitle('EnviroTrack Research Platform')
        .setDescription('API for environmental monitoring (stations + air quality)')
        .setVersion('1.0')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('docs', app, document);
    await app.listen(3000);
    console.log('🚀 Server running on http://localhost:3000');
    console.log('📄 Swagger docs available on http://localhost:3000/docs');
}
bootstrap();
//# sourceMappingURL=main.js.map