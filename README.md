# Telegram Drive ☁️

> **Enterprise-grade cloud storage platform powered by Telegram MTProto API**
>
> A complete Google Drive / Dropbox alternative that stores files in your Telegram account.

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌─────────────────┐  ┌────────────────┐  ┌──────────────┐ │
│  │   Next.js App   │  │   Mobile App   │  │   API Client  │ │
│  │   (SSR/SPA)     │  │   (Future)     │  │   (3rd Party) │ │
│  └────────┬────────┘  └────────┬───────┘  └──────┬───────┘ │
└───────────┼─────────────────────┼──────────────────┼────────┘
            │                     │                  │
            │         ┌───────────┴───────────┐      │
            │         │      Nginx Proxy      │      │
            │         │  (SSL, Rate Limit,    │      │
            │         │   Cache, Load Balance)│      │
            │         └───────────┬───────────┘      │
            │                     │                  │
┌───────────┼─────────────────────┼──────────────────┼────────┐
│           │         API Layer   │                  │        │
│           │    ┌────────────────┴─────────────┐    │        │
│           │    │     NestJS Backend (API)      │    │        │
│           │    │  ┌─────────────────────────┐  │    │        │
│           │    │  │  Auth Module            │  │    │        │
│           │    │  │  Telegram Module        │  │    │        │
│           │    │  │  Files Module           │  │    │        │
│           │    │  │  Folders Module         │  │    │        │
│           │    │  │  Shares Module          │  │    │        │
│           │    │  │  Search Module          │  │    │        │
│           │    │  │  Streaming Module       │  │    │        │
│           │    │  │  Storage Module         │  │    │        │
│           │    │  └─────────────────────────┘  │    │        │
│           │    └──────────────┬────────────────┘    │        │
└───────────┼───────────────────┼─────────────────────┼────────┘
            │                   │                     │
┌───────────┼───────────────────┼─────────────────────┼────────┐
│           │    Data Layer     │                     │        │
│           │    ┌──────────────┴──────────────┐      │        │
│           │    │      PostgreSQL (Primary)    │      │        │
│           │    │  - Users, Files, Folders    │      │        │
│           │    │  - Shares, Activity Logs    │      │        │
│           │    │  - Full-text Search         │      │        │
│           │    └──────────────┬──────────────┘      │        │
│           │                   │                      │        │
│           │    ┌──────────────┴──────────────┐      │        │
│           │    │    Redis (Cache + Queue)     │      │        │
│           │    │  - BullMQ Job Queue         │      │        │
│           │    │  - Session Cache            │      │        │
│           │    │  - Rate Limiting            │      │        │
│           │    └──────────────┬──────────────┘      │        │
│           │                   │                      │        │
│           │    ┌──────────────┴──────────────┐      │        │
│           │    │     Worker Service           │      │        │
│           │    │  - Thumbnail Generation     │      │        │
│           │    │  - Metadata Extraction      │      │        │
│           │    │  - Cleanup Jobs             │      │        │
│           │    │  - Share Expiration         │      │        │
│           │    └─────────────────────────────┘      │        │
└───────────┼──────────────────────────────────────────┼────────┘
            │                                          │
            └──────────────┬───────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │   Telegram MTProto API   │
              │   (GramJS Client)        │
              └─────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │   Telegram Servers       │
              │   (File Storage)         │
              └─────────────────────────┘
