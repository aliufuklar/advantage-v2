# AdVantage ERP/CRM v3 - Deployment Guide

This guide covers deploying AdVantage ERP/CRM v3 in production environments.

---

## Prerequisites

- **Docker** 20.10+ and **Docker Compose** 2.0+
- **MongoDB** 4.4+ (can be containerized or cloud-hosted)
- **Domain name** (for production)
- **SSL certificate** (for HTTPS)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Load Balancer                          │
│                    (nginx / Traefik)                       │
└─────────────────────────────────────────────────────────────┘
                    │                    │
                    ▼                    ▼
┌─────────────────────────┐   ┌─────────────────────────────┐
│   Frontend (React)      │   │     Backend (FastAPI)        │
│   Port 5173             │   │     Port 8000               │
└─────────────────────────┘   └─────────────────────────────┘
                                          │
                                          ▼
                              ┌─────────────────────────────┐
                              │       MongoDB               │
                              │     Port 27017              │
                              └─────────────────────────────┘
```

---

## Docker Configuration

### Project Structure

```
advantage-v2/
├── apps/
│   ├── api/
│   │   ├── app/
│   │   │   └── main.py
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   └── web/
│       ├── src/
│       ├── Dockerfile
│       └── package.json
├── docs/
├── docker-compose.yml
└── .env
```

### Backend Dockerfile

Create `apps/api/Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY app/ ./app/

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Backend Requirements

Create `apps/api/requirements.txt`:

```
fastapi==0.109.0
uvicorn[standard]==0.27.0
motor==3.3.2
pydantic==2.5.3
pydantic-settings==2.1.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
```

### Frontend Dockerfile

Create `apps/web/Dockerfile`:

```dockerfile
FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]
```

### nginx Configuration

Create `apps/web/nginx.conf`:

```nginx
server {
    listen 5173;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Docker Compose

Create `docker-compose.yml` in project root:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7
    container_name: advantage-mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_DATABASE: advantage_v3
    volumes:
      - mongodb_data:/data/db
    ports:
      - "27017:27017"
    networks:
      - advantage-network

  backend:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    container_name: advantage-backend
    restart: unless-stopped
    environment:
      MONGODB_URL: mongodb://mongodb:27017
      MONGODB_DB: advantage_v3
      JWT_SECRET_KEY: ${JWT_SECRET_KEY}
      JWT_ALGORITHM: HS256
      JWT_ACCESS_TOKEN_EXPIRE_MINUTES: 60
      DEBUG: "false"
    ports:
      - "8000:8000"
    depends_on:
      - mongodb
    networks:
      - advantage-network

  frontend:
    build:
      context: ./apps/web
      dockerfile: Dockerfile
    container_name: advantage-frontend
    restart: unless-stopped
    ports:
      - "5173:5173"
    depends_on:
      - backend
    networks:
      - advantage-network

volumes:
  mongodb_data:
    driver: local

networks:
  advantage-network:
    driver: bridge
```

---

## Environment Variables

### Backend (.env)

```env
# Application
APP_NAME=AdVantage API
DEBUG=false
VERSION=3.0.0

# MongoDB
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB=advantage_v3

# JWT (CHANGE IN PRODUCTION - use strong random key)
JWT_SECRET_KEY=your-very-long-secret-key-here-min-32-chars
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60

# CORS
CORS_ORIGINS=https://your-domain.com,https://app.your-domain.com
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:8000
```

---

## Deployment Steps

### 1. Prepare Production Build

```bash
# Clone and navigate to project
git clone https://github.com/your-org/advantage-v2.git
cd advantage-v2

# Set environment variables
export JWT_SECRET_KEY=$(openssl rand -hex 32)
```

### 2. Build and Start

```bash
# Build and start all services
docker-compose up -d --build

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### 3. Verify Deployment

```bash
# Check backend health
curl http://localhost:8000/api/health

# Check frontend
curl http://localhost:5173

