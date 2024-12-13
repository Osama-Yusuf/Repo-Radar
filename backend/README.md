# Repo Radar Backend

## How It Works: Under The Hood

### Repository Monitoring System

The backend implements a sophisticated monitoring system that tracks GitHub repositories in real-time. Here's how it works:

#### 1. Project Timer Management
- Each project has its own timer managed by a `Map` called `projectTimers`
- When a project is created or updated, `setupProjectTimer()` is called to:
  - Clear any existing timer for that project
  - Create a new timer with the project's check interval
  - Store the timer reference for cleanup

#### 2. Check Process Flow
For each check interval:
1. **Branch Retrieval**:
   - Fetches all branches associated with the project from the database
   - Each branch is checked independently

2. **GitHub API Integration**:
   - Uses Octokit to fetch the latest commit for each branch
   - Compares the latest commit SHA with the stored SHA
   - If different, marks as a change

3. **Change Detection**:
   When changes are detected:
   - Updates branch's `last_commit_sha` in database
   - Updates project's `updated_at` timestamp
   - Logs the change in `check_logs` table with:
     - Commit details (SHA, message, author)
     - Branch information
     - Timestamp

4. **Action Execution**:
   For each detected change:
   - Fetches all actions associated with the project
   - For webhook actions:
     - Makes HTTP POST request to webhook URL
     - Sends project, branch, and commit details
   - For script actions:
     - Creates temporary script file
     - Injects environment variables from secrets
     - Executes script with proper permissions
     - Captures output and errors
     - Cleans up temporary files

#### 3. Error Handling
- Each check operation is wrapped in try-catch blocks
- Errors are logged but don't stop the monitoring process
- Failed checks are recorded in the logs
- Individual action failures don't affect other actions

#### 4. Database Updates
The system maintains several tables that are updated during the monitoring process:
- `projects`: Stores project configurations
- `branches`: Tracks branch states and last commit SHAs
- `check_logs`: Records all check operations and their results
- `actions`: Stores webhook URLs and script contents
- `secrets`: Manages environment variables for scripts

## Architecture Overview

The backend is built using Express.js and SQLite, providing a RESTful API for managing repository monitoring and automated actions.

### Database Schema

The backend uses SQLite with the following tables:

- **projects**: Stores repository monitoring configurations
  ```sql
  - id: INTEGER PRIMARY KEY
  - name: TEXT
  - repo_url: TEXT
  - check_interval: INTEGER (minutes)
  - last_check: TEXT (ISO timestamp)
  - created_at: TEXT
  ```

- **branches**: Stores branch configurations for each project
  ```sql
  - id: INTEGER PRIMARY KEY
  - project_id: INTEGER (foreign key)
  - branch_name: TEXT
  ```

- **actions**: Stores webhook and script actions for projects
  ```sql
  - id: INTEGER PRIMARY KEY
  - project_id: INTEGER (foreign key)
  - name: TEXT
  - action_type: TEXT ('webhook' or 'script')
  - webhook_url: TEXT
  - script_content: TEXT
  ```

- **logs**: Stores execution history
  ```sql
  - id: INTEGER PRIMARY KEY
  - project_id: INTEGER
  - commit_hash: TEXT
  - commit_message: TEXT
  - branch: TEXT
  - status: TEXT
  - created_at: TEXT
  ```

### API Endpoints

#### Projects

- **GET /api/projects**
  - Fetches all projects with their branches and actions
  - Response includes:
    - Project details
    - Associated branches (comma-separated)
    - Associated actions
  ```javascript
  {
    "id": 1,
    "name": "My Project",
    "repo_url": "https://github.com/user/repo",
    "check_interval": 5,
    "branches": ["main", "develop"],
    "actions": [
      {
        "id": 1,
        "name": "Slack Notification",
        "action_type": "webhook",
        "webhook_url": "https://hooks.slack.com/..."
      }
    ]
  }
  ```

- **POST /api/projects**
  - Creates a new project
  - Required fields:
    - name: Project name
    - repoUrl: GitHub repository URL
    - branches: Array of branch names to monitor
    - checkInterval: Monitoring interval in minutes

- **PUT /api/projects/:id**
  - Updates an existing project
  - Supports updating all project fields
  - Automatically updates associated branches

- **DELETE /api/projects/:id**
  - Deletes a project and its associated data

#### Actions

- **GET /api/projects/:projectId/actions**
  - Fetches all actions for a specific project

- **POST /api/projects/:projectId/actions**
  - Creates a new action for a project
  - Required fields:
    - name: Action name
    - actionType: "webhook" or "script"
    - webhookUrl: URL for webhook actions
    - scriptContent: Script content for script actions

- **PUT /api/projects/:projectId/actions/:actionId**
  - Updates an existing action
  - Supports updating all action fields

- **DELETE /api/projects/:projectId/actions/:actionId**
  - Deletes an action

#### Logs

- **GET /api/projects/:projectId/logs**
  - Fetches execution history for a project
  - Supports pagination and filtering

### Background Processing

The backend implements a polling mechanism that:

1. Periodically checks each project based on its `check_interval`
2. Uses GitHub API to fetch latest commits
3. Compares with last known state
4. Executes associated actions when changes are detected

### Error Handling

- All endpoints return appropriate HTTP status codes
- Database operations are wrapped in try-catch blocks
- Actions execution is logged with detailed error information

## Setup and Configuration

1. Install dependencies:
   ```bash
   npm install
   ```

2. Environment variables:
   ```
   PORT=3001
   GITHUB_TOKEN=your_github_token
   ```

3. Start the server:
   ```bash
   npm start
   ```

## Development

### Database Initialization

The database is automatically initialized when the server starts:
1. Checks if database file exists
2. Creates tables if they don't exist
3. Adds any missing columns to existing tables

### Adding New Features

When adding new features:
1. Update database schema if needed
2. Add new API endpoints
3. Update background processing if required
4. Add appropriate error handling
5. Update this documentation

## Security Considerations

1. All webhook URLs must be HTTPS
2. Script actions are executed in a sandboxed environment
3. GitHub token is required for repository access
4. Input validation is performed on all endpoints

## Error Codes

- 400: Bad Request (invalid input)
- 404: Resource Not Found
- 500: Internal Server Error
- 503: Service Unavailable (GitHub API issues)
