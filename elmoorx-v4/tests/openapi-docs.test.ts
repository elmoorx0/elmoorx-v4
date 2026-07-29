/**
 * اختبارات OpenAPI + API Docs
 * =============================
 */

import { test } from '../testing/index.mjs';
import { createOpenAPIGenerator, Schema, Response, OpenAPIGenerator } from '../utils/openapi.mjs';
import { generateAPIDocs } from '../utils/api-docs.mjs';

function assert(value, msg) {
  if (value === null || value === undefined || value === false || value === 0 || value === '') {
    throw new Error(msg || 'Assertion failed');
  }
}
function assertFalsy(value, msg) {
  if (value) throw new Error(msg || 'Expected falsy');
}
function assertEquals(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error((msg || '') + ` Expected ${expected}, got ${actual}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OpenAPI Generator Tests
// ─────────────────────────────────────────────────────────────────────────────

test('OpenAPI — basic spec generation', () => {
  const gen = createOpenAPIGenerator({
    title: 'Test API',
    version: '1.0.0',
    description: 'A test API',
  });
  const spec = gen.generate();
  assertEquals(spec.openapi, '3.0.3');
  assertEquals(spec.info.title, 'Test API');
  assertEquals(spec.info.version, '1.0.0');
  assertEquals(spec.info.description, 'A test API');
});

test('OpenAPI — addRoute', () => {
  const gen = createOpenAPIGenerator({ title: 'Test', version: '1.0.0' });
  gen.addRoute({
    method: 'GET',
    path: '/users/:id',
    summary: 'Get user',
    tags: ['users'],
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
    ],
    responses: { 200: { description: 'OK' } },
  });
  const spec = gen.generate();
  assert(spec.paths['/users/{id}']);
  assert(spec.paths['/users/{id}'].get);
  assertEquals(spec.paths['/users/{id}'].get.summary, 'Get user');
  assertEquals(spec.paths['/users/{id}'].get.parameters[0].name, 'id');
});

test('OpenAPI — path parameter conversion', () => {
  const gen = createOpenAPIGenerator({ title: 'Test', version: '1.0.0' });
  gen.addRoute({
    method: 'GET',
    path: '/posts/:slug/comments/:id',
    responses: { 200: { description: 'OK' } },
  });
  const spec = gen.generate();
  assert(spec.paths['/posts/{slug}/comments/{id}']);
});

test('OpenAPI — addSchema', () => {
  const gen = createOpenAPIGenerator({ title: 'Test', version: '1.0.0' });
  gen.addSchema('User', Schema.object({
    id: Schema.integer(),
    name: Schema.string(),
  }));
  const spec = gen.generate();
  assert(spec.components.schemas.User);
  assertEquals(spec.components.schemas.User.type, 'object');
  assert(spec.components.schemas.User.properties.id);
});

test('OpenAPI — addJWTAuth', () => {
  const gen = createOpenAPIGenerator({ title: 'Test', version: '1.0.0' });
  gen.addJWTAuth();
  const spec = gen.generate();
  assert(spec.components.securitySchemes.bearerAuth);
  assertEquals(spec.components.securitySchemes.bearerAuth.type, 'http');
  assertEquals(spec.components.securitySchemes.bearerAuth.scheme, 'bearer');
});

test('OpenAPI — addApiKeyAuth', () => {
  const gen = createOpenAPIGenerator({ title: 'Test', version: '1.0.0' });
  gen.addApiKeyAuth('apiKey', 'X-API-Key');
  const spec = gen.generate();
  assert(spec.components.securitySchemes.apiKey);
  assertEquals(spec.components.securitySchemes.apiKey.type, 'apiKey');
  assertEquals(spec.components.securitySchemes.apiKey.in, 'header');
  assertEquals(spec.components.securitySchemes.apiKey.name, 'X-API-Key');
});

test('OpenAPI — security on route', () => {
  const gen = createOpenAPIGenerator({ title: 'Test', version: '1.0.0' });
  gen.addJWTAuth();
  gen.addRoute({
    method: 'POST',
    path: '/protected',
    security: [{ bearerAuth: [] }],
    responses: { 200: { description: 'OK' } },
  });
  const spec = gen.generate();
  assert(spec.paths['/protected'].post.security);
});

test('OpenAPI — tags collection', () => {
  const gen = createOpenAPIGenerator({ title: 'Test', version: '1.0.0' });
  gen.addRoute({ method: 'GET', path: '/a', tags: ['users'], responses: { 200: { description: 'OK' } } });
  gen.addRoute({ method: 'GET', path: '/b', tags: ['posts'], responses: { 200: { description: 'OK' } } });
  gen.addRoute({ method: 'GET', path: '/c', tags: ['users'], responses: { 200: { description: 'OK' } } });
  const spec = gen.generate();
  const tagNames = spec.tags.map(t => t.name);
  assert(tagNames.includes('users'));
  assert(tagNames.includes('posts'));
});

test('OpenAPI — generateJSON', () => {
  const gen = createOpenAPIGenerator({ title: 'Test', version: '1.0.0' });
  gen.addRoute({ method: 'GET', path: '/test', responses: { 200: { description: 'OK' } } });
  const json = gen.generateJSON();
  assert(typeof json === 'string');
  assert(json.includes('"openapi"'));
  assert(json.includes('"paths"'));
});

test('OpenAPI — generateSwaggerUI', () => {
  const gen = createOpenAPIGenerator({ title: 'Test', version: '1.0.0' });
  const html = gen.generateSwaggerUI();
  assert(html.includes('<!DOCTYPE html>'));
  assert(html.includes('swagger-ui'));
  assert(html.includes('SwaggerUIBundle'));
});

test('OpenAPI — middleware', async () => {
  const gen = createOpenAPIGenerator({ title: 'Test', version: '1.0.0' });
  gen.addRoute({ method: 'GET', path: '/test', responses: { 200: { description: 'OK' } } });
  const mw = gen.middleware();

  // Test /openapi.json
  const ctx1 = {
    url: { pathname: '/openapi.json' },
    res: {
      writeHead: (status, headers) => { ctx1._status = status; ctx1._headers = headers; },
      end: (body) => { ctx1._body = body; },
    },
  };
  const result1 = await mw(ctx1);
  assertFalsy(result1, 'Should return false for /openapi.json');
  assertEquals(ctx1._status, 200);
  assert(ctx1._headers['Content-Type'].includes('application/json'));
  assert(ctx1._body.includes('"openapi"'));

  // Test /docs
  const ctx2 = {
    url: { pathname: '/docs' },
    res: {
      writeHead: (status, headers) => { ctx2._status = status; ctx2._headers = headers; },
      end: (body) => { ctx2._body = body; },
    },
  };
  const result2 = await mw(ctx2);
  assertFalsy(result2, 'Should return false for /docs');
  assertEquals(ctx2._status, 200);
  assert(ctx2._body.includes('<!DOCTYPE html>'));

  // Test other path
  const ctx3 = {
    url: { pathname: '/other' },
    res: { writeHead: () => {}, end: () => {} },
  };
  const result3 = await mw(ctx3);
  assert(result3, 'Should return true for other paths');
});

test('OpenAPI — Schema helpers', () => {
  assertEquals(Schema.string().type, 'string');
  assertEquals(Schema.integer().type, 'integer');
  assertEquals(Schema.boolean().type, 'boolean');
  assertEquals(Schema.array(Schema.string()).type, 'array');
  assertEquals(Schema.array(Schema.string()).items.type, 'string');
  assertEquals(Schema.object({ a: Schema.string() }).type, 'object');
  assertEquals(Schema.ref('User').$ref, '#/components/schemas/User');
  assertEquals(Schema.enum(['a', 'b']).enum.length, 2);
  assertEquals(Schema.date().format, 'date-time');
  assertEquals(Schema.email().format, 'email');
  assertEquals(Schema.uuid().format, 'uuid');
});

test('OpenAPI — Response helpers', () => {
  const r1 = Response.ok('Success', Schema.string());
  assert(r1[200]);
  assertEquals(r1[200].description, 'Success');

  const r2 = Response.created('Created', Schema.ref('User'));
  assert(r2[201]);

  const r3 = Response.noContent();
  assert(r3[204]);

  const r4 = Response.badRequest();
  assert(r4[400]);

  const r5 = Response.unauthorized();
  assert(r5[401]);

  const r6 = Response.forbidden();
  assert(r6[403]);

  const r7 = Response.notFound();
  assert(r7[404]);

  const r8 = Response.serverError();
  assert(r8[500]);

  const combined = Response.combine(r1, r4, r7);
  assert(combined[200]);
  assert(combined[400]);
  assert(combined[404]);
});

// ─────────────────────────────────────────────────────────────────────────────
// API Docs (Markdown) Tests
// ─────────────────────────────────────────────────────────────────────────────

test('API Docs — basic generation', () => {
  const routes = [
    {
      method: 'GET',
      path: '/users',
      summary: 'List users',
      tags: ['users'],
      responses: { 200: { description: 'OK' } },
    },
  ];
  const md = generateAPIDocs(routes, { title: 'Test API', version: '1.0.0' });
  assert(md.includes('# Test API'));
  assert(md.includes('1.0.0'));
  assert(md.includes('GET /users'));
  assert(md.includes('List users'));
});

test('API Docs — table of contents', () => {
  const routes = [
    { method: 'GET', path: '/users', tags: ['users'], responses: { 200: { description: 'OK' } } },
    { method: 'POST', path: '/users', tags: ['users'], responses: { 201: { description: 'Created' } } },
    { method: 'GET', path: '/posts', tags: ['posts'], responses: { 200: { description: 'OK' } } },
  ];
  const md = generateAPIDocs(routes, { title: 'Test' });
  assert(md.includes('Table of Contents'));
  assert(md.includes('### users'));
  assert(md.includes('### posts'));
});

test('API Docs — parameters table', () => {
  const routes = [
    {
      method: 'GET',
      path: '/users/:id',
      tags: ['users'],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'User ID' },
        { name: 'page', in: 'query', schema: { type: 'integer' }, description: 'Page' },
      ],
      responses: { 200: { description: 'OK' } },
    },
  ];
  const md = generateAPIDocs(routes, { title: 'Test' });
  assert(md.includes('| Name | In | Type | Required |'));
  assert(md.includes('id'));
  assert(md.includes('User ID'));
  assert(md.includes('path'));
});

test('API Docs — request body example', () => {
  const routes = [
    {
      method: 'POST',
      path: '/users',
      tags: ['users'],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object', properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
        } } } },
      },
      responses: { 201: { description: 'Created' } },
    },
  ];
  const md = generateAPIDocs(routes, { title: 'Test' });
  assert(md.includes('Request Body'));
  assert(md.includes('```json'));
  assert(md.includes('user@example.com'));
});

