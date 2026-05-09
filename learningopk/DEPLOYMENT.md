# LearningoPK Production Deployment Guide

Deploy LearningoPK using AWS free tier (EC2, RDS, ElastiCache, S3) for the backend and Vercel for the Next.js frontend.

## Architecture

```
                          ┌──────────────────────────────────────────┐
                          │              AWS Cloud                   │
                          │                                          │
  ┌─────────────┐         │  ┌─────────────┐    ┌────────────────┐  │
  │   Vercel    │  HTTPS  │  │   EC2 (t2)  │    │  RDS (t3.micro)│  │
  │  Frontend   │◄───────►│  │  ┌────────┐ │    │  PostgreSQL 16 │  │
  │  (Next.js)  │         │  │  │ Nginx  │◄├────┤    learningo   │  │
  │             │         │  │  │ :80/443│ │    │    :5432       │  │
  └─────────────┘         │  │  └───┬────┘ │    └────────────────┘  │
                          │  │      │      │                        │
                          │  │  ┌───▼────┐ │    ┌────────────────┐  │
                          │  │  │Backend │◄├────┤  ElastiCache   │  │
                          │  │  │ :3001  │ │    │  Redis 7       │  │
                          │  │  └───┬────┘ │    │  :6379         │  │
                          │  └──────┼──────┘    └────────────────┘  │
                          │         │                               │
                          │    ┌────▼─────┐                         │
                          │    │   S3      │                        │
                          │    │  Bucket   │                        │
                          │    └──────────┘                         │
                          └──────────────────────────────────────────┘
```

