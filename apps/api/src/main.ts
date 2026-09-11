import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { NextFunction, Request, Response } from "express";
import { AppModule } from "./app.module";
import {
  setupSwagger,
  SWAGGER_JSON_PATH,
  SWAGGER_PATH,
} from "./documentation/swagger";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  app.disable("x-powered-by");
  app.use((request: Request, response: Response, next: NextFunction) => {
    const documentationRequest =
      request.path.startsWith(`/${SWAGGER_PATH}`) ||
      request.path === `/${SWAGGER_JSON_PATH}`;
    response.setHeader(
      "Content-Security-Policy",
      documentationRequest
        ? "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self' data:; frame-ancestors 'none'"
        : "default-src 'none'; frame-ancestors 'none'",
    );
    response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    response.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    response.setHeader(
      "Permissions-Policy",
      "camera=(), geolocation=(), microphone=()",
    );
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Frame-Options", "DENY");
    if (config.get<string>("NODE_ENV") === "production") {
      response.setHeader(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains",
      );
    }
    next();
  });
  app.setGlobalPrefix("api");
  app.enableCors({
    origin: config.getOrThrow<string>("FRONTEND_URL"),
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Idempotency-Key",
      "X-Device-Fingerprint",
      "X-Location",
    ],
    exposedHeaders: [
      "Retry-After",
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
    ],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  setupSwagger(app);

  await app.listen(config.getOrThrow<string>("API_PORT"));
}

void bootstrap();
