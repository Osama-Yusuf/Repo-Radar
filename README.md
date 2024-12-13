# 🛰️ Repo Radar

> Your Mission Control Center for GitHub Repositories

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D%2016.0.0-brightgreen)
![React](https://img.shields.io/badge/react-%5E18.0.0-blue)

## 🎯 What is Repo Radar?

Repo Radar is your intelligent GitHub repository monitoring system that keeps you in sync with repository changes and automates responses. Think of it as your personal watchtower that never sleeps! 

🔬 **Want to dive deep into the monitoring magic?** Check out our [Backend Documentation](backend/README.md) to explore the intricate details of how Repo Radar keeps your repositories under constant surveillance.

### 🌟 Key Features

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

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 16.0.0
- GitHub Personal Access Token

### Installation

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
   npm start
   ```

3. **Frontend Setup**
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
