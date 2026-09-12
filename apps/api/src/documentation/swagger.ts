import { INestApplication } from "@nestjs/common";
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from "@nestjs/swagger";
import { Request, Response } from "express";

export const SWAGGER_PATH = "api/docs";
export const SWAGGER_JSON_PATH = "api/docs-json";
export const SWAGGER_ASSET_ORIGIN = "https://cdn.jsdelivr.net";
const SWAGGER_UI_VERSION = "5.32.13";

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
    ui: false,
    raw: ["json"],
    jsonDocumentUrl: SWAGGER_JSON_PATH,
  });

  app
    .getHttpAdapter()
    .get(
      `/${SWAGGER_PATH}`,
      (_request: Request, response: Response) =>
        response.type("text/html").send(createSwaggerUiHtml()),
    );
}

export function createSwaggerUiHtml(): string {
  const assets = `${SWAGGER_ASSET_ORIGIN}/npm/swagger-ui-dist@${SWAGGER_UI_VERSION}`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Nuel Bank API documentation</title>
    <link rel="stylesheet" href="${assets}/swagger-ui.css" />
    <style>
      html { box-sizing: border-box; overflow-y: scroll; }
      *, *::before, *::after { box-sizing: inherit; }
      body { margin: 0; background: #f3f6f4; }
      .swagger-ui .topbar { background: #092d24; padding: 12px 0; }
      .swagger-ui .topbar-wrapper img { display: none; }
      .swagger-ui .topbar-wrapper::before {
        color: #d8f85c;
        content: "Nuel Bank API";
        font-family: system-ui, sans-serif;
        font-size: 18px;
        font-weight: 800;
      }
      .swagger-ui .info .title { color: #18352e; }
      .swagger-ui .btn.authorize { border-color: #087a5b; color: #087a5b; }
      .swagger-ui .btn.authorize svg { fill: #087a5b; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="${assets}/swagger-ui-bundle.js"></script>
    <script src="${assets}/swagger-ui-standalone-preset.js"></script>
    <script>
      window.addEventListener("load", function () {
        window.ui = SwaggerUIBundle({
          url: "/${SWAGGER_JSON_PATH}",
          dom_id: "#swagger-ui",
          deepLinking: true,
          displayRequestDuration: true,
          docExpansion: "list",
          filter: true,
          persistAuthorization: true,
          tryItOutEnabled: true,
          validatorUrl: null,
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIStandalonePreset
          ],
          plugins: [SwaggerUIBundle.plugins.DownloadUrl],
          layout: "StandaloneLayout"
        });
      });
    </script>
  </body>
</html>`;
}
