<div align="center">
  <h1>💬 Ace Chat Platform</h1>
  <p><b>A Highly Scalable, Real-Time Messaging Architecture Engine</b></p>
</div>

## 📖 Overview
**Ace Chat** is a real-time WebSocket communication mesh engineered specifically for extreme message throughput and unbreakable horizontal scaling. By intelligently decoupling pub/sub event channels via Kafka and persisting distributed state layers natively in Redis, the platform effortlessly bridges concurrent users across distributed server instances.

## 🚀 Architectural Backbone

### 🔌 Real-Time WebSocket Engine
Operating strictly on persistent, low-latency WebSocket connections to guarantee instantaneous bi-directional packet delivery between isolated clients.

### 🐘 Kafka Throughput Processing
To prevent bottlenecks during massive communication bursts, all payload pipelines are asynchronously streamed through an Apache Kafka cluster. This decouples the real-time ingest pipeline from the execution layer, enabling massive throughput and absolute delivery reliability regardless of the load.

### ⚡ Redis Horizontal Scaling
Because WebSockets are stateful, load balancers traditionally break isolated connections. Ace Chat circumvents this bottleneck by caching and persisting user `socket.id` session maps within a shared, high-speed **Redis** cluster. 
Server clusters can be infinitely spun up or destroyed horizontally—the platform maintains exact connection awareness at all times.

### 📊 Observability & Telemetry Stack
Complete infrastructure tracking enabling dynamic alerting and metrics tracing:
- **Prometheus**: Aggregates time-series data covering hardware stress, network latency, and memory allocation.
- **Grafana**: Beautiful internal dashboarding graphing the Kafka throughput rates and active WebSocket lifecycle counts.
- **Loki**: Centralizes application logs across the distributed clusters for rapid debugging without SSH access.

### ☁️ Production Deployment (AWS + Edge Network)
- **Compute Layer**: Fully deployed and natively containerized on robust **AWS EC2 Linux Instances**.
- **Reverse Proxy**: Routed efficiently through an internal **Nginx** load-balancing tunnel.
- **Edge Security**: Completely obscured and guarded using **Cloudflare** networks (DDoS protection, CDN caching, and edge-level encrypted handshakes).

## 🛠️ Technology Setup

```bash
# Core Technologies
WebSockets (ws)
Redis (Session & ID Layer)
Apache Kafka (Event Bus Streaming)
```

## 📥 Local Deployment Steps

1. **Clone the Engine**:
```bash
git clone https://github.com/PHYNiX29/Ace-chat-app.git
cd Ace-chat-app
```
2. **Boot the Dependencies**:
Make sure Docker is running via Docker Compose to instantiate Kafka, Redis, and Prometheus networks:
```bash
docker-compose up -d
```
3. **Launch the Node clusters**:
```bash
npm install
npm run start
```

---
*Ace Chat – Redefining the Limits of Horizontal Scaling*
