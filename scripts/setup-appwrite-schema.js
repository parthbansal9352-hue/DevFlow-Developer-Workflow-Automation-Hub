/**
 * DevFlow — Automated Idempotent Appwrite TablesDB / Collections Initializer
 *
 * Usage:
 *   node scripts/setup-appwrite-schema.js
 *
 * Environment variables expected (via .env or environment):
 *   APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1 (or VITE_APPWRITE_ENDPOINT)
 *   APPWRITE_PROJECT_ID=your_project_id           (or VITE_APPWRITE_PROJECT_ID)
 *   APPWRITE_API_KEY=your_server_api_key          (Required for schema management)
 *   APPWRITE_DATABASE_ID=devflow_db               (or VITE_APPWRITE_DATABASE_ID)
 */

import fs from 'node:fs';
import path from 'node:path';

// Parse .env if present
const envPath = path.resolve(process.cwd(), '.env');
const envVars = {};
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      envVars[key] = val;
    }
  }
}

const endpoint = process.env.APPWRITE_ENDPOINT || envVars.APPWRITE_ENDPOINT || envVars.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID || envVars.APPWRITE_PROJECT_ID || envVars.VITE_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY || envVars.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID || envVars.APPWRITE_DATABASE_ID || envVars.VITE_APPWRITE_DATABASE_ID || 'devflow_db';

if (!projectId || !apiKey) {
  console.error('\n❌ Missing required configuration for schema generation!');
  console.error('Please ensure APPWRITE_PROJECT_ID and APPWRITE_API_KEY are provided.');
  console.error('Example:');
  console.error('  $env:APPWRITE_PROJECT_ID="your_project_id"');
  console.error('  $env:APPWRITE_API_KEY="your_server_api_key"');
  console.error('  node scripts/setup-appwrite-schema.js\n');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  'X-Appwrite-Project': projectId,
  'X-Appwrite-Key': apiKey,
};

