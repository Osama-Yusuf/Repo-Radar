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
   - Uses Octokit (via `GitHubService`) to fetch the latest commit for each branch
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

5. **Secret Scanning (GitLeaks)**:
   - After changes are detected and initial logging is done, the `GitleaksScanService` (`projectService.js` calls `gitleaksScan` from this service) is invoked.
   - This service uses the GitLeaks CLI to scan the repository from its first commit up to the latest detected commit. The GitHub token from application settings is used to authenticate with GitHub for accessing repositories.
   - Any identified secrets are parsed and stored in the `gitleaks_findings` database table for review. Old findings for the project are cleared before new ones are inserted.

#### 3. Error Handling (Renumbered from original plan, should be part of Check Process Flow)
- Each check operation is wrapped in try-catch blocks
- Errors are logged but don't stop the monitoring process
- Failed checks are recorded in the logs
- Individual action failures don't affect other actions
- GitLeaks scan failures are also logged and reflected in the `check_logs` status.

#### 4. Database Updates (Renumbered)
The system maintains several tables that are updated during the monitoring process:
- `projects`: Stores project configurations
- `branches`: Tracks branch states and last commit SHAs
- `check_logs`: Records all check operations and their results (including GitLeaks scan status)
- `actions`: Stores webhook URLs and script contents
- `secrets`: Manages environment variables for scripts
- `gitleaks_findings`: Stores results from GitLeaks scans (newly added).

### Kubernetes Integration
The backend integrates with Kubernetes to monitor deployments and scan container images for vulnerabilities:

#### 1. Kubernetes Client Configuration
- Connects to the Kubernetes cluster using the local kubeconfig file
- Falls back to in-cluster configuration when running inside a Kubernetes pod
- Provides a mock client for development environments

#### 2. Deployment Monitoring
- Periodically fetches all deployments from the Kubernetes cluster
- Extracts container image information (name, tag, digest)
- Tracks images in the database with timestamps for monitoring changes

#### 3. Pod Monitoring
- Fetches pod status, container information, and resource metrics
- Calculates CPU and memory usage for each container
- Formats age and resource metrics for easy readability
- Provides access to pod logs for troubleshooting

#### 4. Vulnerability Scanning
- Uses Trivy, a comprehensive container security scanner
- Automatically scans container images when they are first detected or updated
- Stores scan results in the database for historical tracking and analysis
- Processes vulnerabilities in batches for improved performance and reliability

#### 5. Data Storage
- Stores image information in the `tracked_images` table
- Stores vulnerability details in the `image_vulnerabilities` table
- Maintains raw scan output for detailed analysis and debugging

### Tekton CI/CD Integration
The backend integrates with Tekton to provide visibility into CI/CD pipelines:

#### 1. Pipeline Run Monitoring
- Fetches all pipeline runs from the Tekton API
- Extracts status, duration, and parameter information
- Calculates execution time for each pipeline run
- Sorts pipeline runs by creation time for easy navigation

#### 2. Task Run Tracking
- Fetches task runs associated with each pipeline run
- Extracts status, duration, and execution details
- Calculates execution time for each task
- Provides status indicators for quick visual assessment

#### 3. Log Aggregation
- Fetches logs for each task in a pipeline run
- Aggregates logs from all containers in task pods
- Provides access to logs for individual tasks or entire pipelines
- Formats logs with container names for easy identification

#### 4. Error Handling
- Gracefully handles missing pods or containers
- Provides clear error messages for troubleshooting
- Implements timeouts to prevent hanging requests
- Formats durations in human-readable format (seconds, minutes, hours, days)

### Architecture Overview

The backend is built using Express.js and Drizzle ORM for database interactions (PostgreSQL in production, SQLite for local dev/testing might be an option if schema adjusted), providing a RESTful API for managing repository monitoring and automated actions.

### Database Schema

The backend uses a PostgreSQL database (managed by Drizzle ORM) with the following tables:

- **projects**: Stores repository monitoring configurations
  ```sql
  - id: serial PRIMARY KEY
  - name: text NOT NULL
  - repo_url: text NOT NULL
  - check_interval: integer DEFAULT 5 NOT NULL
  - created_at: timestamp DEFAULT now() NOT NULL
  - updated_at: timestamp DEFAULT now() NOT NULL
  ```

- **branches**: Stores branch configurations for each project
  ```sql
  - id: serial PRIMARY KEY
  - project_id: integer NOT NULL (references projects.id, onDelete: 'cascade')
  - branch_name: text NOT NULL
  - last_commit_sha: text
  ```

- **actions**: Stores webhook and script actions for projects
  ```sql
  - id: serial PRIMARY KEY
  - project_id: integer NOT NULL (references projects.id, onDelete: 'cascade')
  - name: text
  - action_type: text NOT NULL
  - webhook_url: text
  - script_content: text
  - created_at: timestamp DEFAULT now() NOT NULL
  - updated_at: timestamp DEFAULT now() NOT NULL
  ```

