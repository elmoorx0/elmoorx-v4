/**
 * Elmoorx v4 — API Documentation Generator (Markdown, بدون تبعيات)
 * ==============================================================
 * يُولّد توثيق Markdown كامل من route definitions.
 *
 * المميزات:
 *   - توليد Markdown من route definitions
 *   - أمثلة request/response
 *   - دعم authentication
 *   - دعم schemas
 *   - Table of contents تلقائي
 *   - Code snippets (curl, JavaScript, Python)
 *
 * الاستخدام:
 *   import { generateAPIDocs } from './api-docs.mjs';
 *   const markdown = generateAPIDocs(routes, { title: 'My API' });
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1) DOCUMENTATION GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * يُولّد توثيق Markdown كامل من route definitions
 *
 * @param {array} routes - قائمة الـ routes
 * @param {object} options - { title, version, description, baseUrl }
 * @returns {string} Markdown
 */
export function generateAPIDocs(routes, options = {}) {
  const {
    title = 'API Documentation',
    version = '1.0.0',
    description = '',
    baseUrl = 'https://api.example.com',
    authScheme = null, // 'bearer' | 'apikey' | null
  } = options;

  let md = '';

  // Header
  md += `# ${title}\n\n`;
  md += `**Version:** ${version}\n\n`;
  if (description) md += `${description}\n\n`;
  md += `**Base URL:** \`${baseUrl}\`\n\n`;

  // Authentication
  if (authScheme) {
    md += `## Authentication\n\n`;
    if (authScheme === 'bearer') {
      md += `This API uses JWT Bearer tokens. Include the token in the Authorization header:\n\n`;
      md += '```bash\n';
      md += `curl -H "Authorization: Bearer YOUR_TOKEN" ${baseUrl}/endpoint\n`;
      md += '```\n\n';
    } else if (authScheme === 'apikey') {
      md += `This API uses API keys. Include the key in the X-API-Key header:\n\n`;
      md += '```bash\n';
      md += `curl -H "X-API-Key: YOUR_API_KEY" ${baseUrl}/endpoint\n`;
      md += '```\n\n';
    }
  }

  // Table of Contents
  md += `## Table of Contents\n\n`;
  const grouped = groupRoutesByTag(routes);
  for (const [tag, tagRoutes] of Object.entries(grouped)) {
    md += `### ${tag}\n\n`;
    for (const route of tagRoutes) {
      const anchor = `${route.method}-${route.path}`.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
      md += `- [${route.method.toUpperCase()} ${route.path}](#${anchor})\n`;
    }
    md += `\n`;
  }

  // Endpoints
  md += `## Endpoints\n\n`;
  for (const [tag, tagRoutes] of Object.entries(grouped)) {
    md += `### ${tag}\n\n`;
    for (const route of tagRoutes) {
      md += formatRoute(route, baseUrl, authScheme);
      md += `\n---\n\n`;
    }
  }

  // Schemas (إن وُجدت)
  const schemas = collectSchemas(routes);
  if (Object.keys(schemas).length > 0) {
    md += `## Schemas\n\n`;
    for (const [name, schema] of Object.entries(schemas)) {
      md += `### ${name}\n\n`;
      md += '```json\n';
      md += JSON.stringify(schema, null, 2);
      md += '\n```\n\n';
    }
  }

  return md;
}

/**
 * يُنسّق route واحد كـ Markdown
 */
function formatRoute(route, baseUrl, authScheme) {
  let md = '';
  const anchor = `${route.method}-${route.path}`.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
  md += `#### ${route.method.toUpperCase()} ${route.path}\n\n`;
  md += `<a id="${anchor}"></a>\n\n`;

  if (route.summary) md += `${route.summary}\n\n`;
  if (route.description) md += `${route.description}\n\n`;

  // Parameters
  if (route.parameters && route.parameters.length > 0) {
    md += `**Parameters**\n\n`;
    md += `| Name | In | Type | Required | Description |\n`;
    md += `|------|-----|------|----------|-------------|\n`;
    for (const p of route.parameters) {
      md += `| \`${p.name}\` | ${p.in} | ${p.schema?.type || 'string'} | ${p.required ? 'Yes' : 'No'} | ${p.description || ''} |\n`;
    }
    md += `\n`;
  }

  // Request body
  if (route.requestBody) {
    md += `**Request Body**\n\n`;
    const schema = route.requestBody.content?.['application/json']?.schema;
    if (schema) {
      md += '```json\n';
      md += JSON.stringify(generateExampleFromSchema(schema), null, 2);
      md += '\n```\n\n';
    }
  }

  // Responses
  if (route.responses) {
    md += `**Responses**\n\n`;
    for (const [code, resp] of Object.entries(route.responses)) {
      md += `- **${code}** — ${resp.description}\n`;
      if (resp.content?.['application/json']?.schema) {
        md += '  ```json\n';
        md += '  ' + JSON.stringify(generateExampleFromSchema(resp.content['application/json'].schema), null, 2).replace(/\n/g, '\n  ');
        md += '\n  ```\n';
      }
    }
    md += `\n`;
  }

  // Code examples
  md += `**Examples**\n\n`;
  md += generateCodeExamples(route, baseUrl, authScheme);

  return md;
}

