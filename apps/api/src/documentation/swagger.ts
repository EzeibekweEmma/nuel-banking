import { INestApplication } from "@nestjs/common";
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from "@nestjs/swagger";

export const SWAGGER_PATH = "api/docs";
export const SWAGGER_JSON_PATH = "api/docs-json";

export function createSwaggerDocument(app: INestApplication): OpenAPIObject {
  const configuration = new DocumentBuilder()
    .setTitle("Nuel Bank API")
    .setDescription(
      "REST API for Nuel Bank customer banking, secure transfers, notifications, fraud review, and administration. Protected operations require an access-token JWT.",
    )
    .setVersion("1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Access token returned by the login or registration API.",
      },
      "access-token",
    )
    .addTag("Health", "API and database availability")
    .addTag("Authentication", "Registration, login, recovery, and sessions")
    .addTag("Customers", "Customer profile information")
    .addTag("Accounts", "Account details, balances, and recipient lookup")
    .addTag("Funding", "Controlled demo account deposits")
    .addTag("Transactions", "Transfers, verification, history, and statements")
    .addTag("Beneficiaries", "Saved transfer recipients")
    .addTag("Notifications", "Customer alerts and updates")
    .addTag("Assistant", "Nuel banking assistant")
    .addTag("Administration", "Staff account controls and monitoring")
    .build();

  return SwaggerModule.createDocument(app, configuration);
}

export function setupSwagger(app: INestApplication): void {
  const document = createSwaggerDocument(app);
  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    jsonDocumentUrl: SWAGGER_JSON_PATH,
    customSiteTitle: "Nuel Bank API documentation",
    swaggerOptions: {
      displayRequestDuration: true,
      docExpansion: "list",
      filter: true,
      persistAuthorization: true,
      tryItOutEnabled: true,
    },
  });
}
