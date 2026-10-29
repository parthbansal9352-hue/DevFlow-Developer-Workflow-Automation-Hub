/**
 * Appwrite Client & Services Configuration
 */

import { Client, Account, TablesDB, Databases, ID, Permission, Role, Query, OAuthProvider } from 'appwrite';

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID || '';
const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'devflow_db';

export const APPWRITE_CONFIG = {
  endpoint,
  projectId,
  databaseId,
  tables: {
    projects: import.meta.env.VITE_APPWRITE_TABLE_PROJECTS || 'projects',
    tasks: import.meta.env.VITE_APPWRITE_TABLE_TASKS || 'tasks',
    automationRules: import.meta.env.VITE_APPWRITE_TABLE_AUTOMATION_RULES || 'automation_rules',
    activityLogs: import.meta.env.VITE_APPWRITE_TABLE_ACTIVITY_LOGS || 'activity_logs',
    notifications: import.meta.env.VITE_APPWRITE_TABLE_NOTIFICATIONS || 'notifications',
  },
};

export const isAppwriteConfigured = () => {
  return Boolean(
    projectId &&
    projectId.trim() !== '' &&
    projectId !== 'your_appwrite_project_id' &&
    endpoint &&
    endpoint.trim() !== ''
  );
};

export const client = new Client();

if (projectId && projectId !== 'your_appwrite_project_id') {
  client.setEndpoint(endpoint).setProject(projectId);
}

export const account = new Account(client);
export const tablesDB = new TablesDB(client);
export const databases = new Databases(client);

export { ID, Permission, Role, Query, OAuthProvider };