test('API Docs — curl example', () => {
  const routes = [
    { method: 'GET', path: '/users', tags: ['users'], responses: { 200: { description: 'OK' } } },
  ];
  const md = generateAPIDocs(routes, { title: 'Test', baseUrl: 'https://api.test.com' });
  assert(md.includes('curl'));
  assert(md.includes('-X GET'));
  assert(md.includes('https://api.test.com/users'));
});

test('API Docs — JavaScript fetch example', () => {
  const routes = [
    { method: 'POST', path: '/users', tags: ['users'],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' } } } } } },
      responses: { 201: { description: 'Created' } } },
  ];
  const md = generateAPIDocs(routes, { title: 'Test' });
  assert(md.includes('fetch('));
  assert(md.includes("method: 'POST'"));
  assert(md.includes('JSON.stringify'));
});

test('API Docs — Python requests example', () => {
  const routes = [
    { method: 'GET', path: '/users', tags: ['users'], responses: { 200: { description: 'OK' } } },
  ];
  const md = generateAPIDocs(routes, { title: 'Test' });
  assert(md.includes('import requests'));
  assert(md.includes('requests.get'));
});

test('API Docs — authentication section', () => {
  const routes = [
    { method: 'GET', path: '/users', tags: ['users'], responses: { 200: { description: 'OK' } } },
  ];
  const md = generateAPIDocs(routes, { title: 'Test', authScheme: 'bearer' });
  assert(md.includes('Authentication'));
  assert(md.includes('Bearer'));
  assert(md.includes('Authorization'));
});

test('API Docs — schemas section', () => {
  const routes = [
    {
      method: 'GET',
      path: '/users',
      tags: ['users'],
      responses: {
        200: {
          description: 'OK',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
        },
      },
    },
  ];
  const md = generateAPIDocs(routes, { title: 'Test' });
  assert(md.includes('Schemas'));
  assert(md.includes('User'));
});

console.log('\n  ✦ OpenAPI + API Docs Tests — loaded');