# Access Swagger docs
curl http://localhost:8000/docs
```

---

## Production with Nginx (Bare Metal)

### Backend Service (systemd)

Create `/etc/systemd/system/advantage-api.service`:

```ini
[Unit]
Description=AdVantage API Service
After=network.target mongodb.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/advantage/apps/api
ExecStart=/opt/advantage/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5
Environment="MONGODB_URL=mongodb://localhost:27017"
Environment="MONGODB_DB=advantage_v3"
Environment="JWT_SECRET_KEY=your-secret-key"

[Install]
WantedBy=multi-user.target
```

### Nginx Configuration

Create `/etc/nginx/sites-available/advantage`:

```nginx
upstream backend {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name api.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.your-domain.com;

    ssl_certificate /etc/ssl/certs/your-cert.pem;
    ssl_certificate_key /etc/ssl/private/your-key.pem;

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    location /docs {
        proxy_pass http://backend;
        proxy_set_header Host $host;
    }

    location /redoc {
        proxy_pass http://backend;
        proxy_set_header Host $host;
    }
}

server {
    listen 80;
    server_name app.your-domain.com;
    root /var/www/advantage/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## MongoDB Connection

### Local MongoDB

```env
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB=advantage_v3
```

### MongoDB Atlas (Cloud)

```env
MONGODB_URL=mongodb+srv://<username>:<password>@<cluster>.mongodb.net
MONGODB_DB=advantage_v3
```

### MongoDB Replica Set

```env
MONGODB_URL=mongodb://host1:27017,host2:27017,host3:27017/?replicaSet=rs0
MONGODB_DB=advantage_v3
```

---

## SSL/TLS Configuration

### Using Let's Encrypt

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.your-domain.com -d app.your-domain.com

# Auto-renew (should already be configured)
sudo certbot renew --dry-run
```

---

## Health Checks

### Backend Health Endpoint

```bash
curl http://localhost:8000/api/health
# Response: {"status": "healthy"}
```

### Docker Health Check

Add to `docker-compose.yml`:

```yaml
backend:
  # ...
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
```

---

## Backup Strategy

### MongoDB Backup

```bash
# Create backup directory
mkdir -p /backups/mongodb

# Backup command (run as cron)
mongodump --uri="mongodb://localhost:27017/advantage_v3" --out=/backups/mongodb/$(date +%Y%m%d_%H%M%S)

# Restore command
mongorestore --uri="mongodb://localhost:27017/advantage_v3" /backups/mongodb/backup_folder
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs backend

# Check environment variables
docker-compose config
```

### MongoDB Connection Issues

```bash
# Test MongoDB connection
docker exec -it advantage-mongodb mongosh --eval "db.adminCommand('ping')"

# Check MongoDB logs
docker-compose logs mongodb
```

### Backend 500 Error

```bash
# Check detailed logs
docker-compose logs backend --tail=100

# Verify JWT_SECRET_KEY is set
docker-compose exec backend env | grep JWT
```

### Frontend Build Fails

```bash
# Rebuild without cache
docker-compose build --no-cache frontend

# Check Node version
docker-compose run frontend node --version
```

---

## Scaling

### Horizontal Scaling (Multiple Backends)

```yaml
services:
  backend:
    # ...
    deploy:
      replicas: 3
    # Use nginx upstream for load balancing
```

### Update Backend Without Downtime

```bash
# Pull latest code
git pull origin main

# Rebuild and restart (rolling update)
docker-compose up -d --build backend

# Verify
curl http://localhost:8000/api/health
```

---

## Security Checklist

- [ ] Change default JWT_SECRET_KEY
- [ ] Enable DEBUG=false in production
- [ ] Configure proper CORS origins
- [ ] Use HTTPS (SSL/TLS)
- [ ] Secure MongoDB with authentication
- [ ] Set up firewall rules
- [ ] Enable rate limiting (at nginx level)
- [ ] Regular backup schedule
- [ ] Monitor logs for suspicious activity
