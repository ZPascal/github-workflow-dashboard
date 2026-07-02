
# Github Workflow Dashboard

Online demonstration

https://github-workflow-dashboard.vercel.app

All data stored on your browser.

## Introduction

Github Workflow Dashboard is a web app for visualizing, monitoring, and managing GitHub Actions workflows across multiple repositories and organizations. It provides a unified dashboard to track workflow status, recent runs, and repository health, making it easy for teams to stay on top of CI/CD activity.

### Main Features
- View workflow status and history for multiple repositories
- Monitor recent runs and repository health
- Manage GitHub tokens and settings
- **GitHub Enterprise Server support** — configure a custom API base URL
- Easy deployment options (npm, Docker, Vercel)

### Screenshots

**Main Page**

![Main Page](./docs/main-page.png)

**Settings Page**

![Settings Page](./docs/settings.png)

**Various Modes**

Various filters and compact mode, mobile friendly

![Different Modes](./docs/modes.png)


## GitHub Enterprise Server

If your organization runs GitHub Enterprise Server (GHES), you can point the dashboard at your instance's API instead of `api.github.com`.

1. Open **Settings** in the dashboard.
2. Find the **GitHub API URL** card.
3. Enter your instance's API base URL, e.g. `https://github.example.com/api/v3`.
4. Click **Apply** — the dashboard will re-validate your token against the new endpoint.

To revert to GitHub.com, click **Reset to default** in the same card.

Your custom URL is stored locally in the browser alongside your token and persists across sessions.

## Quick Start

### 1. Run with npm

```bash
npm install
npm start
```
This will start the development server. Open your browser to `http://localhost:3000` to view the dashboard.

### 2. Build Static Files and Serve Locally/CDN

```bash
npm install
npm run build
npm run export
```
The static files will be generated in the `out`. You can serve these files locally with a static server:

```bash
npx serve out
```
Or upload the static files to your preferred CDN for production hosting.

### 3. Run with Docker (docker-compose)

Build and start the dashboard using Docker Compose:

```bash
docker-compose up --build
```
This will build the Docker image and start the dashboard at `http://localhost:3000`.

To stop and remove containers:

```bash
docker-compose down
```

## Acknowledgements

Based on the original work by [cheney-yan](https://github.com/cheney-yan/github-workflow-dashboard).
