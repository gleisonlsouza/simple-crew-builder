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
- **React 18** + **Vite** (Ultra-fast development)
- **Tailwind CSS** (Custom design system)
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

## 🚀 Getting Started

There are two ways to run the Simple Crew Builder: using **Docker (Recommended)** or **Individually**.

### 📦 Option 1: Running with Docker (easiest)

Ensure you have [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed.

1. **Clone the repository**:
   ```bash
   git clone https://github.com/gleisonlsouza/simple-crew-builder.git
   cd simple-crew-builder
   ```

2. **Configure Environment Variables**:
   Copy the example environment file and add your keys.
   ```bash
   cp simple-crew-backend/.env.example simple-crew-backend/.env
   # Edit simple-crew-backend/.env and add your OPENAI_API_KEY (and others)
   ```

3. **Start the containers**:
   ```bash
   docker compose up --build
   ```

The application will be available at:
- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:8000`
- **Postgres**: `localhost:5432`

---

### 🛠 Option 2: Running Individually (Development)

#### 1. Backend Setup
Requires **Python 3.12+** and **Node.js 20+** (if using MCP).

```bash
cd simple-crew-backend
# Install dependencies using 'uv' (recommended)
uv sync
# Or use pip
pip install -r requirements.txt

# Start the FastAPI server
uv run -m uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend Setup
Requires **Node.js 20+**.

```bash
cd simple-crew-front
npm install
npm run dev
```

The application will be available at `http://localhost:5173`.

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
