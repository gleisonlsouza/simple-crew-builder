# 🚀 Simple Crew Builder

![Simple Crew Builder](images/simple-crew-builder.png)

[![Coverage](https://img.shields.io/badge/Coverage->88%25-brightgreen)](#-quality--testing-elite-standards)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Simple Crew Builder** is a premium, open-source visual orchestrator for **CrewAI**. It empowers developers and AI enthusiasts to design, configure, and execute complex Multi-Agent systems through a stunning, intuitive drag-and-drop interface.

> "The best way to predict the future is to invent it." — Alan Kay

---

## ✨ Enterprise Features (v0.0.5+)

Simple Crew Builder has evolved into a robust orchestration platform with advanced observability and integration capabilities:

- **🔗 Dynamic Webhook Triggers**: Direct integration with tools like n8n or Make. Configure custom paths with automatic sluggification and real-time mapping of incoming JSON payloads.
- **👁️ Execution Observability**: A dedicated dashboard to monitor every run. Includes visual snapshots of the graph state at execution time, detailed logs, and success/error status.
- **⏳ Time Machine (Re-run Snapshot)**: One-click hydration of the workspace from any historical execution. Fix errors and re-run with the exact same configuration.
- **🧠 Knowledge Base (RAG) Engine**: Neo4j-powered long-term memory, enabling agents to persist knowledge across sessions.
- **📁 Enterprise Code Parsing**: Index entire repositories (React, Python, etc.) via `.zip` uploads, automatically ignoring non-essential files.
- **🔌 MCP Native**: Full support for Model Context Protocol (MCP) servers and the custom Python tool ecosystem.

---

## 🚀 Quick Start (Zero Friction)

Experience the power of Simple Crew Builder in less than 2 minutes using Docker Hub images.

### 1. Download the orchestration file
Save the [docker-compose.yml](docker-compose.yml) to a folder on your machine.

### 2. Launch the stack
```bash
docker compose up -d
```
*Note: No `.env` file is required for local testing. The system uses secure defaults.*

### 3. Access & Gear Up
Open **[http://localhost:8080](http://localhost:8080)** and go to `Settings -> Models` to add your **OPENAI_API_KEY**.

---

## 🛠 Local Development (Manual Setup)

For developers looking to contribute or customize the core engine, follow these steps to run the environment locally.

### 1. External Dependencies (Databases)
The easiest way to run Postgres and Neo4j for local development is using our dev-ready compose file:
```bash
docker compose -f docker-compose.dev.yml up -d db neo4j
```

### 2. Backend Setup (Python)
```bash
cd simple-crew-backend
# Create & activate virtualenv
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
# .\.venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Run server with hot reload
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup (React)
```bash
cd simple-crew-front
npm install
npm run dev
```
The frontend will be available at **http://localhost:5173**.

---

## 🏆 Quality & Testing (Elite Standards)

We maintain high architectural standards to ensure stability in complex AI workflows.

### Coverage & Reliability
We follow an **Elite Coverage (>80%)** standard for all new components and logic slices.

- **Frontend Tests**: Powered by **Vitest** and **React Testing Library**.
- **Coverage Command**:
  ```bash
  cd simple-crew-front
  npm run test:coverage
  ```

---

## 🧰 Tech Stack

- **Orchestration:** [CrewAI](https://www.crewai.com/)
- **Frontend Architecture:** React 19 + Zustand (**Slices Pattern**) + Vite + Tailwind CSS v4
- **Backend:** FastAPI (Python 3.12) + Pydantic v2
- **Testing:** Vitest + Playwright (E2E)
- **Persistence:** PostgreSQL 15 + Neo4j 5.23 (Vector Graph)
- **Visuals:** React Flow + Mermaid.js

---

## 🐳 Docker Architecture

```mermaid
graph TD
    User([User Browser]) -- port 8080 --> Frontend[Frontend - Nginx Proxy]
    Frontend -- /api/* --> Backend[Backend - FastAPI]
    Backend -- SQL --> DB[(PostgreSQL)]
    Backend -- Vector/Graph --> Neo4j[(Neo4j DB)]
```

---

## 🤝 Contributing

This is an **Open Source** project and we ❤️ contributions! 

1. **Fork** the repository.
2. **Create** a feature branch (`git checkout -b feature/AmazingFeature`).
3. **Commit** your changes (`git commit -m 'Add some AmazingFeature'`).
4. **Push** to the branch.
5. **Open** a Pull Request.

---

## 👨‍💻 Author

Created with ❤️ by **[Gleison Souza](https://www.linkedin.com/in/gleisonlsouza/)**

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---

*Let your imagination run wild and build the future of AI agents today!*
