# DevFlow Database Schema Specification (Appwrite TablesDB / Collections)

DevFlow uses Appwrite TablesDB as its primary persistent store. All records are scoped by user ownership using Appwrite Document Security.

---

## Database Configuration

- **Database ID**: `devflow_db` (or as configured in `VITE_APPWRITE_DATABASE_ID`)
- **Document Security**: Enabled on all tables/collections.

---

## 1. Table: `projects`
Stores developer projects owned by the user.

- **Table ID**: `projects`
- **Columns / Attributes**:

| Column | Type | Size | Required | Default | Description |
|---|---|---|---|---|---|
| `name` | String | 128 | Yes | - | Project name |
| `description` | String | 500 | No | `""` | Project description |
| `status` | String | 32 | Yes | `"active"` | Allowed: `active`, `archived`, `completed` |
| `ownerId` | String | 64 | Yes | - | Appwrite user ID of project creator |
| `githubRepo` | String | 128 | No | `""` | Optional GitHub repository (e.g. `owner/repo`) |

- **Indexes**:
  - `idx_owner` (Type: `key`, Attributes: `ownerId`, Order: `ASC`)
  - `idx_status` (Type: `key`, Attributes: `status`, Order: `ASC`)

- **Permissions**:
  - Read: `Role.user(ownerId)`
  - Update: `Role.user(ownerId)`
  - Delete: `Role.user(ownerId)`
  - Create: `Role.users()`

- **GitHub Integration & Security**:
  - `githubRepo` stores only the repository identifier (e.g. `owner/repo`).
  - GitHub OAuth access tokens and client secrets are **NEVER** stored in this table or in any database collection. Tokens reside exclusively within the trusted server-managed Appwrite session or ephemeral memory.
  - Linking and unlinking a repository enforces row-level security: only the verified project `ownerId` can link or unlink repositories.

---

## 2. Table: `tasks`
Stores tasks associated with projects.

- **Table ID**: `tasks`
- **Columns / Attributes**:

| Column | Type | Size | Required | Default | Description |
|---|---|---|---|---|---|
| `projectId` | String | 64 | Yes | - | Reference to parent `projects.$id` |
| `title` | String | 255 | Yes | - | Task title |
| `description` | String | 2000 | No | `""` | Markdown or rich text description |
| `status` | String | 32 | Yes | `"todo"` | Allowed: `todo`, `in_progress`, `in_review`, `done` |
| `priority` | String | 32 | Yes | `"medium"` | Allowed: `low`, `medium`, `high`, `urgent` |
| `assignee` | String | 128 | No | `""` | Assignee username / email |
| `dueDate` | String | 64 | No | `""` | Due date in ISO 8601 string format |
| `ownerId` | String | 64 | Yes | - | Appwrite user ID of creator |

- **Indexes**:
  - `idx_project` (Type: `key`, Attributes: `projectId`, Order: `ASC`)
  - `idx_owner` (Type: `key`, Attributes: `ownerId`, Order: `ASC`)
  - `idx_status` (Type: `key`, Attributes: `status`, Order: `ASC`)
  - `idx_priority` (Type: `key`, Attributes: `priority`, Order: `ASC`)

- **Permissions**:
  - Read: `Role.user(ownerId)`
  - Update: `Role.user(ownerId)`
  - Delete: `Role.user(ownerId)`

---

## 3. Table: `automation_rules`
Defines WHEN/IF/THEN automation rules configured by the user.

- **Table ID**: `automation_rules`
- **Columns / Attributes**:

| Column | Type | Size | Required | Default | Description |
|---|---|---|---|---|---|
| `name` | String | 128 | Yes | - | Human-readable rule title |
| `projectId` | String | 64 | No | `""` | Optional filter: empty string matches all projects |
| `triggerEvent` | String | 64 | Yes | - | `TASK_CREATED`, `TASK_STATUS_CHANGED`, `TASK_PRIORITY_CHANGED` |
| `conditionField` | String | 64 | Yes | - | Field to test: `status`, `priority`, `assignee` |
| `conditionOperator` | String | 32 | Yes | - | `EQUALS`, `NOT_EQUALS`, `CONTAINS` |
| `conditionValue` | String | 128 | Yes | - | Expected value for condition |
| `actionType` | String | 64 | Yes | - | `CREATE_NOTIFICATION`, `LOG_ACTIVITY`, `AUTO_ASSIGN`, `SET_PRIORITY` |
| `actionPayload` | String | 500 | Yes | `"{}"` | JSON encoded parameters for the action |
| `isEnabled` | Boolean | - | Yes | `true` | Active state of the rule |
| `ownerId` | String | 64 | Yes | - | Appwrite user ID |

- **Indexes**:
  - `idx_owner` (Type: `key`, Attributes: `ownerId`, Order: `ASC`)
  - `idx_trigger` (Type: `key`, Attributes: `triggerEvent`, Order: `ASC`)

- **Permissions**:
  - Read: `Role.user(ownerId)`
  - Update: `Role.user(ownerId)`
  - Delete: `Role.user(ownerId)`

---

## 4. Table: `activity_logs`
Immutable audit log recording project, task, and automation executions.

- **Table ID**: `activity_logs`
- **Columns / Attributes**:

| Column | Type | Size | Required | Default | Description |
|---|---|---|---|---|---|
| `projectId` | String | 64 | No | `""` | Optional project ID |
| `taskId` | String | 64 | No | `""` | Optional task ID |
| `action` | String | 64 | Yes | - | `PROJECT_CREATED`, `TASK_STATUS_CHANGED`, `RULE_EXECUTED`, etc. |
| `details` | String | 1000 | Yes | - | Description of the action and changes made |
| `actorId` | String | 64 | Yes | - | User ID who caused the action |
| `actorName` | String | 128 | Yes | - | Display name or email of the actor |
| `ownerId` | String | 64 | Yes | - | Owner ID for access scoping |

- **Indexes**:
  - `idx_project` (Type: `key`, Attributes: `projectId`, Order: `ASC`)
  - `idx_owner` (Type: `key`, Attributes: `ownerId`, Order: `ASC`)

- **Permissions**:
  - Read: `Role.user(ownerId)`
  - Create: `Role.users()`

---

## 5. Table: `notifications`
In-app notifications produced by automation rules and system events.

- **Table ID**: `notifications`
- **Columns / Attributes**:

| Column | Type | Size | Required | Default | Description |
|---|---|---|---|---|---|
| `userId` | String | 64 | Yes | - | Target Appwrite user ID |
| `title` | String | 128 | Yes | - | Brief title |
| `message` | String | 500 | Yes | - | Notification message text |
| `type` | String | 32 | Yes | `"info"` | `info`, `warning`, `success`, `alert` |
| `isRead` | Boolean | - | Yes | `false` | Read status |
| `link` | String | 255 | No | `""` | Optional in-app route link |

- **Indexes**:
  - `idx_user` (Type: `key`, Attributes: `userId`, Order: `ASC`)
  - `idx_read` (Type: `key`, Attributes: `isRead`, Order: `ASC`)

- **Permissions**:
  - Read: `Role.user(userId)`
  - Update: `Role.user(userId)`
  - Delete: `Role.user(userId)`
