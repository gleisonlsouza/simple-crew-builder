# 🚀 Simple Crew Builder

![Simple Crew Builder](images/simple-crew-builder.png)

**Simple Crew Builder** is a premium, open-source visual orchestrator for **CrewAI**. It empowers developers and AI enthusiasts to design, configure, and execute complex Multi-Agent systems through a stunning, intuitive drag-and-drop interface.

> "The best way to predict the future is to invent it." — Alan Kay

Built with a focus on ease of use and visual excellence, Simple Crew Builder removes the friction of configuring agents, tasks, and tools, letting your imagination run wild.

---

## ✨ Features

- **Visual Workflow Designer**: Orchestrate Agents, Tasks, and Crews using a powerful React Flow canvas.
- **Real-time Execution Streaming**: Watch your agents "think" and act in real-time via Server-Sent Events (SSE).
- **Dynamic Status Monitoring**: Visual cues (colors and animations) show exactly where your execution is at any moment.
- **Advanced Configuration**: Full support for LLM parameters, Custom Python Tools, and MCP (Model Context Protocol) servers.
- **Docker Ready**: Deploy everything seamlessly with a single command.
- **Premium Aesthetics**: A modern, dark-themed UI designed for a high-end experience.

---

## 🛠 Tech Stack

### Frontend
- **React 19** + **Vite** (Ultra-fast development)
- **Tailwind CSS v4** (Custom design system)
- **Zustand** (State management)
- **React Flow** (Visual orchestration engine)
- **Lucide React** (Premium icons)

### Backend
- **Python 3.12**
- **FastAPI** (High-performance API with streaming)
- **CrewAI** (The heavy-lifting Multi-Agent framework)
- **PostgreSQL** (Persistent storage for configurations)
- **Docker & Docker Compose** (Containerization)

---

## 📁 Project Structure

```
simple-crew-builder/
├── simple-crew-backend/        # Python FastAPI backend
│   ├── app/                    # Application code
│   ├── Dockerfile              # Production Docker image
│   ├── examplo.env             # 👈 Rename to .env
│   └── pyproject.toml          # Python dependencies
├── simple-crew-front/          # React frontend
│   ├── src/                    # Application code
│   ├── Dockerfile              # Production image (Nginx + Reverse Proxy)
│   ├── Dockerfile.dev          # Development image (Vite Hot Reload)
│   ├── nginx.conf              # Nginx config with API reverse proxy
│   └── examplo.env.development # 👈 Rename to .env.development
├── docker-compose.yml          # 🐳 Production (Docker Hub images)
├── docker-compose.dev.yml      # 🔧 Development (local build)
└── .github/workflows/          # CI/CD pipeline
```

---

## 🚀 Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) (for Docker options)
- [Python 3.12+](https://www.python.org/) and [uv](https://docs.astral.sh/uv/) (for local backend)
- [Node.js 20+](https://nodejs.org/) (for local frontend and MCP tools)
- [PostgreSQL 15+](https://www.postgresql.org/) (for local database)

---

## 📦 Option 1: Docker Production (Recommended)

Uses official images from **Docker Hub**. No build needed.

**1. Clone and configure:**

```bash
git clone https://github.com/gleisonlsouza/simple-crew-builder.git
cd simple-crew-builder
```

**2. Create a `.env` at the project root with your OpenAI key:**

```bash
echo "OPENAI_API_KEY=sk-proj-your-key-here" > .env
```

**3. Start everything:**

```bash
docker compose pull
docker compose up
```

**4. Access the application:**

| Service | URL |
|---------|-----|
| **Frontend** | `http://localhost:8080` |
| **Backend API** | `http://localhost:8000` |
| **Database** | `localhost:5432` |

> 💡 In production mode, the frontend uses **Nginx** as a reverse proxy. All `/api/` requests are automatically routed to the backend internally — no CORS issues.

---

## 🔧 Option 2: Docker Development (with Hot Reload)

Builds images locally from source code and enables live file watching.

**1. Configure the backend environment:**

```bash
cp simple-crew-backend/examplo.env simple-crew-backend/.env
# Edit simple-crew-backend/.env and add your OPENAI_API_KEY
```

**2. Configure the frontend environment:**

```bash
cp simple-crew-front/examplo.env.development simple-crew-front/.env.development
```

**3. Start the development stack:**

```bash
docker compose -f docker-compose.dev.yml up --build
```

| Service | URL |
|---------|-----|
| **Frontend (Vite)** | `http://localhost:5173` |
| **Backend API** | `http://localhost:8000` |
| **Database** | `localhost:5432` |

---

## 🛠 Option 3: Running Locally (No Docker)

For full control and debugging. Requires PostgreSQL running locally.

### 1. Backend Setup

```bash
cd simple-crew-backend

# Copy and configure environment
cp examplo.env .env
# Edit .env → add your OPENAI_API_KEY

# Install dependencies with uv
uv sync

# Start the server
uv run -m uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd simple-crew-front

# Copy and configure environment
cp examplo.env.development .env.development

# Install dependencies
npm install

# Start the dev server
npm run dev
```

| Service | URL |
|---------|-----|
| **Frontend (Vite)** | `http://localhost:5173` |
| **Backend API** | `http://localhost:8000` |

---

## 🐳 Docker Architecture

```
┌─────────────────────────────────────────────────┐
│                   Docker Network                │
│                                                 │
│  ┌──────────┐   ┌───────────┐   ┌───────────┐  │
│  │ Postgres │   │  Backend  │   │  Frontend  │  │
│  │ :5432    │◄──│  :8000    │◄──│  Nginx :80 │  │
│  └──────────┘   └───────────┘   └─────┬─────┘  │
│                                       │         │
└───────────────────────────────────────┼─────────┘
                                        │
                              Browser :8080
                           ┌────────────┴────────────┐
                           │ /        → React SPA    │
                           │ /api/*   → Backend      │
                           └─────────────────────────┘
```

### Compose Files Comparison

| | `docker-compose.yml` | `docker-compose.dev.yml` |
|--|---|---|
| **Purpose** | Production | Development |
| **Images** | Docker Hub (`latest`) | Local build |
| **Frontend** | Nginx (port `8080→80`) | Vite (port `5173`) |
| **API Routing** | Nginx reverse proxy | Direct `localhost:8000` |
| **Hot Reload** | ❌ | ✅ |
| **Volumes** | Data persistence only | Source code mounted |

---

## ⚙️ Environment Variables

### Backend (`simple-crew-backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | Your OpenAI API key | *(required)* |
| `MODEL` | Default LLM model | `gpt-4o-mini` |
| `POSTGRES_DATABASE_URL` | Database connection string | `postgresql://postgres:postgres@localhost:5432/simple-crew-builder` |

### Frontend (`simple-crew-front/.env.development`)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend URL for dev mode | `http://localhost:8000` |

> ⚠️ In production, `VITE_API_URL` is **not needed**. Nginx handles API routing automatically.

---

## 🤝 Contributing

This is an **Open Source** project and we ❤️ contributions! 
Whether it's a bug report, a new feature, or a documentation improvement, feel free to open a Pull Request or Issue.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 👨‍💻 Author

Created with ❤️ by **[Gleison Souza](https://www.linkedin.com/in/gleisonlsouza/)**

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---

*Let your imagination run wild and build the future of AI agents today!*