```

## 📦 Project Structure

```
telegram-drive/
├── apps/
│   ├── api/                    # NestJS Backend API
│   │   ├── src/
│   │   │   ├── main.ts         # Entry point
│   │   │   ├── app.module.ts   # Root module
│   │   │   ├── common/         # Shared utilities
│   │   │   │   ├── decorators/     # @CurrentUser, etc.
│   │   │   │   ├── filters/        # Global exception filters
│   │   │   │   ├── guards/         # Auth guards
│   │   │   │   ├── interceptors/   # Logging, Transform
│   │   │   │   └── pipes/          # Validation pipes
│   │   │   ├── config/         # Configuration modules
│   │   │   ├── database/       # Prisma service
│   │   │   └── modules/
│   │   │       ├── auth/       # Authentication module
│   │   │       ├── telegram/   # Telegram MTProto module
│   │   │       ├── files/      # File management module
│   │   │       ├── folders/    # Folder management module
│   │   │       ├── shares/     # Share links module
│   │   │       ├── search/     # Full-text search module
│   │   │       ├── streaming/  # Video/audio streaming module
│   │   │       ├── queue/      # BullMQ job queue module
│   │   │       ├── storage/    # Storage analytics module
│   │   │       └── health/     # Health check module
│   │   ├── prisma/             # Database schema
│   │   └── test/               # Test files
│   ├── web/                    # Next.js Frontend
│   │   ├── src/
│   │   │   ├── app/            # App Router pages
│   │   │   │   ├── login/      # Telegram OTP login
│   │   │   │   ├── drive/      # Main drive interface
│   │   │   │   │   ├── starred/
│   │   │   │   │   ├── shared/
│   │   │   │   │   ├── recent/
│   │   │   │   │   ├── trash/
│   │   │   │   │   └── settings/
│   │   │   │   └── shared/     # Public share pages
│   │   │   ├── components/     # React components
│   │   │   │   ├── layout/     # Sidebar, TopBar, Providers
│   │   │   │   ├── files/      # FileGrid, FileCard, FileList
│   │   │   │   ├── folders/    # FolderCard, FolderTree
│   │   │   │   ├── upload/     # UploadModal, Dropzone
│   │   │   │   └── shared/     # ShareModal
│   │   │   ├── hooks/          # React Query hooks
│   │   │   ├── store/          # Zustand state management
│   │   │   ├── lib/            # API client, utilities
│   │   │   └── types/          # TypeScript types
│   │   └── public/             # Static assets
│   └── worker/                 # BullMQ Background Worker
│       └── src/
│           ├── main.ts         # Worker entry point
│           └── processors/     # Job processors
├── packages/
│   ├── shared/                 # Shared types and utilities
│   └── database/               # Prisma schema package
├── docker/                     # Docker configuration
├── nginx/                      # Nginx configuration
├── .github/workflows/          # CI/CD pipelines
└── infra/                      # Infrastructure as code
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose
- Telegram API credentials (from https://my.telegram.org/apps)

### Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-org/telegram-drive.git
cd telegram-drive

# 2. Install dependencies
pnpm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your Telegram API credentials and secrets

# 4. Start infrastructure (PostgreSQL + Redis)
docker compose up -d postgres redis

# 5. Initialize database
pnpm db:migrate

# 6. Start development servers
pnpm dev
```

### Production Deployment

```bash
# 1. Build all services
pnpm build

# 2. Start all services with Docker Compose
docker compose up -d

# 3. Run database migrations
docker compose exec api npx prisma migrate deploy

# 4. Verify health
curl http://localhost:4000/health
```

## 🔐 Authentication Flow

```
User                   Frontend               Backend                Telegram
 │                       │                      │                      │
 │  1. Enter phone       │                      │                      │
 ├──────────────────────►│                      │                      │
 │                       │  2. POST /auth/send-code                    │
 │                       ├─────────────────────►│                      │
 │                       │                      │  3. API.sendCode()   │
 │                       │                      ├─────────────────────►│
 │                       │                      │◄─────────────────────┤
 │                       │◄─────────────────────┤                      │
 │  4. Enter OTP code    │                      │                      │
 ├──────────────────────►│                      │                      │
 │                       │  5. POST /auth/verify-code                  │
 │                       ├─────────────────────►│                      │
 │                       │                      │  6. API.signIn()     │
 │                       │                      ├─────────────────────►│
 │                       │                      │◄─────────────────────┤
 │                       │                      │                      │
 │                       │                      │  7. If 2FA required  │
 │                       │                      │  - Ask for password  │
 │                       │◄─────────────────────┤                      │
 │  8. Enter 2FA password│                      │                      │
 ├──────────────────────►│                      │                      │
 │                       │  9. POST verify with password               │
 │                       ├─────────────────────►│                      │
 │                       │                      │  API.checkPassword() │
 │                       │                      ├─────────────────────►│
 │                       │                      │◄─────────────────────┤
 │                       │                      │                      │
 │                       │                      │  10. Encrypt session │
 │                       │                      │  11. Generate JWT    │
 │                       │                      │  12. Store session   │
 │                       │◄─────────────────────┤                      │
 │  13. Redirect to      │                      │                      │
 │      /drive           │                      │                      │
 │◄──────────────────────┤                      │                      │
```

## 💾 Database Schema

```sql
-- Users table: Core user accounts linked to Telegram
users (
  id UUID PK,
  telegram_id BIGINT UNIQUE,
  phone_number VARCHAR,
  first_name VARCHAR,
  last_name VARCHAR,
  username VARCHAR,
  storage_used BIGINT DEFAULT 0,
  storage_limit BIGINT DEFAULT 5368709120, -- 5GB default
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Telegram sessions: Encrypted MTProto sessions
telegram_sessions (
  id UUID PK,
  user_id UUID FK -> users.id,
  encrypted_session TEXT, -- AES-256 encrypted
  session_id VARCHAR UNIQUE,
  is_active BOOLEAN,
  expires_at TIMESTAMP
)

-- JWT sessions: Refresh token management
jwt_sessions (
  id UUID PK,
  user_id UUID FK -> users.id,
  refresh_token VARCHAR UNIQUE,
  is_active BOOLEAN,
  expires_at TIMESTAMP
)

-- Files: Storage objects (mapped to Telegram messages)
files (
  id UUID PK,
  user_id UUID FK -> users.id,
  folder_id UUID FK -> folders.id,
  name VARCHAR,
  mime_type VARCHAR,
  size BIGINT,
  hash TEXT, -- SHA-256 for dedup
  telegram_message_id INT,
  telegram_channel_id BIGINT,
  is_encrypted BOOLEAN,
  is_starred BOOLEAN,
  is_trashed BOOLEAN,
  version INT DEFAULT 1,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Folders: Directory structure
folders (
  id UUID PK,
  user_id UUID FK -> users.id,
  parent_id UUID FK -> folders.id,
  name VARCHAR,
  path TEXT, -- Materialized path
  UNIQUE(user_id, parent_id, name)
)

-- Shares: Public share links
shares (
  id UUID PK,
  user_id UUID FK -> users.id,
  file_id UUID FK -> files.id,
  token VARCHAR UNIQUE,
  permission ENUM('VIEW','DOWNLOAD','EDIT'),
  password TEXT, -- bcrypt hash
  max_downloads INT,
  download_count INT DEFAULT 0,
  expires_at TIMESTAMP,
  is_active BOOLEAN
)

-- Thumbnails: Generated previews
thumbnails (
  id UUID PK,
  file_id UUID FK -> files.id UNIQUE,
  data BYTEA, -- WebP binary
  width INT,
  height INT
)

-- Activity logs: Audit trail
activity_logs (
  id UUID PK,
  user_id UUID FK -> users.id,
  file_id UUID FK -> files.id,
  action VARCHAR, -- UPLOAD, DELETE, RENAME, SHARE, etc.
  details JSONB,
  created_at TIMESTAMP
)
```

## 🔄 Upload Pipeline

```
User Upload ──► Frontend ──► API ──► Telegram
   │              │           │          │
   │  1. Select   │           │          │
   │   file       │           │          │
   ├─────────────►│           │          │
   │              │  2. POST  │          │
   │              │   /upload │          │
   │              ├──────────►│          │
   │              │           │          │
   │              │  3. Validate:        │
   │              │     - MIME type      │
   │              │     - File size      │
   │              │     - Storage quota  │
   │              │     - Virus scan     │
   │              │           │          │
   │              │  4. Compute SHA-256   │
   │              │  5. Check dedup      │
   │              │           │          │
   │              │  6. Optional: Encrypt│
   │              │     (AES-256-CBC)    │
   │              │           │          │
   │              │  7. Upload to        │
   │              │     Telegram         │
   │              ├──────────┤──────────►│
   │              │           │          │
   │              │  8. Store metadata   │
   │              │     in PostgreSQL    │
   │              │           │          │
   │              │  9. Queue:           │
   │              │     - Thumbnail gen  │
   │              │     - Metadata ext   │
   │              │     - Analytics      │
   │              │           │          │
   │  10. Return  │           │          │
   │     File obj ◄───────────┤          │
   │◄─────────────┤           │          │
```

## 📡 Streaming Architecture

```
Client                     API                    Telegram
  │                        │                       │
  │  1. GET /stream/:id    │                       │
  │     Range: bytes=0-    │                       │
  ├───────────────────────►│                       │
  │                        │  2. Fetch session     │
  │                        │  3. Decrypt session   │
  │                        │                       │
  │                        │  4. Download from     │
  │                        │     Telegram          │
  │                        ├──────────────────────►│
  │                        │◄──────────────────────┤
  │                        │                       │
  │                        │  5. Decrypt if needed │
  │                        │                       │
  │  6. 206 Partial        │                       │
  │     Content            │                       │
  │◄───────────────────────┤                       │
  │                        │                       │
  │  7. Continue range     │                       │
  │     requests for       │                       │
  │     video/audio        │                       │
```

## 🔒 Security Architecture

### Encryption Layers

1. **Transport Security**: TLS 1.3 (HTTPS)
2. **Telegram Sessions**: AES-256-CBC encrypted at rest
3. **JWT Tokens**: RS256 signed, short-lived (15min access, 7 day refresh)
4. **End-to-End Encryption**: Optional client-side encryption (zero-knowledge)
5. **Password Hashing**: bcrypt for share passwords
6. **File Integrity**: SHA-256 hashing for deduplication

### Security Measures

- Helmet.js security headers
- CSRF protection with double-submit cookies
- Rate limiting per IP (100 req/60s)
- Input validation & sanitization
- SQL injection prevention (Prisma ORM)
- XSS prevention (React JSX escaping)
- Secure HTTP-only cookies
- CORS strict origin policy
- Audit logging for all sensitive operations

## 📊 Queue System Architecture

```
                    Redis (BullMQ)
                    ┌──────────┐
                    │  Queues   │
                    │ ┌──────┐  │
                    │ │upload│  │
                    │ ├──────┤  │
                    │ │thumb │  │
                    │ ├──────┤  │
                    │ │meta  │  │
                    │ ├──────┤  │
                    │ │clean │  │
                    │ └──────┘  │
                    └──────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   Worker 1          Worker 2         Worker N
        │                │                │
   ┌────┴────┐     ┌────┴────┐      ┌────┴────┐
   │Thumbnail│     │Metadata │      │ Cleanup │
   │Generator│     │Extractor│      │  Jobs   │
   └─────────┘     └─────────┘      └─────────┘
```

## 🐳 Docker Configuration

### Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `postgres` | postgres:16-alpine | 5432 | Primary database |
| `redis` | redis:7-alpine | 6379 | Cache & queue backend |
| `api` | tgdrive-api | 4000 | NestJS backend |
| `web` | tgdrive-web | 3000 | Next.js frontend |
| `worker` | tgdrive-worker | — | Background jobs |
| `nginx` | nginx:alpine | 80/443 | Reverse proxy |

### Environment Variables

```bash
# Required
TELEGRAM_API_ID=123456               # From my.telegram.org
TELEGRAM_API_HASH=abc123def456       # From my.telegram.org
JWT_ACCESS_SECRET=<32+ char secret>  # Random string
JWT_REFRESH_SECRET=<32+ char secret> # Random string
ENCRYPTION_KEY=<64 char hex>         # 32 bytes in hex

# Optional (with defaults)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/telegram_drive
REDIS_URL=redis://localhost:6379
NODE_ENV=development
PORT=4000
```

## 🚢 Deployment

### Option 1: Docker Compose (Single Server)

```bash
# Set up environment
cp .env.example .env
# Edit .env with secrets

# Deploy
docker compose up -d

# Migrate database
docker compose exec api npx prisma migrate deploy
```

### Option 2: Kubernetes (Production)

```bash
# Apply Kubernetes manifests
kubectl apply -f infra/kubernetes/

# Configure secrets
kubectl create secret generic tgdrive-secrets \
  --from-literal=telegram-api-id=xxx \
  --from-literal=telegram-api-hash=xxx
```

### Option 3: Cloud Platforms

| Platform | Configuration |
|----------|---------------|
| **Railway** | Connect GitHub repo, set env vars, add PostgreSQL & Redis |
| **Fly.io** | `fly launch` with Dockerfile, attach Postgres + Redis |
| **AWS ECS** | Use `docker-compose.yml` with ECS CLI |
| **DigitalOcean** | App Platform with Dockerfile |

## 📈 Scaling Strategy

### Horizontal Scaling

```
                    ┌──────────┐
                    │  Nginx    │
                    │  LB       │
                    └────┬─────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   ┌────┴────┐     ┌────┴────┐      ┌────┴────┐
   │  API 1   │     │  API 2   │      │  API N   │
   └─────────┘     └─────────┘      └─────────┘
        │                │                │
        └────────────────┼────────────────┘
                         │
                    ┌────┴────┐
                    │  Redis  │
                    │(Cluster)│
                    └─────────┘
```

### Database Scaling

1. **Read Replicas**: Add PostgreSQL read replicas for search queries
2. **Connection Pooling**: PgBouncer for connection management
3. **Partitioning**: Partition `files` and `activity_logs` by user_id
4. **Caching**: Redis caching for frequently accessed data

### Performance Optimizations

- Pagination for all list endpoints
- Materialized paths for folder navigation
- Database indexes on all foreign keys and frequently queried columns
- Lazy loading for thumbnails
- HTTP range requests for streaming
- Compression (gzip/brotli) for API responses
- CDN for static assets

## 📝 API Documentation

Full API documentation is available at `/docs` when the server is running, powered by Swagger.

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/send-code` | Send Telegram OTP |
| `POST` | `/api/v1/auth/verify-code` | Verify OTP & login |
| `POST` | `/api/v1/auth/refresh` | Refresh JWT token |
| `GET` | `/api/v1/files` | List files |
| `POST` | `/api/v1/files/upload` | Upload file |
| `GET` | `/api/v1/files/:id` | Get file details |
| `PATCH` | `/api/v1/files/:id` | Update file |
| `DELETE` | `/api/v1/files/:id` | Trash file |
| `POST` | `/api/v1/folders` | Create folder |
| `GET` | `/api/v1/folders/tree` | Get folder tree |
| `GET` | `/api/v1/search` | Search files |
| `POST` | `/api/v1/shares` | Create share link |
| `GET` | `/api/v1/stream/:id` | Stream file |
| `GET` | `/api/v1/storage/usage` | Get storage usage |

## 🧪 Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Test with coverage
pnpm test -- --coverage

# Frontend tests
cd apps/web && pnpm test
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details.

## ⚠️ Disclaimer

This project uses the Telegram MTProto API for file storage. Users should:
- Comply with Telegram's Terms of Service
- Not store illegal or prohibited content
- Understand that Telegram may impose rate limits
- Keep their API credentials secure
- Use encryption for sensitive data

---

**Built with** ❤️ using NestJS, Next.js, GramJS, PostgreSQL, Redis, and BullMQ
