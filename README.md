# 🛰️ Repo Radar

> Your Mission Control Center for GitHub Repositories, Kubernetes Monitoring, and CI/CD Pipelines

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D%2016.0.0-brightgreen)
![React](https://img.shields.io/badge/react-%5E18.0.0-blue)

## 🎯 What is Repo Radar?

Repo Radar is your intelligent monitoring system that keeps you in sync with GitHub repository changes, automates responses, scans Kubernetes deployments for vulnerabilities, and tracks CI/CD pipeline executions. Think of it as your personal mission control center that never sleeps! 

🔬 **Want to dive deep into the monitoring magic?** Check out our [Backend Documentation](backend/README.md) to explore the intricate details of how Repo Radar keeps your repositories under constant surveillance.

🔒 **Concerned about container security?** Repo Radar includes powerful vulnerability scanning for your Kubernetes deployments, helping you identify and address security issues before they become problems.

⚙️ **Need CI/CD visibility?** Repo Radar integrates with Tekton pipelines to provide real-time monitoring of your build and deployment processes.

## 💡 Power User Tips

Get the most out of Repo-Radar with these advanced tips:

### 🔍 Commit ID Extraction

- **Image Name Parsing**: Repo-Radar automatically extracts commit hashes from container image tags using the pattern `:COMMIT_HASH--` (e.g., `myimage:a1b2c3d--main`). This allows you to track which code version is deployed without explicit labels.

### 📋 Naming Conventions

- **Repository Naming**: Follow the standard format `backend-service-dev` in your configuration for consistent monitoring and webhook triggers.
- **Deployment Names**: Deployment names in Kubernetes should follow the format `backend-service-dev` for automatic correlation with monitored repositories.

### 🔒 Vulnerability Scanning

- **Automated Scanning**: Repo Radar automatically scans container images in your Kubernetes deployments for vulnerabilities using Trivy.
- **Severity Filtering**: Filter vulnerability results by severity (CRITICAL, HIGH, MEDIUM, LOW) to focus on the most important issues.
- **Package Tracking**: Identify vulnerable packages and available fixed versions to streamline remediation efforts.
- **Detailed Reporting**: View comprehensive vulnerability details including CVE IDs, affected packages, and remediation guidance.

### 🖥️ Kubernetes Monitoring

- **Pod Status**: Monitor the status, age, and resource usage of all pods in your Kubernetes clusters.
- **Deployment Tracking**: Track deployments across all namespaces, including replica counts and container images.
- **Resource Utilization**: View CPU and memory usage metrics for pods and containers.
- **Log Access**: Access pod logs directly from the interface for quick troubleshooting.

### 🚀 CI/CD Pipeline Monitoring

- **Tekton Integration**: View all Tekton pipeline runs with detailed status information.
- **Task Tracking**: Monitor individual tasks within pipelines, including execution time and status.
- **Log Aggregation**: Access logs for all pipeline tasks from a single interface.
- **Pipeline Parameters**: View parameters used for each pipeline run for better traceability.

### ⚙️ Advanced Features

- **Webhook Parameters**: Configure branch-specific parameters for webhook actions to customize behavior based on which branch triggered the event.
- **Environment Variables**: All script actions automatically receive environment variables with commit details (`COMMIT_SHA`, `COMMIT_MESSAGE`, `COMMIT_AUTHOR`, `COMMIT_DATE`).
- **Rate Limiting**: The system includes built-in rate limiting to prevent excessive API calls, with a minimum 1-minute interval between checks.

### 🧩 Integration Tips

- **Tekton Pipelines**: Repo-Radar seamlessly integrates with Tekton pipelines in the `devops` namespace, displaying pipeline runs and task details.
- **Kubernetes Pods**: The system monitors pods in the `default` namespace, extracting commit information from labels and image names.
- **PostgreSQL**: Uses the `quay.io/sclorg/postgresql-15-c9s` image with environment variables using the `POSTGRESQL_*` prefix instead of `POSTGRES_*`.

### 🧠 Memory Management

- **Caching Strategy**: Repo-Radar maintains an in-memory cache of project data to reduce database queries and improve performance.
- **Timer Management**: Each project has its own monitoring timer with randomized initial delays to prevent simultaneous API calls.

## 🌟 Key Features

- **🔍 Real-time Monitoring**
  - Track multiple repositories and branches
  - Configurable check intervals
  - Instant change detection

- **🎬 Automated Actions**
  - **Webhooks**: Trigger HTTP notifications
  - **Custom Scripts**: Run your own automation scripts
  - **Environment Variables**: Secure secrets management

- **📊 Smart Dashboard**
  - Beautiful Material UI interface
  - Real-time status updates
  - Comprehensive activity logs

## ⚙️ Configuration & Administration

Repo Radar now includes enhanced configuration options and role-based access control for better security and manageability.

### <g-emoji alias="gear" fallback-src="https://github.githubassets.com/images/icons/emoji/unicode/2699.png">⚙️</g-emoji> Settings Page

Administrators can access the new **Settings** page via the sidebar. This page allows for centralized management of critical application configurations:

*   **GitHub Integration:** Configure the GitHub API URL and Personal Access Token directly in the UI. This is now the primary way to set these credentials.
*   **Kubernetes Monitoring:** Define the target Kubernetes namespaces that Repo Radar should monitor. You can specify one or more namespaces.

**Environment Variable Fallback:**

While the Settings page is the primary source for these configurations, the application still supports environment variable fallbacks:
*   `GITHUB_API_URL`: If not set in UI, the backend will check this environment variable.
*   `GITHUB_TOKEN`: If not set in UI, the backend will check this environment variable.
*   `K8S_TARGET_NAMESPACE`: If no namespaces are configured in the UI, the backend will check this environment variable (for a single namespace), and finally default to `default` if neither UI nor ENV var is set.

It's recommended to use the Settings page for managing these values after initial setup.

### 🔑 Role-Based Access Control (RBAC)

Repo Radar implements a two-tier role system to manage user permissions:

*   **Admin (`admin`):**
    *   Full access to all application features.
    *   Can access and modify configurations on the **Settings page**.
    *   Manages users:
        *   Create new users (both 'admin' and 'user' roles).
        *   Assign/change user roles.
        *   Delete users.
    *   Can manage all projects, actions, and view all logs.

*   **User (`user`):**
    *   Standard access to application features like viewing repositories, pod statuses, pipeline statuses, and vulnerabilities.
    *   Can manage projects and actions they have appropriate permissions for (based on future enhancements, currently all users can manage all projects).
    *   Cannot access the Settings page or perform user management tasks.

The first user registered in the application can be promoted to 'admin' via backend scripts or direct database modification if needed (see `backend/src/scripts/setup-db.js` for initial user setup guidance or future admin promotion scripts).

## 🚀 Quick Start

### 🐳 Installation Using Docker

### Prerequisites
- Docker
- Docker Compose
- GitHub Personal Access Token

1. **Clone the repository**
   ```bash
   git clone https://github.com/Osama-Yusuf/repo-radar.git
   cd repo-radar
   ```
   
2. **Update .env file**
   ```bash
   cp .env.example .env    # Configure your envs
   ```

3. **Build and Run Docker Compose**
   ```bash
   docker compose build
   docker compose up -d
   ```

### 📦 Installation Using NPM

### Prerequisites
- Node.js ≥ 18.0.0
- GitHub Personal Access Token

1. **Clone the repository**
   ```bash
   git clone https://github.com/Osama-Yusuf/repo-radar.git
   cd repo-radar
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env    # Configure your GitHub token
   npm run dev
   ```

3. **Drizzle Studio (Optionally)**
   ```bash
   npm run studio
   ```

4. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```



4. Open `http://localhost:5173` in your browser

## 🎮 How to Use

1. **Add a Repository**
   - Click "Add Project"
   - Enter repository URL
   - Specify branches to monitor
   - Set check interval

2. **Create Actions**
   - Add webhooks or scripts
   - Configure environment variables
   - Actions trigger on changes

3. **Monitor Changes**
   - View real-time status
   - Check commit history
   - Review action logs

## 🏗️ Architecture

- **Frontend**: React + Material UI
- **Backend**: Node.js + Express
- **Database**: SQLite
- **API**: GitHub REST API v3

## 🛡️ Security

- Secure secrets management
- HTTPS webhook endpoints only
- Sandboxed script execution
- Environment variables protection

## 🤝 Contributing

We love contributions! Check out our [Contributing Guide](CONTRIBUTING.md) for guidelines.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Material-UI](https://mui.com/)
- Powered by [GitHub API](https://docs.github.com/en/rest)
- Inspired by the need for better repository monitoring

---

<p align="center">
Made with ❤️ for developers who love automation
</p>
