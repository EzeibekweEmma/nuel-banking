import {
  createSwaggerUiHtml,
  SWAGGER_ASSET_ORIGIN,
  SWAGGER_JSON_PATH,
} from "./swagger";

describe("Swagger UI document", () => {
  const html = createSwaggerUiHtml();

  it("loads pinned Swagger UI assets from the configured CDN", () => {
    expect(html).toContain(
      `${SWAGGER_ASSET_ORIGIN}/npm/swagger-ui-dist@5.32.13/swagger-ui.css`,
    );
    expect(html).toContain("swagger-ui-bundle.js");
    expect(html).toContain("swagger-ui-standalone-preset.js");
    expect(html).not.toContain('href="./docs/swagger-ui.css"');
  });

  it("loads the generated OpenAPI document from the API", () => {
    expect(html).toContain(`url: "/${SWAGGER_JSON_PATH}"`);
    expect(html).toContain("SwaggerUIBundle");
  });
});