async function api(path, options = {}) {
  const url = `${endpoint.replace(/\/$/, '')}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function ensureDatabase() {
  console.log(`Checking database "${databaseId}"...`);
  const check = await api(`/databases/${databaseId}`);
  if (check.ok) {
    console.log(`✓ Database "${databaseId}" already exists.`);
    return;
  }
  console.log(`Creating database "${databaseId}"...`);
  const create = await api('/databases', {
    method: 'POST',
    body: JSON.stringify({ databaseId, name: 'DevFlow Database' }),
  });
  if (!create.ok && create.status !== 409) {
    throw new Error(`Failed to create database: ${create.data?.message || create.status}`);
  }
  console.log(`✓ Database "${databaseId}" ready.`);
}

const collectionsSchema = [
  {
    id: 'projects',
    name: 'Projects',
    permissions: ['read("users")', 'create("users")'],
    documentSecurity: true,
    attributes: [
      { key: 'name', type: 'string', size: 128, required: true },
      { key: 'description', type: 'string', size: 500, required: false, default: '' },
      { key: 'status', type: 'string', size: 32, required: true, default: 'active' },
      { key: 'ownerId', type: 'string', size: 64, required: true },
      { key: 'githubRepo', type: 'string', size: 128, required: false, default: '' },
    ],
    indexes: [
      { key: 'idx_owner', type: 'key', attributes: ['ownerId'] },
      { key: 'idx_status', type: 'key', attributes: ['status'] },
    ],
  },
  {
    id: 'tasks',
    name: 'Tasks',
    permissions: ['read("users")', 'create("users")'],
    documentSecurity: true,
    attributes: [
      { key: 'projectId', type: 'string', size: 64, required: true },
      { key: 'title', type: 'string', size: 255, required: true },
      { key: 'description', type: 'string', size: 2000, required: false, default: '' },
      { key: 'status', type: 'string', size: 32, required: true, default: 'todo' },
      { key: 'priority', type: 'string', size: 32, required: true, default: 'medium' },
      { key: 'assignee', type: 'string', size: 128, required: false, default: '' },
      { key: 'dueDate', type: 'string', size: 64, required: false, default: '' },
      { key: 'ownerId', type: 'string', size: 64, required: true },
    ],
    indexes: [
      { key: 'idx_project', type: 'key', attributes: ['projectId'] },
      { key: 'idx_owner', type: 'key', attributes: ['ownerId'] },
      { key: 'idx_status', type: 'key', attributes: ['status'] },
      { key: 'idx_priority', type: 'key', attributes: ['priority'] },
    ],
  },
  {
    id: 'automation_rules',
    name: 'Automation Rules',
    permissions: ['read("users")', 'create("users")'],
    documentSecurity: true,
    attributes: [
      { key: 'name', type: 'string', size: 128, required: true },
      { key: 'projectId', type: 'string', size: 64, required: false, default: '' },
      { key: 'triggerEvent', type: 'string', size: 64, required: true },
      { key: 'conditionField', type: 'string', size: 64, required: true },
      { key: 'conditionOperator', type: 'string', size: 32, required: true },
      { key: 'conditionValue', type: 'string', size: 128, required: true },
      { key: 'actionType', type: 'string', size: 64, required: true },
      { key: 'actionPayload', type: 'string', size: 500, required: true, default: '{}' },
      { key: 'isEnabled', type: 'boolean', required: true, default: true },
      { key: 'ownerId', type: 'string', size: 64, required: true },
    ],
    indexes: [
      { key: 'idx_owner', type: 'key', attributes: ['ownerId'] },
      { key: 'idx_trigger', type: 'key', attributes: ['triggerEvent'] },
    ],
  },
  {
    id: 'activity_logs',
    name: 'Activity Logs',
    permissions: ['read("users")', 'create("users")'],
    documentSecurity: true,
    attributes: [
      { key: 'projectId', type: 'string', size: 64, required: false, default: '' },
      { key: 'taskId', type: 'string', size: 64, required: false, default: '' },
      { key: 'action', type: 'string', size: 64, required: true },
      { key: 'details', type: 'string', size: 1000, required: true },
      { key: 'actorId', type: 'string', size: 64, required: true },
      { key: 'actorName', type: 'string', size: 128, required: true },
      { key: 'ownerId', type: 'string', size: 64, required: true },
    ],
    indexes: [
      { key: 'idx_project', type: 'key', attributes: ['projectId'] },
      { key: 'idx_owner', type: 'key', attributes: ['ownerId'] },
    ],
  },
  {
    id: 'notifications',
    name: 'Notifications',
    permissions: ['read("users")', 'create("users")'],
    documentSecurity: true,
    attributes: [
      { key: 'userId', type: 'string', size: 64, required: true },
      { key: 'title', type: 'string', size: 128, required: true },
      { key: 'message', type: 'string', size: 500, required: true },
      { key: 'type', type: 'string', size: 32, required: true, default: 'info' },
      { key: 'isRead', type: 'boolean', required: true, default: false },
      { key: 'link', type: 'string', size: 255, required: false, default: '' },
    ],
    indexes: [
      { key: 'idx_user', type: 'key', attributes: ['userId'] },
      { key: 'idx_read', type: 'key', attributes: ['isRead'] },
    ],
  },
];

async function ensureCollection(coll) {
  console.log(`\nChecking collection "${coll.id}"...`);
  let check = await api(`/databases/${databaseId}/collections/${coll.id}`);
  if (!check.ok) {
    console.log(`Creating collection "${coll.id}"...`);
    const create = await api(`/databases/${databaseId}/collections`, {
      method: 'POST',
      body: JSON.stringify({
        collectionId: coll.id,
        name: coll.name,
        permissions: coll.permissions,
        documentSecurity: coll.documentSecurity,
      }),
    });
    if (!create.ok && create.status !== 409) {
      throw new Error(`Failed to create collection ${coll.id}: ${create.data?.message}`);
    }
    console.log(`✓ Collection "${coll.id}" created.`);
  } else {
    console.log(`✓ Collection "${coll.id}" exists.`);
  }

  // Attributes
  for (const attr of coll.attributes) {
    const attrPath = `/databases/${databaseId}/collections/${coll.id}/attributes/${attr.key}`;
    const attrCheck = await api(attrPath);
    if (attrCheck.ok) {
      console.log(`  - Attribute "${attr.key}" already exists.`);
      continue;
    }
    console.log(`  + Creating attribute "${attr.key}" (${attr.type})...`);
    let payload = {
      key: attr.key,
      required: attr.required,
    };
    if (attr.default !== undefined) payload.default = attr.default;

    let endpointSub = '';
    if (attr.type === 'string') {
      endpointSub = '/string';
      payload.size = attr.size;
    } else if (attr.type === 'boolean') {
      endpointSub = '/boolean';
    } else if (attr.type === 'integer') {
      endpointSub = '/integer';
    }

    const addAttr = await api(`/databases/${databaseId}/collections/${coll.id}/attributes${endpointSub}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!addAttr.ok && addAttr.status !== 409) {
      console.warn(`    ⚠️ Warning creating attribute ${attr.key}: ${addAttr.data?.message}`);
    }
  }
}

async function run() {
  console.log('🚀 DevFlow Appwrite Schema Setup Started');
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Project:  ${projectId}`);
  console.log(`Database: ${databaseId}`);

  await ensureDatabase();
  for (const coll of collectionsSchema) {
    await ensureCollection(coll);
  }

  console.log('\n✅ DevFlow Appwrite Schema initialization completed successfully!\n');
}

run().catch((err) => {
  console.error('\n❌ Setup failed:', err.message);
  process.exit(1);
});