/**
 * يُولّد أمثلة code (curl, JavaScript, Python)
 */
function generateCodeExamples(route, baseUrl, authScheme) {
  let md = '';
  const url = `${baseUrl}${route.path.replace(/:(\w+)/g, '{$1}')}`;
  const hasBody = !!route.requestBody;
  const bodyExample = route.requestBody
    ? JSON.stringify(generateExampleFromSchema(route.requestBody.content?.['application/json']?.schema), null, 2)
    : '';

  // curl
  md += `_curl_\n\n`;
  md += '```bash\n';
  let curlCmd = `curl -X ${route.method.toUpperCase()} "${url}"`;
  if (authScheme === 'bearer') curlCmd += ' \\\n  -H "Authorization: Bearer YOUR_TOKEN"';
  if (authScheme === 'apikey') curlCmd += ' \\\n  -H "X-API-Key: YOUR_API_KEY"';
  if (hasBody) {
    curlCmd += ' \\\n  -H "Content-Type: application/json"';
    curlCmd += ` \\\n  -d '${bodyExample.replace(/\n/g, '')}'`;
  }
  md += curlCmd + '\n```\n\n';

  // JavaScript (fetch)
  md += `_JavaScript (fetch)_\n\n`;
  md += '```javascript\n';
  md += `const response = await fetch('${url}', {\n`;
  md += `  method: '${route.method.toUpperCase()}',\n`;
  if (authScheme === 'bearer') md += `  headers: {\n    'Authorization': 'Bearer YOUR_TOKEN',\n${hasBody ? "    'Content-Type': 'application/json',\n" : ''}  },\n`;
  if (hasBody) {
    md += `  body: JSON.stringify(${bodyExample}),\n`;
  }
  md += `});\n`;
  md += `const data = await response.json();\n`;
  md += '```\n\n';

  // Python (requests)
  md += `_Python (requests)_\n\n`;
  md += '```python\n';
  md += `import requests\n\n`;
  const headers = {};
  if (authScheme === 'bearer') headers['Authorization'] = 'Bearer YOUR_TOKEN';
  if (hasBody) headers['Content-Type'] = 'application/json';
  if (Object.keys(headers).length > 0) {
    md += `headers = ${JSON.stringify(headers, null, 2).replace(/"/g, "'")}\n`;
  }
  if (hasBody) {
    md += `data = ${bodyExample.replace(/"/g, "'")}\n\n`;
    md += `response = requests.${route.method.toLowerCase()}('${url}', json=data`;
    if (Object.keys(headers).length > 0) md += `, headers=headers`;
    md += `)\n`;
  } else {
    md += `response = requests.${route.method.toLowerCase()}('${url}'`;
    if (Object.keys(headers).length > 0) md += `, headers=headers`;
    md += `)\n`;
  }
  md += `print(response.json())\n`;
  md += '```\n\n';

  return md;
}

/**
 * يُولّد example value من schema
 */
function generateExampleFromSchema(schema, visited = new Set()) {
  if (!schema) return null;
  if (schema.$ref) {
    const name = schema.$ref.split('/').pop();
    return { $ref: name };
  }
  switch (schema.type) {
    case 'string':
      if (schema.format === 'email') return 'user@example.com';
      if (schema.format === 'date-time') return new Date().toISOString();
      if (schema.format === 'uuid') return '550e8400-e29b-41d4-a716-446655440000';
      if (schema.format === 'uri') return 'https://example.com';
      if (schema.enum) return schema.enum[0];
      return 'string';
    case 'integer':
      return 1;
    case 'number':
      return 1.5;
    case 'boolean':
      return true;
    case 'array':
      return [generateExampleFromSchema(schema.items, visited)];
    case 'object':
      if (!schema.properties) return {};
      const obj = {};
      for (const [key, prop] of Object.entries(schema.properties)) {
        obj[key] = generateExampleFromSchema(prop, visited);
      }
      return obj;
    default:
      return null;
  }
}

/**
 * يجمع الـ routes حسب tag
 */
function groupRoutesByTag(routes) {
  const groups = {};
  for (const route of routes) {
    const tags = route.tags || ['default'];
    for (const tag of tags) {
      if (!groups[tag]) groups[tag] = [];
      groups[tag].push(route);
    }
  }
  return groups;
}

/**
 * يجمع كل schemas المُشار إليها
 */
function collectSchemas(routes) {
  const schemas = {};
  for (const route of routes) {
    if (route.requestBody) {
      extractSchemas(route.requestBody.content?.['application/json']?.schema, schemas);
    }
    if (route.responses) {
      for (const resp of Object.values(route.responses)) {
        extractSchemas(resp.content?.['application/json']?.schema, schemas);
      }
    }
  }
  return schemas;
}

function extractSchemas(schema, collected) {
  if (!schema) return;
  if (schema.$ref) {
    const name = schema.$ref.split('/').pop();
    collected[name] = collected[name] || { $comment: `Reference to ${name}` };
    return;
  }
  if (schema.type === 'object' && schema.properties) {
    for (const prop of Object.values(schema.properties)) {
      extractSchemas(prop, collected);
    }
  }
  if (schema.type === 'array' && schema.items) {
    extractSchemas(schema.items, collected);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default { generateAPIDocs };