- **check_logs**: Stores execution history (was 'logs' previously)
  ```sql
  - id: serial PRIMARY KEY
  - project_id: integer NOT NULL (references projects.id, onDelete: 'cascade')
  - branch_name: text NOT NULL
  - commit_sha: text
  - commit_message: text
  - commit_author: text
  - commit_date: timestamp
  - checked_at: timestamp DEFAULT now() NOT NULL
  - status: text NOT NULL 
  ```

- **tracked_images**: Stores container image information
  ```sql
  - id: serial PRIMARY KEY
  - image_name: text NOT NULL
  - image_tag: text NOT NULL
  - image_digest: text
  - namespace: text
  - last_seen_at: timestamp DEFAULT now() NOT NULL
  - last_scanned_at: timestamp DEFAULT now() NOT NULL
  - scan_status: text NOT NULL
  - raw_trivy_output: jsonb
  - created_at: timestamp DEFAULT now() NOT NULL
  - updated_at: timestamp DEFAULT now() NOT NULL
  ```

- **image_vulnerabilities**: Stores vulnerability details for container images
  ```sql
  - id: serial PRIMARY KEY
  - tracked_image_id: integer NOT NULL (references tracked_images.id, onDelete: 'cascade')
  - vulnerability_cve_id: text NOT NULL
  - pkg_name: text NOT NULL
  - installed_version: text NOT NULL
  - fixed_version: text
  - severity: text NOT NULL
  - title: text
  - description: text
  - datasource: text
  - created_at: timestamp DEFAULT now() NOT NULL
  ```

- **gitleaks_findings**: Stores detailed results from GitLeaks secret scans.
  ```sql
  - id: serial PRIMARY KEY
  - project_id: integer NOT NULL (references projects.id, onDelete: 'cascade')
  - description: text NOT NULL (Description of the rule that was triggered)
  - secret: text NOT NULL (The actual secret/sensitive data found)
  - file_path: text NOT NULL (Path to the file containing the secret)
  - line_number: integer (Line number where the secret was found)
  - commit_hash: text NOT NULL (Commit hash where the secret was introduced)
  - author: text (Author of the commit)
  - date: timestamp (Timestamp of the commit)
  - tags: jsonb (JSON array of tags associated with the finding)
  - rule_id: text NOT NULL (GitLeaks rule ID that was triggered)
  - scanned_at: timestamp DEFAULT now() NOT NULL (Timestamp when the scan was performed)
  - commit_url: text (URL to the specific commit, if available)
  ```
  
- **users**: Stores user authentication data.
  ```sql
  - id: serial PRIMARY KEY
  - username: varchar(50) NOT NULL UNIQUE
  - password: text NOT NULL (Hashed password)
  - role: varchar(10) DEFAULT 'user' NOT NULL
  - created_at: timestamp DEFAULT now() NOT NULL
  - updated_at: timestamp DEFAULT now() NOT NULL
  ```

