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

- **tracked_images**: Stores container image information
  ```sql
  - id: INTEGER PRIMARY KEY
  - image_name: TEXT
  - image_tag: TEXT
  - image_digest: TEXT
  - last_scan: TEXT (ISO timestamp)
  ```

- **image_vulnerabilities**: Stores vulnerability details for container images
  ```sql
  - id: INTEGER PRIMARY KEY
  - image_id: INTEGER (foreign key)
  - cve_id: TEXT
  - package_name: TEXT
  - installed_version: TEXT
  - fixed_version: TEXT
  - severity: TEXT
  - description: TEXT
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

### Background Processing

The backend implements multiple background processes:

1. Repository monitoring that:
   - Periodically checks each project based on its `check_interval`
   - Uses GitHub API to fetch latest commits
   - Compares with last known state
   - Executes associated actions when changes are detected

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
   npm install
   ```

2. Environment variables:
   ```
   PORT=3001
   GITHUB_TOKEN=your_github_token
   KUBERNETES_CONTEXT=your_kube_context  # Optional, uses current context by default
   TEKTON_NAMESPACE=devops               # Optional, defaults to 'devops'
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
5. Vulnerability scan results are stored securely in the database
6. Raw scan output is preserved for audit purposes
7. Kubernetes API access is limited to read-only operations
8. Tekton pipeline logs may contain sensitive information and should be protected

## Error Codes

- 400: Bad Request (invalid input)
- 404: Resource Not Found
- 500: Internal Server Error
- 503: Service Unavailable (GitHub API issues)
