/**
 * Elmoorx v4 — OpenAPI/Swagger Spec Generator (بدون تبعيات)
 * =========================================================
 * يُولّد مواصفات OpenAPI 3.0 تلقائياً من تعريفات الـ API routes.
 *
 * المميزات:
 *   - توليد OpenAPI 3.0 spec من route definitions
 *   - دعم path parameters, query parameters, request bodies, responses
 *   - دعم authentication (JWT, API key)
 *   - Schema definitions (ref-based)
 *   - Swagger UI endpoint (HTML)
 *   - Validation helpers
 *
 * الاستخدام:
 *   import { OpenAPIGenerator } from './openapi.mjs';
 *   const gen = new OpenAPIGenerator({
 *     title: 'My API',
 *     version: '1.0.0',
 *   });
 *   gen.addRoute({
 *     method: 'GET',
 *     path: '/users/:id',
 *     summary: 'Get user by ID',
 *     parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
 *     responses: { 200: { description: 'User found', schema: { $ref: '#/components/schemas/User' } } },
 *   });
 *   const spec = gen.generate();
 *   // أو Swagger UI:
 *   const html = gen.generateSwaggerUI();
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1) OPENAPI GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

export class OpenAPIGenerator {
  constructor(options = {}) {
    this.info = {
      title: options.title || 'Elmoorx API',
      version: options.version || '1.0.0',
      description: options.description || '',
      contact: options.contact || null,
      license: options.license || null,
    };
    this.servers = options.servers || [];
    this.routes = [];
    this.schemas = {};
    this.securitySchemes = {};
    this.tags = new Set();
  }

  /**
   * يضيف route للـ spec
   */
  addRoute(route) {
    const {
      method,
      path,
      summary = '',
      description = '',
      tags = [],
      parameters = [],
      requestBody = null,
      responses = {},
      security = null,
      deprecated = false,
      operationId = null,
    } = route;

    // حوّل path مع :param إلى {param}
    const openapiPath = path.replace(/:(\w+)/g, '{$1}');

    for (const tag of tags) this.tags.add(tag);

    this.routes.push({
      method: method.toLowerCase(),
      path: openapiPath,
      operation: {
        tags,
        summary,
        description,
        operationId: operationId || `${method.toLowerCase()}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`,
        parameters,
        requestBody,
        responses,
        security: security ? security : undefined,
        deprecated: deprecated || undefined,
      },
    });

    return this;
  }

  /**
   * يضيف schema definition
   */
  addSchema(name, schema) {
    this.schemas[name] = schema;
    return this;
  }

  /**
   * يضيف security scheme (JWT, API key, etc.)
   */
  addSecurityScheme(name, scheme) {
    this.securitySchemes[name] = scheme;
    return this;
  }

  /**
   * يضيف JWT bearer auth
   */
  addJWTAuth(name = 'bearerAuth') {
    this.securitySchemes[name] = {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    };
    return this;
  }

  /**
   * يضيف API key auth
   */
  addApiKeyAuth(name = 'apiKey', headerName = 'X-API-Key') {
    this.securitySchemes[name] = {
      type: 'apiKey',
      in: 'header',
      name: headerName,
    };
    return this;
  }

  /**
   * يُولّد OpenAPI 3.0 spec كـ JavaScript object
   */
  generate() {
    const paths = {};
    for (const route of this.routes) {
      if (!paths[route.path]) paths[route.path] = {};
      paths[route.path][route.method] = route.operation;
    }

    const spec = {
      openapi: '3.0.3',
      info: this.info,
      servers: this.servers.length > 0 ? this.servers : undefined,
      paths,
      components: {
        schemas: Object.keys(this.schemas).length > 0 ? this.schemas : undefined,
        securitySchemes: Object.keys(this.securitySchemes).length > 0 ? this.securitySchemes : undefined,
      },
      tags: [...this.tags].map(name => ({ name })),
    };

    // إزالة undefined
    return JSON.parse(JSON.stringify(spec));
  }

  /**
   * يُولّد OpenAPI spec كـ JSON string
   */
  generateJSON(pretty = true) {
    return pretty ? JSON.stringify(this.generate(), null, 2) : JSON.stringify(this.generate());
  }

  /**
   * يُولّد Swagger UI HTML page
   */
  generateSwaggerUI(specPath = '/openapi.json') {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${this.info.title} — API Documentation</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
  <style>
    body { margin: 0; }
    .swagger-ui .topbar { background: #0ea5e9; }
    .swagger-ui .topbar .download-url-wrapper { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        url: '${specPath}',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis],
        layout: 'BaseLayout',
        operationsSorter: 'alpha',
        tagsSorter: 'alpha',
      });
    };
  </script>
</body>
</html>`;
  }

  /**
   * ميدلوير لخدمة OpenAPI spec + Swagger UI
   */
  middleware(options = {}) {
    const {
      specPath = '/openapi.json',
      uiPath = '/docs',
    } = options;

    return async (ctx) => {
      const path = ctx.url.pathname;

      if (path === specPath) {
        const spec = this.generateJSON();
        ctx.res.writeHead(200, {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        });
        ctx.res.end(spec);
        return false;
      }

      if (path === uiPath || path === uiPath + '/') {
        const html = this.generateSwaggerUI(specPath);
        ctx.res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        ctx.res.end(html);
        return false;
      }

      return true;
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) SCHEMA BUILDERS (helpers)
// ─────────────────────────────────────────────────────────────────────────────

export const Schema = {
  string: (opts = {}) => ({ type: 'string', ...opts }),
  integer: (opts = {}) => ({ type: 'integer', ...opts }),
  number: (opts = {}) => ({ type: 'number', ...opts }),
  boolean: (opts = {}) => ({ type: 'boolean', ...opts }),
  array: (items, opts = {}) => ({ type: 'array', items, ...opts }),
  object: (properties, opts = {}) => ({ type: 'object', properties, ...opts }),
  ref: (name) => ({ $ref: `#/components/schemas/${name}` }),
  enum: (values, opts = {}) => ({ type: 'string', enum: values, ...opts }),
  date: (opts = {}) => ({ type: 'string', format: 'date-time', ...opts }),
  email: (opts = {}) => ({ type: 'string', format: 'email', ...opts }),
  uuid: (opts = {}) => ({ type: 'string', format: 'uuid', ...opts }),
  url: (opts = {}) => ({ type: 'string', format: 'uri', ...opts }),
};

// ─────────────────────────────────────────────────────────────────────────────
// 3) RESPONSE BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

export const Response = {
  ok: (description, schema) => ({
    200: { description, content: schema ? { 'application/json': { schema } } : undefined },
  }),
  created: (description, schema) => ({
    201: { description, content: schema ? { 'application/json': { schema } } : undefined },
  }),
  noContent: (description = 'No content') => ({
    204: { description },
  }),
  badRequest: (description = 'Bad request') => ({
    400: { description },
  }),
  unauthorized: (description = 'Unauthorized') => ({
    401: { description },
  }),
  forbidden: (description = 'Forbidden') => ({
    403: { description },
  }),
  notFound: (description = 'Not found') => ({
    404: { description },
  }),
  serverError: (description = 'Internal server error') => ({
    500: { description },
  }),
  combine: (...responses) => Object.assign({}, ...responses),
};

// ─────────────────────────────────────────────────────────────────────────────
// 4) FACTORY
// ─────────────────────────────────────────────────────────────────────────────

export function createOpenAPIGenerator(options = {}) {
  return new OpenAPIGenerator(options);
}

export default { OpenAPIGenerator, createOpenAPIGenerator, Schema, Response };