- **Vercel** serves the Next.js frontend on your custom domain (e.g. `yourdomain.com`)
- **EC2** runs the Express backend + Nginx reverse proxy inside Docker containers
- **Nginx** terminates SSL (Let's Encrypt), handles rate limiting, and proxies to the backend
- **RDS** provides a managed PostgreSQL 16 database
- **ElastiCache** provides a managed Redis 7 instance for sessions and caching
- **S3** stores uploaded user media (profile images, quiz attachments)
- **Mistral AI** powers the AI tutor chat (external API, free tier available)

## Prerequisites

- AWS account with billing enabled (everything below uses free tier resources)
- Vercel account (free tier, sign up at vercel.com)
- Mistral AI API key (free, sign up at console.mistral.ai and create a key)
- A domain name registered with any provider (e.g., Namecheap, Cloudflare, Route53)
- Git installed on your local machine
- An SSH client (built into macOS/Linux; use Git Bash or WSL on Windows)
- A GitHub repository for the project (public or private)

## Part 1: AWS Infrastructure

All AWS resources are created in the **same region** to avoid cross-region networking issues. Pick a region close to your users (e.g., `us-east-1` or `eu-west-1`). Use the same region for every service below.

### 1.1 Security Groups

Security groups act as virtual firewalls. Each AWS resource must be assigned the correct security group to allow traffic between services.

Go to **AWS Console → EC2 → Security Groups** (left sidebar under "Network & Security") and create three security groups:

#### 1.1.1 Security Group: `learningopk-ec2`

Click **Create security group**.

| Field | Value |
|---|---|
| Security group name | `learningopk-ec2` |
| Description | `Allow SSH, HTTP, HTTPS to EC2 instance` |
| VPC | (use default VPC) |

Add **inbound rules**:

| Type | Protocol | Port range | Source | Description |
|---|---|---|---|---|
| SSH | TCP | 22 | 0.0.0.0/0 | Remote SSH access |
| HTTP | TCP | 80 | 0.0.0.0/0 | Nginx HTTP |
| HTTPS | TCP | 443 | 0.0.0.0/0 | Nginx HTTPS |

Click **Create security group**.

#### 1.1.2 Security Group: `learningopk-rds`

Click **Create security group**.

| Field | Value |
|---|---|
| Security group name | `learningopk-rds` |
| Description | `Allow PostgreSQL from EC2` |
| VPC | (use default VPC) |

Add **inbound rules**:

| Type | Protocol | Port range | Source | Description |
|---|---|---|---|---|
| PostgreSQL | TCP | 5432 | `learningopk-ec2` (select from dropdown) | EC2 to RDS |

Click **Create security group**.

#### 1.1.3 Security Group: `learningopk-redis`

Click **Create security group**.

| Field | Value |
|---|---|
| Security group name | `learningopk-redis` |
| Description | `Allow Redis from EC2` |
| VPC | (use default VPC) |

Add **inbound rules**:

| Type | Protocol | Port range | Source | Description |
|---|---|---|---|---|
| Custom TCP | TCP | 6379 | `learningopk-redis` (security group itself) | Redis cluster communication |
| Custom TCP | TCP | 6379 | `learningopk-ec2` (select from dropdown) | EC2 to Redis |

Click **Create security group**.

### 1.2 RDS PostgreSQL

Go to **AWS Console → RDS → Databases → Create database**.

#### 1.2.1 Configuration

| Setting | Value |
|---|---|
| Engine type | PostgreSQL |
| Engine version | PostgreSQL 16.x (latest available) |
| Templates | Free tier |
| DB instance identifier | `learningopk-db` |
| Master username | `postgres` |
| Master password | Choose a strong password (save it somewhere secure) |
| Confirm password | Re-enter the password |
| DB instance class | `db.t3.micro` |
| Storage type | General Purpose SSD (gp2) |
| Allocated storage | 20 GiB |
| Enable storage autoscaling | Uncheck (or leave off for free tier) |

#### 1.2.2 Connectivity

| Setting | Value |
|---|---|
| Compute resource | Don't connect to an EC2 compute resource |
| VPC | (default VPC) |
| Public access | **No** (the database should only be reachable from EC2) |
| VPC security group | Select **`learningopk-rds`** (uncheck the default one) |
| Availability Zone | No preference |
| Database port | 5432 (default) |

#### 1.2.3 Database Options

| Setting | Value |
|---|---|
| Initial database name | `learningo` |
| DB parameter group | (default) |
| Enable automated backups | Uncheck (free tier; you can enable for ~$0) |
| Enable encryption | Uncheck (free tier) |
| Enable deletion protection | Uncheck (you can enable later) |
| Maintenance | (keep defaults) |

Click **Create database**. Creation takes 5-10 minutes.

#### 1.2.4 Save the Endpoint

Once the database status shows **Available**:

1. Click on the database `learningopk-db`
2. In the **Connectivity & security** tab, find the **Endpoint** (e.g., `learningopk-db.xxxxxxxxx.us-east-1.rds.amazonaws.com`)
3. Note the **Port** (should be `5432`)
4. Save these values - you will need them for the backend `.env` file:
   - **RDS Endpoint**: `learningopk-db.xxxxxxxxx.us-east-1.rds.amazonaws.com`
   - **RDS Port**: `5432`
   - **RDS Username**: `postgres`
   - **RDS Password**: (the password you chose)
   - **RDS Database**: `learningo`

### 1.3 ElastiCache Redis

Go to **AWS Console → ElastiCache → Redis caches → Create**.

#### 1.3.1 Configuration

| Setting | Value |
|---|---|
| Creation method | Design your own cache |
| Cluster mode | Disabled |
| Location | AWS Cloud |
| Name | `learningopk-redis` |
| Description | `LearningoPK session cache` |
| Engine version | 7.x (latest available) |
| Port | 6379 |
| Node type | `cache.t3.micro` |
| Number of replicas | 0 (no replicas for free tier) |

#### 1.3.2 Connectivity

| Setting | Value |
|---|---|
| Network type | IPv4 |
| Advanced VPC settings | (keep defaults) |
| Subnet group | Create new or use existing default |
| Selected security groups | Select **`learningopk-redis`** |

#### 1.3.3 Advanced Settings

| Setting | Value |
|---|---|
| Encryption at rest | Uncheck (free tier) |
| Encryption in transit | Uncheck (free tier; our VPC traffic is internal) |
| Automatic backups | Uncheck |
| Maintenance window | No preference |
| Logs | (keep defaults) |

Click **Create**. Creation takes 5-10 minutes.

#### 1.3.4 Save the Endpoint

Once the status shows **Available**:

1. Click on the cluster `learningopk-redis`
2. Find the **Primary endpoint** (e.g., `learningopk-redis.xxxxxx.ng.0001.use1.cache.amazonaws.com`)
3. Note the **Port** (should be `6379`)
4. Save these values for the backend `.env` file:
   - **Redis Endpoint**: `learningopk-redis.xxxxxx.ng.0001.use1.cache.amazonaws.com`
   - **Redis Port**: `6379`

### 1.4 S3 Bucket

Go to **AWS Console → S3 → Create bucket**.

#### 1.4.1 Bucket Configuration

| Setting | Value |
|---|---|
| Bucket name | Choose a globally unique name, e.g. `learningopk-media-<random>` |
| AWS Region | Same region as EC2/RDS/ElastiCache |
| Object Ownership | ACLs disabled (recommended) |

#### 1.4.2 Public Access Settings

| Setting | Value |
|---|---|
| Block all public access | **Uncheck** (we need public read access for uploaded media) |
| I acknowledge... | Check the box |

Click **Create bucket**.

#### 1.4.3 Bucket Policy

After creation, click on the bucket name → **Permissions** tab → **Bucket policy** → Edit.

Paste this policy (replace `<bucket-name>` with your actual bucket name):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::<bucket-name>/*"
    }
  ]
}
```

Click **Save changes**.

#### 1.4.4 IAM User for S3 Access

Go to **AWS Console → IAM → Users → Create user**.

| Setting | Value |
|---|---|
| User name | `learningopk-s3-access` |
| Provide user access to AWS Console | Uncheck |

Click **Next**.

Select **Attach policies directly** and search for `AmazonS3FullAccess`. Check it.

Click **Next**, then **Create user**.

#### 1.4.5 Create Access Key

Click on the user `learningopk-s3-access` → **Security credentials** tab → **Create access key**.

| Setting | Value |
|---|---|
| Use case | Application running outside AWS |
| Description tag | `LearningoPK S3 Access` |

Click **Create access key**.

Save these values immediately (you cannot see the secret key again):
- **Access Key ID**: e.g., `AKIAIOSFODNN7EXAMPLE`
- **Secret Access Key**: e.g., `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`

Enter the above in your `.env` as:
```
MINIO_ACCESS_KEY=<access-key-id>
MINIO_SECRET_KEY=<secret-access-key>
```

---

**S3 Summary** — Save these values for the `.env` file:
- **S3 Bucket Name**: e.g., `learningopk-media-abc123`
- **S3 Region**: e.g., `us-east-1`
- **S3 Access Key ID**: `AKIAIOSFODNN7EXAMPLE`
- **S3 Secret Access Key**: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`

### 1.5 EC2 Instance

Go to **AWS Console → EC2 → Instances → Launch an instance**.

#### 1.5.1 Instance Configuration

| Setting | Value |
|---|---|
| Name | `learningopk-backend` |
| Application/OS Image | Ubuntu Server 24.04 LTS (HVM), SSD Volume Type |
| Architecture | 64-bit (x86) |
| Instance type | `t2.micro` (free tier eligible) |
| Key pair (login) | Click **Create new key pair** |

Key pair creation dialog:

| Setting | Value |
|---|---|
| Key pair name | `learningopk` |
| Key pair type | RSA |
| Private key file format | `.pem` (for OpenSSH/Linux/Mac) |

The `.pem` file will download automatically. Save it to a secure location on your local machine (e.g., `~/.ssh/learningopk.pem` or `C:\Users\<you>\.ssh\learningopk.pem`).

#### 1.5.2 Network Settings

Click **Edit** on the Network settings.

| Setting | Value |
|---|---|
| VPC | (default VPC) |
| Subnet | (no preference) |
| Auto-assign public IP | **Enable** |
| Firewall (security groups) | **Select existing security group** |
| Common security groups | Select **`learningopk-ec2`** |

#### 1.5.3 Configure Storage

| Setting | Value |
|---|---|
| Size (GiB) | 20 |
| Volume type | gp3 (General Purpose SSD) |
| Delete on termination | Yes (checked) |

#### 1.5.4 Advanced Details (leave defaults)

Leave all advanced settings at their defaults. Click **Launch instance**.

#### 1.5.5 Elastic IP (Recommended)

After the instance is running, assign a static public IP so the address does not change across restarts:

1. Go to **EC2 → Elastic IPs** (left sidebar)
2. Click **Allocate Elastic IP address** → **Allocate**
3. Select the Elastic IP → **Actions → Associate Elastic IP address**
4. Select your instance `learningopk-backend` → **Associate**

Note the Elastic IP address (e.g., `54.123.45.67`). This will be your API server's public IP.

#### 1.5.6 Set PEM File Permissions

On your local machine (macOS/Linux):

```bash
chmod 400 ~/.ssh/learningopk.pem
```

On Windows (PowerShell):

```powershell
icacls ~/.ssh/learningopk.pem /inheritance:r /grant "%USERNAME%:R"
```

---

**EC2 Summary** — Save these values:
- **EC2 Public IP (Elastic IP)**: `54.123.45.67`
- **SSH Key Path**: `~/.ssh/learningopk.pem`

## Part 2: EC2 Setup

### 2.1 SSH and Install Docker

Connect to your EC2 instance:

```bash
ssh -i ~/.ssh/learningopk.pem ubuntu@54.123.45.67
```

Replace `54.123.45.67` with your actual EC2 public IP.

Once connected, update the system and install Docker:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-v2 git
sudo usermod -aG docker ubuntu
newgrp docker
```

Verify Docker is installed:

```bash
docker --version
docker compose version
```

### 2.2 Clone Repository

From the EC2 instance, clone your repository:

```bash
git clone https://github.com/<your-github-username>/Learningo.git
cd Learningo/learningopk
```

Replace `<your-github-username>` with your actual GitHub username/organization.

If your repository is private, use a Personal Access Token:

```bash
git clone https://<your-github-username>:<github-personal-access-token>@github.com/<your-github-username>/Learningo.git
cd Learningo/learningopk
```

### 2.3 Configure Environment

The production Docker Compose file reads environment variables from a `.env` file in the `learningopk/` directory (the same directory as `docker-compose.prod.yml`).

Create the `.env` file:

```bash
nano .env
```

Paste the following content, replacing every placeholder with your actual values:

```bash
# ===== DATABASE (AWS RDS) =====
DATABASE_URL=postgresql://postgres:<rds-password>@<rds-endpoint>:5432/learningo

# ===== REDIS (AWS ElastiCache) =====
REDIS_URL=redis://<elasticache-endpoint>:6379

# ===== AUTH (Better Auth) =====
# Generate a secure random secret: on your local machine run: openssl rand -base64 32
BETTER_AUTH_SECRET=<your-generated-64-char-base64-secret>
BETTER_AUTH_URL=https://api.yourdomain.com

# ===== FRONTEND =====
FRONTEND_ORIGIN=https://yourdomain.com

# ===== OBJECT STORAGE (AWS S3) =====
MINIO_ENDPOINT=s3.amazonaws.com
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=<aws-access-key-id>
MINIO_SECRET_KEY=<aws-secret-access-key>
MINIO_BUCKET=<your-s3-bucket-name>
MINIO_PUBLIC_URL=https://<your-s3-bucket-name>.s3.amazonaws.com

# ===== AI (Mistral) =====
MISTRAL_API_KEY=<your-mistral-api-key>

# ===== SERVER =====
PORT=3001

# ===== SENTRY (optional) =====
SENTRY_DSN=https://your-sentry-dsn@sentry.io/0
```

**Filled example** (use your own real values):

```bash
# ===== DATABASE (AWS RDS) =====
DATABASE_URL=postgresql://postgres:MySecurePass123!@learningopk-db.abcdefg12345.us-east-1.rds.amazonaws.com:5432/learningo

# ===== REDIS (AWS ElastiCache) =====
REDIS_URL=redis://learningopk-redis.xxxxxx.ng.0001.use1.cache.amazonaws.com:6379

# ===== AUTH (Better Auth) =====
BETTER_AUTH_SECRET=K8mP2xR9vL5nQ7wT3yA6bC1dE4fG0hI2jK4lM6nO8pQ0rS2tU4vW6xY8z=
BETTER_AUTH_URL=https://api.learningopk.com

# ===== FRONTEND =====
FRONTEND_ORIGIN=https://learningopk.com

# ===== OBJECT STORAGE (AWS S3) =====
MINIO_ENDPOINT=s3.amazonaws.com
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE
MINIO_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
MINIO_BUCKET=learningopk-media-abc123
MINIO_PUBLIC_URL=https://learningopk-media-abc123.s3.amazonaws.com

# ===== AI (Mistral) =====
MISTRAL_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ===== SERVER =====
PORT=3001

# ===== SENTRY (optional) =====
SENTRY_DSN=https://xxxxxxxxxxxxxxxxxx@sentry.io/0
```

Save the file (`Ctrl+O`, Enter, `Ctrl+X` in nano).

**Important**: The `.env` file contains secrets. Never commit it to git. The `.gitignore` already excludes `.env` files.

### 2.4 Configure Nginx Domain

The production Nginx configuration at `infra/nginx.prod.conf` contains placeholder text `DOMAIN_PLACEHOLDER` that must be replaced with your actual API domain.

Replace all occurrences using `sed`:

```bash
sed -i 's/DOMAIN_PLACEHOLDER/api.learningopk.com/g' infra/nginx.prod.conf
```

Replace `api.learningopk.com` with your actual API subdomain (e.g., `api.yourdomain.com`).

Verify the replacement worked:

```bash
grep DOMAIN_PLACEHOLDER infra/nginx.prod.conf
```

This should return no output (meaning all occurrences were replaced).

### 2.5 Obtain SSL Certificate (Initial)

Before starting the full Docker stack, you need to obtain the initial Let's Encrypt SSL certificate. The certbot container in docker-compose can auto-renew certificates, but the initial certificate acquisition requires either a running web server or a standalone challenge.

We will use the Docker approach — start nginx first on HTTP only, then run certbot to get the certificate.

#### 2.5.1 Create a temporary HTTP-only Nginx config

On the EC2 instance, create a temporary Nginx config that only serves HTTP (no SSL):

```bash
sudo mkdir -p /tmp/certbot_init
```

```bash
cat > /tmp/certbot_init/temp-nginx.conf << 'NGINX_EOF'
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 4096;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    sendfile on;
    tcp_nopush on;
    keepalive_timeout 65;

    # Upstream backend
    upstream backend_cluster {
        server backend:3001;
        keepalive 32;
    }

    server {
        listen 80;
        server_name api.learningopk.com;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            proxy_pass http://backend_cluster;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
NGINX_EOF
```

Replace `api.learningopk.com` with your actual API domain.

#### 2.5.2 Start a temporary Nginx + Backend stack

Create a one-off docker compose file:

```bash
cat > /tmp/certbot_init/docker-compose-temp.yml << 'COMPOSE_EOF'
version: "3.8"

services:
  backend:
    build:
      context: /home/ubuntu/Learningo/learningopk
      dockerfile: backend/Dockerfile
    container_name: learningopk_backend_temp
    restart: "no"
    env_file:
      - /home/ubuntu/Learningo/learningopk/.env
    environment:
      - PORT=3001
      - NODE_ENV=production
    networks:
      - temp_net

  nginx:
    image: nginx:alpine
    container_name: learningopk_nginx_temp
    restart: "no"
    ports:
      - "80:80"
    volumes:
      - /tmp/certbot_init/temp-nginx.conf:/etc/nginx/nginx.conf:ro
      - certbot_www:/var/www/certbot
      - certbot_certs:/etc/letsencrypt
    depends_on:
      - backend
    networks:
      - temp_net

networks:
  temp_net:
    driver: bridge

volumes:
  certbot_www:
  certbot_certs:
COMPOSE_EOF
```

Start the temporary stack:

```bash
cd /tmp/certbot_init
sudo docker compose -f docker-compose-temp.yml up -d --build
```

Wait for both containers to be healthy:

```bash
sudo docker compose -f docker-compose-temp.yml ps
```

You should see both containers with `Up` status.

#### 2.5.3 Obtain the Let's Encrypt certificate

Run certbot in a temporary container, using the webroot method (certbot writes a challenge file to `/var/www/certbot` which nginx serves):

```bash
sudo docker run --rm \
  -v learningopk_certbot_www:/var/www/certbot \
  -v learningopk_certbot_certs:/etc/letsencrypt \
  certbot/certbot:latest certonly \
  --webroot \
  -w /var/www/certbot \
  -d api.learningopk.com \
  --agree-tos \
  --email your-email@gmail.com \
  --non-interactive
```

Replace:
- `api.learningopk.com` with your actual API domain
- `your-email@gmail.com` with your actual email address

If successful, you will see: `Congratulations! Your certificate and chain have been saved at: /etc/letsencrypt/live/api.learningopk.com/fullchain.pem`

**Important**: The domain `api.learningopk.com` must already point to your EC2 public IP. See [Part 4: DNS Configuration](#part-4-dns-configuration) and set up DNS before running certbot. Certbot performs an HTTP challenge that requires the domain to resolve to the server.

#### 2.5.4 Tear down the temporary stack

```bash
cd /tmp/certbot_init
sudo docker compose -f docker-compose-temp.yml down
```

The certificate files are stored in the named Docker volume `learningopk_certbot_certs`, which the production docker-compose.yml also uses. The certificates will persist.

### 2.6 Build and Start Production Stack

Navigate to the project directory:

```bash
cd ~/Learningo/learningopk
```

Start the full production Docker stack:

```bash
sudo docker compose -f docker-compose.prod.yml up -d --build
```

This command:
1. Builds the backend Docker image (Node.js 22 Alpine, pnpm install, compile TypeScript, prune dev deps)
2. Starts the backend container on port 3001 (internal only, not exposed to the internet)
3. Starts nginx on ports 80 and 443 (exposed to the internet)
4. Starts certbot in the background for automatic certificate renewal (checks every 12 hours)

#### 2.6.1 Verify Containers Are Running

```bash
sudo docker compose -f docker-compose.prod.yml ps
```

Expected output:

```
NAME                    IMAGE                   STATUS
learningopk_backend     learningopk-backend     Up (healthy)
learningopk_nginx       nginx:alpine            Up
learningopk_certbot     certbot/certbot:latest  Up
```

#### 2.6.2 Check Backend Logs

```bash
sudo docker compose -f docker-compose.prod.yml logs backend
```

Look for a message like:

```
Starting LearningoPK backend...
Listening on port 3001
```

If the backend fails to start, check the logs for the specific error. Common issues:
- **DATABASE_URL is incorrect**: Verify the RDS endpoint, username, password, and that the RDS security group allows EC2
- **REDIS_URL is incorrect**: Verify the ElastiCache endpoint and security group
- **MISTRAL_API_KEY is missing**: Get a free key from console.mistral.ai

#### 2.6.3 Check Nginx Logs

```bash
sudo docker compose -f docker-compose.prod.yml logs nginx
```

#### 2.6.4 Test Health Endpoint

From the EC2 instance itself, test that the backend is responding:

```bash
curl http://localhost/api/health
```

Expected response:

```json
{"status":"ok"}
```

From your local machine (after DNS is configured), test the HTTPS endpoint:

```bash
curl https://api.learningopk.com/api/health
```

## Part 3: Database Migrations

The Docker container runs the backend server but does **not** automatically run database migrations. You must run Drizzle migrations against the RDS database separately.

### 3.1 Run Migrations from EC2

Connect to the EC2 instance:

```bash
ssh -i ~/.ssh/learningopk.pem ubuntu@54.123.45.67
```

Install Node.js and pnpm on the EC2 host (not inside Docker):

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pnpm@10.30.1
```

Navigate to the project and install dependencies:

```bash
cd ~/Learningo/learningopk
pnpm install --frozen-lockfile --filter '...'
```

Set the DATABASE_URL environment variable to point to RDS and run migrations:

```bash
export DATABASE_URL="postgresql://postgres:<rds-password>@<rds-endpoint>:5432/learningo"
pnpm db:migrate
```

Replace `<rds-password>` and `<rds-endpoint>` with your actual RDS values.

Expected output:

```
[✓] migrations applied successfully
```

Drizzle will read the migration files from `backend/drizzle/` (configured in `drizzle.config.ts`) and execute them against the RDS database.

**Alternative**: Run migrations from your local machine if your RDS is publicly accessible (not recommended for production, but possible for initial setup if you temporarily enable public access on the RDS instance).

### 3.2 Verify Database Connection

From the EC2 instance, test that the backend container can connect to RDS:

```bash
# Enter the running backend container
sudo docker exec -it learningopk_backend sh

# Inside the container, try to reach the database
wget -qO- http://localhost:3001/api/health
# Expected: {"status":"ok"}

exit
```

If the health check returns `ok`, the backend is successfully connected to RDS, Redis, and all services.

### 3.3 Seed Database (Optional)

To seed the database with sample data (subjects, quiz templates, etc.):

```bash
export DATABASE_URL="postgresql://postgres:<rds-password>@<rds-endpoint>:5432/learningo"
pnpm db:seed
```

Check the seed script output for any errors.

## Part 4: DNS Configuration

You need two DNS records — one for the API (pointing to the EC2 instance) and one for the frontend (configured through Vercel).

### 4.1 API Domain (api.yourdomain.com)

The API domain points to your EC2 instance's public IP.

Go to your DNS provider (e.g., Namecheap, Cloudflare, Route53, GoDaddy) and add an A record:

| Field | Value |
|---|---|
| Type | A |
| Name/Host | `api` |
| Value/Points to | `<ec2-public-ip>` (e.g., `54.123.45.67`) |
| TTL | 300 (5 minutes) |

If your DNS provider uses a full domain notation (Cloudflare), the name would be `api.yourdomain.com`. If using relative notation (Namecheap), the name would be just `api`.

After adding the record, verify DNS propagation:

```bash
nslookup api.yourdomain.com
```

Expected output should show your EC2 public IP. DNS propagation may take 5-30 minutes.

### 4.2 Frontend Domain (yourdomain.com)

The root domain (or www) will be configured when setting up the custom domain on Vercel. See [Part 5.4](#54-custom-domain).

If you want to verify the DNS works before deploying to Vercel, you can add a temporary A record pointing to any IP, but Vercel provides exact DNS instructions when you add the domain.

## Part 5: Vercel Frontend Deploy

### 5.1 Connect Repository

1. Go to [vercel.com](https://vercel.com) and sign in with your GitHub account
2. Click **New Project** on the dashboard
3. Find and select your GitHub repository (`Learningo` or whatever you named it)
4. If you don't see your repo, click **Adjust GitHub App Permissions** to grant Vercel access to the repository

### 5.2 Configure Project Settings

On the "Configure Project" screen:

| Setting | Value |
|---|---|
| Framework Preset | Next.js (auto-detected) |
| Root Directory | `learningopk/frontend` |
| Build Command | `next build` (auto-detected, leave as is) |
| Output Directory | `.next` (auto-detected, leave as is) |
| Install Command | `pnpm install` (auto-detected) |

If Vercel doesn't auto-detect pnpm, scroll to **Build and Output Settings**, toggle the override, and set:

| Setting | Value |
|---|---|
| Framework Preset | Next.js |
| Root Directory | `learningopk/frontend` |
| Build Command | `cd ../.. && pnpm install --frozen-lockfile && cd learningopk/frontend && pnpm build` |
| Output Directory | `learningopk/frontend/.next` |
| Install Command | (leave empty, handled by build command) |

**Explanation**: Since LearningoPK is a pnpm monorepo, the frontend depends on the `@learningopk/shared` workspace package. The build command navigates to the monorepo root, installs all dependencies, then builds the frontend.

### 5.3 Environment Variables

On the same "Configure Project" screen, scroll to **Environment Variables** and add:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://yourdomain.com` |
| `NEXT_PUBLIC_BACKEND_URL` | `https://api.yourdomain.com` |
| `NODE_ENV` | `production` |

If you are using Sentry for the frontend (the project has Sentry configured in `next.config.ts`), also add:

| Name | Value |
|---|---|
| `SENTRY_AUTH_TOKEN` | Your Sentry auth token |
| `NEXT_PUBLIC_SENTRY_DSN` | Your Sentry DSN for the frontend project |

Click **Deploy**.

### 5.4 Custom Domain

After the initial deployment succeeds:

1. Go to your project dashboard on Vercel
2. Click **Settings** → **Domains**
3. Enter your custom domain (e.g., `learningopk.com`) and click **Add**
4. Vercel will display the required DNS configuration:
   - For an **apex domain** (e.g., `learningopk.com`): Usually an A record pointing to `76.76.21.21`
   - For a **subdomain** (e.g., `www.learningopk.com`): Usually a CNAME record pointing to `cname.vercel-dns.com`
5. Go to your DNS provider and add the recommended records
6. Return to Vercel and click **Verify**. It may take a few minutes for DNS to propagate
7. Once verified, Vercel will automatically provision an SSL certificate via Let's Encrypt
8. Set the domain as the primary/production domain if you added multiple domains

### 5.5 Automatic Deployments

By default, Vercel automatically deploys when you push to the main branch of your GitHub repository. To deploy:

```bash
git add .
git commit -m "Update frontend"
git push origin main
```

Vercel will detect the push, build, and deploy within 2-5 minutes. You will receive a notification (email/Slack if configured) when the deployment completes.

**Important**: Add `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_BACKEND_URL` as Vercel environment variables **before** the first deployment, or the frontend will not know where to send API requests.

## Part 6: Verification

After completing all the previous steps, verify that every component works correctly.

### 6.1 API Health Check

```bash
curl https://api.yourdomain.com/api/health
```

Expected response:

```json
{"status":"ok"}
```

Replace `api.yourdomain.com` with your actual API domain.

### 6.2 Frontend Loading

Open your frontend URL in a browser:

```
https://yourdomain.com
```

The homepage should load. Check the browser's DevTools Console (F12) for any errors.

### 6.3 Authentication

1. Click **Sign Up** or **Register** on the frontend
2. Fill in the registration form with an email and password
3. Submit the form
4. You should be redirected to the dashboard or logged-in home page
5. Open DevTools → **Application** → **Cookies** → check that Better Auth cookies are set:
   - `better-auth.session_token`
   - `better-auth.session_data`

If registration fails:
- Check the backend logs: `sudo docker compose -f docker-compose.prod.yml logs backend` on EC2
- Verify that `FRONTEND_ORIGIN` in `.env` matches your frontend URL exactly (including `https://`)
- Verify that `BETTER_AUTH_URL` in `.env` matches your API URL exactly

### 6.4 AI Chat

1. Log in to the application
2. Navigate to the AI Tutor or Chat section
3. Type a message (e.g., "Explain quadratic equations" or "Hello, can you help me study?")
4. You should see a streaming response from Mistral AI — the text appears progressively, one token at a time
5. The message should be saved to the chat history

If the AI chat fails:
- Check that `MISTRAL_API_KEY` is set in the `.env` file on EC2
- Verify you have credits/quota from Mistral AI (check console.mistral.ai)
- Check backend logs for Mistral API errors

### 6.5 File Uploads (S3)

1. Log in to the application
2. Navigate to **Profile** or **Settings**
3. Click to upload a profile image
4. Select an image file from your computer
5. After upload, the image should appear as your profile picture
6. Right-click the image → **Open image in new tab** — the URL should be an S3 URL like `https://learningopk-media-abc123.s3.amazonaws.com/...`

If uploads fail:
- Verify the S3 bucket policy has public `GetObject` access
- Verify the IAM user credentials (`MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`) are correct
- Verify `MINIO_ENDPOINT` is `s3.amazonaws.com` (not `localhost` or `minio`)
- Check backend logs for S3 access denied or connection errors

### 6.6 Quiz

1. Log in to the application
2. Navigate to a subject with quizzes
3. Start a quiz
4. Answer the questions
5. Submit your answers
6. You should see a score/results page

If quiz submission fails:
- Check that the backend can connect to RDS (quizzes require database queries)
- Check backend logs

### 6.7 SSL Certificate

Verify that the SSL certificate is valid:

```bash
curl -vI https://api.yourdomain.com 2>&1 | grep -E 'SSL|subject|issuer|expire'
```

Expected: You should see the Let's Encrypt certificate details. The certificate should not be expired.

## Part 7: Maintenance

### 7.1 Viewing Logs

On the EC2 instance:

```bash
# Follow backend logs in real-time
sudo docker compose -f ~/Learningo/learningopk/docker-compose.prod.yml logs -f backend

# Follow nginx logs in real-time
sudo docker compose -f ~/Learningo/learningopk/docker-compose.prod.yml logs -f nginx

# Follow certbot logs
sudo docker compose -f ~/Learningo/learningopk/docker-compose.prod.yml logs -f certbot

# View all logs at once
sudo docker compose -f ~/Learningo/learningopk/docker-compose.prod.yml logs -f
```

### 7.2 Restarting Services

On the EC2 instance:

```bash
# Restart a single service
sudo docker compose -f ~/Learningo/learningopk/docker-compose.prod.yml restart backend

# Restart all services
sudo docker compose -f ~/Learningo/learningopk/docker-compose.prod.yml restart

# Full stop and restart (uses cached images)
sudo docker compose -f ~/Learningo/learningopk/docker-compose.prod.yml down
sudo docker compose -f ~/Learningo/learningopk/docker-compose.prod.yml up -d
```

### 7.3 Updating the Application

When you push new code to the repository and want to deploy the update:

On the EC2 instance:

```bash
cd ~/Learningo/learningopk
git pull origin main

# Rebuild and restart with new code
sudo docker compose -f docker-compose.prod.yml up -d --build
```

After updating, check the logs to verify the backend started successfully:

```bash
sudo docker compose -f docker-compose.prod.yml logs backend --tail=50
```

If you have new database migrations:

```bash
export DATABASE_URL="postgresql://postgres:<rds-password>@<rds-endpoint>:5432/learningo"
cd ~/Learningo/learningopk
pnpm db:migrate
```

### 7.4 Database Backups

#### Manual Backup

On the EC2 instance, create a SQL dump of the RDS database:

```bash
sudo apt install -y postgresql-client

pg_dump "postgresql://postgres:<rds-password>@<rds-endpoint>:5432/learningo" \
  > ~/learningopk_backup_$(date +%Y%m%d_%H%M%S).sql
```

This creates a file like `learningopk_backup_20251201_120000.sql` in the home directory.

**Download the backup to your local machine**:

```bash
# Run from your local machine
scp -i ~/.ssh/learningopk.pem ubuntu@<ec2-public-ip>:~/learningopk_backup_*.sql ./
```

#### Restore from Backup

```bash
# On EC2, with the backup file
psql "postgresql://postgres:<rds-password>@<rds-endpoint>:5432/learningo" \
  < learningopk_backup_20251201_120000.sql
```

#### Automated Backups (Optional)

For production use, consider enabling **RDS automatic backups** (in the RDS console, modify the database and enable automated backups with a retention period of 7 days). This is the recommended approach over manual dumps.

### 7.5 Docker Cleanup

Over time, Docker images accumulate and can fill up disk space. Run periodically:

```bash
# Remove unused Docker images, containers, and volumes
sudo docker system prune -af --volumes
```

**Warning**: This removes all unused Docker resources. Make sure your containers are running first (`sudo docker ps`). The `--volumes` flag is safe because the production volumes (`certbot_www`, `certbot_certs`) are in use and will not be removed.

### 7.6 Monitoring Disk Space

The EC2 free tier includes 20 GB of storage. Monitor usage:

```bash
df -h
```

Check Docker disk usage:

```bash
sudo docker system df
```

### 7.7 SSL Certificate Renewal

The certbot container in docker-compose.prod.yml runs automatically and attempts renewal every 12 hours. To manually check and force renewal:

```bash
sudo docker exec learningopk_certbot certbot renew --force-renewal
sudo docker compose -f ~/Learningo/learningopk/docker-compose.prod.yml restart nginx
```

Let's Encrypt certificates expire after 90 days. The auto-renewal container should handle this without manual intervention. Verify the certificate expiry:

```bash
sudo docker run --rm \
  -v learningopk_certbot_certs:/etc/letsencrypt \
  certbot/certbot:latest certificates
```

### 7.8 Security Updates

Keep the EC2 instance updated:

```bash
# On EC2
sudo apt update && sudo apt upgrade -y
```

Update Docker images:

```bash
# Pull latest base images and rebuild
sudo docker compose -f ~/Learningo/learningopk/docker-compose.prod.yml pull
sudo docker compose -f ~/Learningo/learningopk/docker-compose.prod.yml up -d --build
```

## Appendix A: Complete Environment Variable Reference

### Backend `.env` (on EC2 at `learningopk/.env`)

| Variable | Required | Description | Example (Dev) | Example (Production) |
|---|---|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://postgres:password@localhost:6432/learningo` | `postgresql://postgres:pass@rds.xxx.us-east-1.rds.amazonaws.com:5432/learningo` |
| `REDIS_URL` | Yes | Redis connection string | `redis://localhost:6379` | `redis://redis.xxx.cache.amazonaws.com:6379` |
| `BETTER_AUTH_SECRET` | Yes | Server-side auth secret (base64) | `yOocWXqo7cx5Zde53GtGcCn4Q6qoNszeoQ8aLGLze1k=` | Generate: `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Yes | Public URL of the backend API | `http://localhost:3001` | `https://api.learningopk.com` |
| `FRONTEND_ORIGIN` | Yes | Frontend URL for CORS | `http://localhost:3000` | `https://learningopk.com` |
| `MINIO_ENDPOINT` | Yes | S3-compatible storage endpoint | `localhost` | `s3.amazonaws.com` |
| `MINIO_PORT` | Yes | Storage port | `9000` | `443` |
| `MINIO_USE_SSL` | Yes | Use SSL for storage | `false` | `true` |
| `MINIO_ACCESS_KEY` | Yes | S3 access key (MinIO root user for dev) | `minioadmin` | `AKIAIOSFODNN7EXAMPLE` |
| `MINIO_SECRET_KEY` | Yes | S3 secret key (MinIO root password for dev) | `minioadmin123` | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `MINIO_BUCKET` | Yes | S3 bucket name | `learningo-media` | `learningopk-media-abc123` |
| `MINIO_PUBLIC_URL` | Yes | Public URL for stored media | `http://localhost:9000` | `https://learningopk-media-abc123.s3.amazonaws.com` |
| `MISTRAL_API_KEY` | Yes | Mistral AI API key | (free from console.mistral.ai) | (same key) |
| `PORT` | Yes | Backend listen port | `3001` | `3001` |
| `SENTRY_DSN` | No | Sentry backend monitoring DSN | (leave empty if not using Sentry) | `https://xxx@sentry.io/0` |

### Frontend Environment Variables (Vercel)

| Variable | Required | Description | Example |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Yes | Public URL of the frontend | `https://learningopk.com` |
| `NEXT_PUBLIC_BACKEND_URL` | Yes | Public URL of the backend API | `https://api.learningopk.com` |
| `NODE_ENV` | Yes | Environment mode | `production` |
| `NEXT_PUBLIC_SENTRY_DSN` | No | Sentry DSN for frontend monitoring | `https://xxx@sentry.io/0` |
| `SENTRY_AUTH_TOKEN` | No | Sentry auth token for source maps | (from Sentry project settings) |

## Appendix B: Troubleshooting

### Backend won't start

```bash
sudo docker compose -f ~/Learningo/learningopk/docker-compose.prod.yml logs backend
```

Common issues:

1. **Wrong DATABASE_URL**: Verify the RDS endpoint, username, password, and port. Test connectivity:
   ```bash
   sudo docker exec learningopk_backend wget -qO- http://localhost:3001/api/health
   ```

2. **RDS security group not allowing EC2**: The `learningopk-rds` security group must have an inbound rule allowing PostgreSQL (5432) from the `learningopk-ec2` security group. Check in AWS Console → EC2 → Security Groups → `learningopk-rds` → Inbound rules.

3. **Redis unreachable**: The `learningopk-redis` security group must allow TCP 6379 from itself AND from `learningopk-ec2`. Check the inbound rules.

4. **Missing environment variables**: All `Yes` variables in the table above must be set in the `.env` file. Missing variables will cause the backend to crash on startup.

5. **Port already in use**: If another process is using port 3001 inside the container, check `sudo docker exec learningopk_backend netstat -tlnp` (if netstat is installed).

### Nginx 502 Bad Gateway

This means nginx cannot reach the backend. Check:

1. Backend is running and healthy:
   ```bash
   sudo docker compose -f ~/Learningo/learningopk/docker-compose.prod.yml ps
   ```

2. Backend is listening on the correct port:
   ```bash
   sudo docker exec learningopk_backend wget -qO- http://localhost:3001/api/health
   ```

3. Nginx can reach the backend container:
   ```bash
   sudo docker exec learningopk_nginx wget -qO- http://backend:3001/api/health
   ```

### Nginx 404 on root path

This is expected. The root path `/` returns 404 on the API domain because the frontend is hosted on Vercel, not on the EC2 instance. Only API routes (`/api/*`) are served by the backend.

### SSL certificate not renewing

```bash
sudo docker compose -f ~/Learningo/learningopk/docker-compose.prod.yml logs certbot
```

Manual renewal test:

```bash
sudo docker exec learningopk_certbot certbot renew --dry-run
```

If the dry run fails, check:
- The domain DNS still points to the EC2 IP
- The `.well-known/acme-challenge/` location block in `infra/nginx.prod.conf` is correctly configured
- The certificates directory is correctly mounted:
  ```bash
  sudo docker exec learningopk_certbot ls -la /etc/letsencrypt/live/
  ```

### S3 uploads failing

1. **Verify IAM credentials**: Check that `MINIO_ACCESS_KEY` and `MINIO_SECRET_KEY` in `.env` match the IAM user's access key created in section 1.4.4.

2. **Verify bucket policy**: The bucket must have the public-read policy from section 1.4.3. Check in AWS Console → S3 → bucket → Permissions → Bucket policy.

3. **Verify endpoint**: `MINIO_ENDPOINT` must be `s3.amazonaws.com` in production. If it's set to `localhost` or `minio`, the backend will try to connect to a local MinIO instance instead of S3.

4. **Check backend logs**:
   ```bash
   sudo docker compose -f ~/Learningo/learningopk/docker-compose.prod.yml logs backend | grep -i "s3\|minio\|upload\|access denied"
   ```

5. **Check CORS on S3 bucket** (if needed): Go to AWS Console → S3 → bucket → Permissions → Cross-origin resource sharing (CORS) and add:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedOrigins": ["https://yourdomain.com"],
       "ExposeHeaders": []
     }
   ]
   ```

### CORS errors in browser

If the browser shows CORS errors when the frontend tries to call the API:

1. **Verify `FRONTEND_ORIGIN`**: The value in the `.env` file on EC2 must match the frontend URL exactly:
   - Correct: `FRONTEND_ORIGIN=https://learningopk.com`
   - Incorrect: `FRONTEND_ORIGIN=https://www.learningopk.com` (if you use the apex domain)
   - Incorrect: `FRONTEND_ORIGIN=http://learningopk.com` (missing `s` in https)

2. **Verify `NEXT_PUBLIC_BACKEND_URL`**: The value in Vercel environment variables must be the API domain:
   - Correct: `NEXT_PUBLIC_BACKEND_URL=https://api.learningopk.com`
   - Incorrect: `NEXT_PUBLIC_BACKEND_URL=http://api.learningopk.com` (missing `s`)

3. **Verify Nginx CORS headers**: The backend (Better Auth) handles CORS, but if you have issues, check that the backend is sending the correct `Access-Control-Allow-Origin` header:
   ```bash
   curl -v https://api.yourdomain.com/api/health 2>&1 | grep -i "access-control"
   ```

### Cannot connect to RDS from local machine (for migrations)

If you need to run migrations from your local machine but cannot reach RDS:

1. Temporarily enable **Public access** on the RDS database:
   - Go to AWS Console → RDS → `learningopk-db` → Modify
   - Under Connectivity, set **Public access** to **Yes**
   - Apply immediately
   - After the modification completes, note the public endpoint

2. Add your local IP to the RDS security group:
   - Go to AWS Console → EC2 → Security Groups → `learningopk-rds`
   - Edit inbound rules → Add rule: PostgreSQL, TCP, 5432, My IP
   - Save

3. Run migrations from local:
   ```bash
   export DATABASE_URL="postgresql://postgres:<password>@<rds-public-endpoint>:5432/learningo"
   cd learningopk
   pnpm db:migrate
   ```

4. **After migrating, revert to private access**:
   - Set Public access back to **No**
   - Remove the inbound rule for your IP

### Docker build fails with "COPY failed: file not found"

The Docker build context is the `learningopk/` root directory. The `backend/Dockerfile` references files relative to this root. If build fails:

1. Make sure you are running docker compose from the correct directory:
   ```bash
   cd ~/Learningo/learningopk
   sudo docker compose -f docker-compose.prod.yml build --no-cache
   ```

2. Check that all required files exist:
   ```bash
   ls -la pnpm-workspace.yaml package.json pnpm-lock.yaml backend/Dockerfile backend/docker-entrypoint.sh
   ```

### Vercel build fails

Common Vercel build issues and solutions:

1. **Module not found: @learningopk/shared**: The frontend depends on the shared workspace package. Make sure the build command installs dependencies from the monorepo root. Use the override build command from section 5.2.

2. **Out of memory during build**: The free Vercel plan has a limit of 6 GB RAM during build. If you hit this, try:
   - Remove unused dependencies from `frontend/package.json`
   - Set `NODE_OPTIONS="--max-old-space-size=4096"` as a Vercel environment variable

3. **Environment variables not available at build time**: All `NEXT_PUBLIC_*` variables are embedded at build time, not runtime. Make sure they are set in Vercel project settings before building.

## Appendix C: Useful Commands Cheatsheet

```bash
# ===== On EC2 Instance =====

# SSH into EC2
ssh -i ~/.ssh/learningopk.pem ubuntu@<ec2-public-ip>

# Navigate to project
cd ~/Learningo/learningopk

# Start production stack
sudo docker compose -f docker-compose.prod.yml up -d --build

# Stop production stack
sudo docker compose -f docker-compose.prod.yml down

# View running containers
sudo docker compose -f docker-compose.prod.yml ps

# View logs
sudo docker compose -f docker-compose.prod.yml logs -f backend
sudo docker compose -f docker-compose.prod.yml logs -f nginx
sudo docker compose -f docker-compose.prod.yml logs -f certbot

# Restart a service
sudo docker compose -f docker-compose.prod.yml restart backend

# Enter a running container
sudo docker exec -it learningopk_backend sh
sudo docker exec -it learningopk_nginx sh

# Test API health
curl http://localhost/api/health
curl http://localhost/api/ready

# Apply database migrations
export DATABASE_URL="postgresql://postgres:<password>@<rds-endpoint>:5432/learningo"
pnpm db:migrate

# Database backup
pg_dump "postgresql://postgres:<password>@<rds-endpoint>:5432/learningo" > backup_$(date +%Y%m%d).sql

# Database restore
psql "postgresql://postgres:<password>@<rds-endpoint>:5432/learningo" < backup.sql

# Check disk space
df -h
sudo docker system df

# Docker cleanup
sudo docker system prune -af --volumes

# ===== On Local Machine =====

# Deploy to Vercel (automatic on git push to main)
git push origin main

# Verify API from local
curl https://api.learningopk.com/api/health

# Verify DNS
nslookup api.learningopk.com
nslookup learningopk.com

# Copy files to EC2
scp -i ~/.ssh/learningopk.pem ~/local-file.txt ubuntu@<ec2-public-ip>:~/

# Copy files from EC2
scp -i ~/.ssh/learningopk.pem ubuntu@<ec2-public-ip>:~/backup.sql ./
```

## Appendix D: Architecture Decisions

### Why EC2 instead of ECS/Lambda?

For a free-tier project, a single EC2 t2.micro instance is the simplest and most cost-effective option. It provides 1 GB RAM and 1 vCPU, which is sufficient for the Express backend and Nginx.

ECS (Fargate) or EKS would add complexity and cost. AWS Lambda would require significant code changes to support serverless execution (cold starts, connection pooling, WebSocket limitations).

### Why Vercel for the frontend?

Vercel is the native deployment platform for Next.js. It provides:
- Automatic SSL certificates
- Global CDN with edge caching
- Automatic deployments from git pushes
- Free tier includes 100 GB bandwidth/month, 6000 build minutes/month
- Built-in analytics
- Instant rollbacks

### Why RDS + ElastiCache instead of Docker containers?

- **RDS** provides automated backups, point-in-time recovery, and automatic failover (with Multi-AZ). Running PostgreSQL in Docker would require manual backup scripts and monitoring.
- **ElastiCache** is a fully managed Redis service. Self-hosting Redis in Docker is possible, but managed services handle patching, replication, and failover automatically.

### Why Nginx in Docker instead of a managed load balancer?

An Application Load Balancer (ALB) would add ~$20/month to the bill. Nginx running alongside the backend on the same EC2 instance handles:
- SSL termination
- Rate limiting (1000 req/min per IP, 100 req/min per user)
- Static file caching headers
- WebSocket/SSE streaming support for AI chat
- Health check proxying

The production Nginx config (`infra/nginx.prod.conf`) also adds security headers (X-Frame-Options, HSTS, CSP) and disables buffering for the AI chat streaming endpoint.

## Appendix E: Cost Estimate (Free Tier)

If you stay within free tier limits, the total cost should be **$0/month** for at least 12 months.

| Service | Free Tier Limit | Our Usage | Cost |
|---|---|---|---|
| EC2 t2.micro | 750 hours/month | ~730 hours | $0 |
| RDS db.t3.micro | 750 hours/month | ~730 hours | $0 |
| ElastiCache cache.t3.micro | 750 hours/month | ~730 hours | $0 |
| S3 | 5 GB storage, 20k GET, 2k PUT | < 1 GB typical | $0 |
| Vercel | 100 GB bandwidth, 6000 build minutes | < 10 GB typical | $0 |
| Mistral AI | Free tier (rate-limited) | Normal usage | $0 |

**After 12 months**, if you exceed free tier limits:
- EC2 t2.micro: ~$8.50/month (on-demand)
- RDS db.t3.micro: ~$12.50/month
- ElastiCache cache.t3.micro: ~$12.50/month
- S3 + Vercel: likely still free for small-scale usage

**Important**: Set up **AWS Budget Alerts** to avoid unexpected charges:
1. Go to AWS Console → Billing → Budgets
2. Create a budget with a $1 threshold (alert if monthly cost exceeds $1)
3. Add your email for notifications