- **app_settings**: Stores application-wide settings.
  ```sql
  - id: serial PRIMARY KEY (typically only one row with id=1)
  - github_api_url: text
  - github_token: text (Encrypted or handled securely)
  - kubernetes_namespaces: jsonb DEFAULT '[]'::jsonb
  - created_at: timestamp DEFAULT now() NOT NULL
  - updated_at: timestamp DEFAULT now() NOT NULL
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

#### Kubernetes Resources
- **GET /api/k8s/pods**
  - Fetches all pods in the default namespace
  - Returns detailed information including:
    - Pod name and namespace
    - Status and age
    - Container details (name, image)
    - Ready status and restart count
    - Resource usage metrics (CPU, memory)
    - Commit information from labels

- **GET /api/k8s/pods/:name/logs**
  - Fetches logs for a specific pod
  - Limits to last 1000 lines for performance
  - Returns formatted logs or error message

- **GET /api/k8s/deployments-with-images**
  - Fetches all deployments in the default namespace
  - Returns deployment information including:
    - Deployment name and namespace
    - Replica counts (requested and available)
    - Container image information

#### Tekton CI/CD Pipelines
- **GET /api/tekton/pipelineruns**
  - Fetches all pipeline runs in the devops namespace
  - Returns detailed information including:
    - Pipeline name and status
    - Start and completion times
    - Duration in human-readable format
    - Pipeline parameters
    - Task information with status and duration

- **GET /api/tekton/pipelineruns/:name/logs**
  - Fetches logs for all tasks in a specific pipeline run
  - Aggregates logs from all containers in each task
  - Returns organized logs by task name

- **GET /api/tekton/pipelineruns/:name/logs/:taskName**
  - Fetches logs for a specific task in a pipeline run
  - Aggregates logs from all containers in the task pod
  - Returns formatted logs with container names

#### Vulnerability Management
- **GET /api/vulnerabilities/images**
  - Fetches all tracked container images with their scan status
  - Returns image name, tag, digest, and last scan timestamp

- **GET /api/vulnerabilities/scan/:imageName**
  - Fetches vulnerability scan results for a specific image
  - Returns detailed vulnerability information including:
    - CVE IDs
    - Affected packages
    - Installed and fixed versions
    - Severity levels
    - Vulnerability descriptions

#### Secret Findings
- **GET /api/projects/:projectId/secret-findings**
  - Fetches all GitLeaks secret findings for a specified project.
  - Results are ordered by file path and then by line number (ascending).
  - Returns an array of finding objects, structured according to the `gitleaks_findings` table schema.
  ```javascript
  [
    {
      "id": 1,
      "projectId": 1,
      "description": "AWS API Key",
      "secret": "AKIA...",
      "filePath": "src/config.js",
      "lineNumber": 23,
      "commitHash": "abcdef1234567890",
      "author": "John Doe",
      "date": "2023-01-15T10:00:00Z",
      "tags": "[\"key\", \"aws\"]", // Stored as JSONB, will be actual JSON array
      "ruleId": "aws-access-key",
      "scannedAt": "2023-01-16T12:00:00Z",
      "commitUrl": "https://github.com/user/repo/commit/abcdef1234567890"
    }
    // ... other findings
  ]
  ```

### Background Processing
The backend implements multiple background processes:

1. Repository monitoring that:
   - Periodically checks each project based on its `check_interval`
   - Uses GitHub API to fetch latest commits
   - Compares with last known state
   - Executes associated actions when changes are detected
   - Triggers GitLeaks scans on detected changes.

2. Kubernetes monitoring that:
   - Periodically scans the cluster for deployments
   - Tracks container images and detects changes
   - Triggers vulnerability scans for new or updated images
   - Updates the database with scan results

3. Tekton pipeline monitoring that:
   - Periodically fetches pipeline runs from the Tekton API
   - Tracks pipeline status and execution time
   - Updates the database with pipeline information

### Error Handling
- All endpoints return appropriate HTTP status codes
- Database operations are wrapped in try-catch blocks
- Actions execution is logged with detailed error information

## Setup and Configuration

1. Install dependencies:
   ```bash
   npm install # or pnpm install if using pnpm
   ```

2. Environment variables:
   ```
   PORT=3001
   GITHUB_TOKEN=your_github_token        # Crucial for repository access (GitHubService) and effective secret scanning of private repositories (GitleaksScanService via application settings).
   KUBERNETES_CONTEXT=your_kube_context  # Optional, uses current context by default
   TEKTON_NAMESPACE=devops               # Optional, defaults to 'devops'
   POSTGRESQL_USER=your_db_user
   POSTGRESQL_PASSWORD=your_db_password
   POSTGRESQL_HOST=localhost
   POSTGRESQL_PORT=5432
   POSTGRESQL_DATABASE=repo_radar
   JWT_SECRET=your_jwt_secret_key      # For session management
   ```
   **GitLeaks Execution Environment Requirements**:
   - The backend requires `git` and `gitleaks` CLI tools to be installed and available in the system's PATH.
   - The provided `backend/Dockerfile` handles the installation of GitLeaks.
   - A `GITHUB_TOKEN` with appropriate read access to repositories is highly recommended (configured via application settings or the environment variable fallback) for GitLeaks to effectively scan private repositories.

3. Start the server:
   ```bash
   npm start # or pnpm start
   ```

## Development

### Database Initialization & Migrations

The database schema is managed by Drizzle ORM.
- **Schema Definition**: Located in `src/schema/schema.js`.
- **Migrations**: Run `pnpm drizzle-kit generate:pg` to generate migration files after schema changes.
- **Applying Migrations**: Migrations are typically applied automatically on startup or via a dedicated script if preferred for production. The current `setup-db.js` script likely handles this.

### Adding New Features
When adding new features:
1. Update database schema in `src/schema/schema.js` if needed.
2. Generate and apply migrations if the schema changed.
3. Add new API endpoints in the relevant `routes` and `controllers`.
4. Update background processing in `services` if required.
5. Add appropriate error handling.
6. Update this documentation and any relevant sections in the root `README.md`.

## Security Considerations
1. All webhook URLs must be HTTPS.
2. Script actions are executed in a sandboxed environment.
3. GitHub token (configured in Application Settings or via ENV) is required for repository access and secret scanning. Ensure it has the minimum necessary permissions.
4. Input validation is performed on all API endpoints.
5. Vulnerability scan results are stored securely in the database.
6. Raw scan output for vulnerabilities is preserved for audit purposes.
7. Kubernetes API access should be configured with least privilege.
8. Tekton pipeline logs may contain sensitive information and access to them should be controlled.
9. Regularly review GitLeaks findings and rotate any exposed secrets.

## Error Codes
- 400: Bad Request (invalid input)
- 401/403: Unauthorized/Forbidden (authentication/authorization issues)
- 404: Resource Not Found
- 500: Internal Server Error
- 503: Service Unavailable (e.g., GitHub API issues)
