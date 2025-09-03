# Deployment Architecture - TrailGuide PWA

## 1. Overview

This document outlines the complete deployment strategy for TrailGuide PWA, built with a **Docker-first architecture** from day one. The strategy includes infrastructure design, CI/CD pipelines, monitoring, and operational procedures, all containerized for consistency across environments.

### Docker-First Deployment Principles
- **Container-Native**: All services run in Docker containers with identical configuration across environments
- **Infrastructure as Code**: All infrastructure managed through declarative configuration (Docker Compose, Kubernetes)
- **One-Command Deployment**: Complete system deployment with single command (`docker-compose up`)
- **Environment Parity**: Development, staging, and production use identical containerized stack
- **Blue-Green Deployment**: Zero-downtime deployments with instant rollback capability using container orchestration
- **Auto-Scaling**: Dynamic resource allocation based on container metrics and demand
- **Security-First**: Security integrated into every container layer and orchestration level

### Docker Architecture Benefits
- **Consistency**: Identical runtime environment from laptop to production
- **Scalability**: Easy horizontal scaling with container orchestration
- **Portability**: Deploy anywhere Docker runs (cloud, on-premise, hybrid)
- **Developer Experience**: Single `docker-compose up` command starts entire system
- **Production Readiness**: Development environment mirrors production exactly

> **🐳 Complete Docker Guide**: For detailed setup instructions, troubleshooting, and best practices, see [`docker-setup.md`](./docker-setup.md)

## 2. Cloud Infrastructure Strategy

### 2.1 Cloud Provider: AWS (Primary Recommendation)

**Selection Rationale:**
- **Mature Services**: Comprehensive set of managed services (RDS, S3, CloudFront)
- **Global Reach**: Multiple regions for optimal performance and compliance
- **Cost Optimization**: Reserved instances and auto-scaling for cost control
- **Security**: Industry-leading security features and compliance certifications
- **Developer Experience**: Excellent tooling and documentation

**Alternative Providers:**
- **Google Cloud Platform**: Strong container orchestration with GKE
- **Microsoft Azure**: Good integration with enterprise systems
- **DigitalOcean**: Simplified deployment for smaller scale applications

### 2.2 Infrastructure Components

```
┌─────────────────────────────────────────────────────────────┐
│                    GLOBAL LAYER                             │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ CloudFront   │    │   Route 53   │    │  AWS WAF     │  │
│  │     CDN      │    │     DNS      │    │  Firewall    │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                    REGION: us-east-1                        │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │                Application Layer                     │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │    ALB      │  │  ECS Tasks  │  │  Auto Scaling│  │  │
│  │  │Load Balancer│  │   (API)     │  │    Group     │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                              │                              │
│  ┌──────────────────────────▼──────────────────────────┐  │
│  │                  Data Layer                         │  │
│  │  ┌─────────────┐              ┌─────────────────┐  │  │
│  │  │  RDS Multi-AZ│              │    S3 Bucket    │  │  │
│  │  │ PostgreSQL  │              │ (Image Storage) │  │  │
│  │  └─────────────┘              └─────────────────┘  │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 3. Environment Strategy

### 3.1 Environment Definitions

#### Development Environment
- **Purpose**: Individual developer testing and feature development
- **Infrastructure**: Lightweight, shared resources
- **Database**: Shared PostgreSQL instance with developer schemas
- **URL**: `https://dev.trailguide.app`
- **Auto-Deploy**: On push to `develop` branch

#### Staging Environment
- **Purpose**: Pre-production testing, QA validation, client demos
- **Infrastructure**: Production-like setup with reduced capacity
- **Database**: Separate PostgreSQL instance with production-like data
- **URL**: `https://staging.trailguide.app`
- **Auto-Deploy**: On merge to `staging` branch
- **Data Refresh**: Weekly refresh from production (sanitized)

#### Production Environment
- **Purpose**: Live application serving real users
- **Infrastructure**: Full high-availability setup
- **Database**: Multi-AZ PostgreSQL with read replicas
- **URL**: `https://app.trailguide.com`
- **Deploy Strategy**: Manual approval required, blue-green deployment

### 3.2 Environment Configuration

```yaml
# environments/production.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  NODE_ENV: "production"
  API_BASE_URL: "https://api.trailguide.com"
  CDN_BASE_URL: "https://cdn.trailguide.com"
  DATABASE_SSL: "true"
  REDIS_CLUSTER_MODE: "true"
  LOG_LEVEL: "warn"
  RATE_LIMIT_REQUESTS: "100"
  RATE_LIMIT_WINDOW: "900" # 15 minutes
  
---
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
data:
  DATABASE_URL: <base64-encoded>
  JWT_SECRET: <base64-encoded>
  AWS_ACCESS_KEY_ID: <base64-encoded>
  AWS_SECRET_ACCESS_KEY: <base64-encoded>
  SENTRY_DSN: <base64-encoded>
```

## 4. Docker-First Development to Production Pipeline

### 4.1 Local Development to Production Migration Path

This section provides step-by-step instructions for moving from local development to a production server using Docker.

#### Step 1: Local Development Setup
```bash
# On your local machine
git clone https://github.com/your-org/trailguide-pwa.git
cd trailguide-pwa

# Copy and configure environment
cp .env.example .env.development
# Edit .env.development with local settings

# Start entire system with one command
docker-compose up -d

# Verify all services are running
docker-compose ps
```

#### Step 2: Production Server Preparation
```bash
# On production server (Ubuntu 20.04+)
# Update system and install Docker
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create application directory
sudo mkdir -p /opt/trailguide
sudo chown $USER:$USER /opt/trailguide
```

#### Step 3: Code Deployment
```bash
# On production server
cd /opt/trailguide
git clone https://github.com/your-org/trailguide-pwa.git .

# Configure production environment
cp .env.example .env.production
# Edit .env.production with production settings
nano .env.production

# Create necessary directories
mkdir -p uploads logs ssl backups
```

#### Step 4: Production Deployment
```bash
# Deploy with production configuration
docker-compose -f docker-compose.prod.yml up -d --build

# Check deployment status
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f

# Run initial database setup
docker-compose -f docker-compose.prod.yml exec api npm run migrate
```

#### Step 5: Health Verification
```bash
# Test API health
curl https://yourdomain.com/api/v1/health

# Test frontend
curl https://yourdomain.com/health

# Monitor logs
docker-compose -f docker-compose.prod.yml logs -f api
docker-compose -f docker-compose.prod.yml logs -f frontend
```

### 4.2 Environment-Specific Docker Configurations

#### Development Environment (`docker-compose.yml`)
- **Purpose**: Fast development with hot-reload
- **Services**: API (dev mode), Frontend (dev server), PostgreSQL, Redis
- **Features**: Volume mounts for code, debug ports, relaxed security
- **Command**: `docker-compose up -d`

#### Staging Environment (`docker-compose.staging.yml`)
- **Purpose**: Production-like testing environment
- **Services**: API (production build), Frontend (Nginx), Database, monitoring
- **Features**: Production builds, SSL termination, monitoring stack
- **Command**: `docker-compose -f docker-compose.staging.yml up -d`

#### Production Environment (`docker-compose.prod.yml`)
- **Purpose**: Live production deployment
- **Services**: API (optimized), Frontend (Nginx + SSL), Database (persistent), monitoring
- **Features**: Security hardening, backup automation, log aggregation
- **Command**: `docker-compose -f docker-compose.prod.yml up -d`

### 4.3 Container Migration Checklist

#### Pre-Migration Checklist
- [ ] Docker and Docker Compose installed on target server
- [ ] Environment files configured (`.env.production`)
- [ ] SSL certificates obtained and placed in `./ssl/` directory
- [ ] Database backup created (if migrating existing data)
- [ ] DNS records pointing to new server
- [ ] Firewall configured (ports 80, 443, 22)

#### Migration Execution
- [ ] Clone repository to production server
- [ ] Build and start production containers
- [ ] Verify all services health checks pass
- [ ] Run database migrations
- [ ] Test all critical user flows
- [ ] Configure monitoring and alerting
- [ ] Set up automated backups

#### Post-Migration Verification
- [ ] All services accessible via HTTPS
- [ ] Database connectivity confirmed
- [ ] Image uploads working (S3 integration)
- [ ] Analytics tracking functional
- [ ] SSL certificates valid and auto-renewing
- [ ] Monitoring dashboards operational

## 5. Container Strategy

### 4.1 Docker Configuration

#### API Server Dockerfile
```dockerfile
# Dockerfile.api
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src ./src

# Build application
RUN npm run build

# Production image
FROM node:18-alpine AS production

# Add non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["node", "dist/server.js"]
```

#### Frontend Dockerfile
```dockerfile
# Dockerfile.frontend
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production server
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:80/health || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 4.2 Container Orchestration: Amazon ECS

#### Task Definition
```json
{
  "family": "trailguide-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "account.dkr.ecr.region.amazonaws.com/trailguide-api:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"}
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "/trailguide/database-url"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/trailguide-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 10,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

## 5. CI/CD Pipeline

### 5.1 GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy TrailGuide

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: trailguide

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: trailguide_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

      - name: Run type checking
        run: npm run type-check

      - name: Run unit tests
        run: npm run test
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/trailguide_test

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/trailguide_test

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build and push API image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -f Dockerfile.api -t $ECR_REGISTRY/$ECR_REPOSITORY-api:$IMAGE_TAG .
          docker build -f Dockerfile.api -t $ECR_REGISTRY/$ECR_REPOSITORY-api:latest .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY-api:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY-api:latest

      - name: Build and push Frontend image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -f Dockerfile.frontend -t $ECR_REGISTRY/$ECR_REPOSITORY-frontend:$IMAGE_TAG .
          docker build -f Dockerfile.frontend -t $ECR_REGISTRY/$ECR_REPOSITORY-frontend:latest .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY-frontend:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY-frontend:latest

      - name: Deploy to staging
        if: github.ref == 'refs/heads/develop'
        run: |
          aws ecs update-service \
            --cluster trailguide-staging \
            --service trailguide-api-staging \
            --force-new-deployment

      - name: Deploy to production
        if: github.ref == 'refs/heads/main'
        run: |
          # Blue-green deployment
          aws ecs update-service \
            --cluster trailguide-production \
            --service trailguide-api-production \
            --task-definition trailguide-api:${{ github.sha }} \
            --desired-count 2

          # Wait for deployment to complete
          aws ecs wait services-stable \
            --cluster trailguide-production \
            --services trailguide-api-production

      - name: Run post-deployment tests
        run: |
          # Health check and smoke tests
          npm run test:smoke
```

### 5.2 Database Migration Pipeline

```yaml
# .github/workflows/migrate.yml
name: Database Migration

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to migrate'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production
      migration_direction:
        description: 'Migration direction'
        required: true
        default: 'up'
        type: choice
        options:
          - up
          - down

jobs:
  migrate:
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run database backup
        if: github.event.inputs.environment == 'production'
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          npm run db:backup

      - name: Run migrations
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          npm run migrate:${{ github.event.inputs.migration_direction }}

      - name: Verify migration
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          npm run db:verify
```

## 6. Infrastructure as Code (Terraform)

### 6.1 Main Infrastructure Configuration

```hcl
# terraform/main.tf
terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket = "trailguide-terraform-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "TrailGuide"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# VPC Configuration
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  
  name = "trailguide-${var.environment}"
  cidr = "10.0.0.0/16"
  
  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  
  enable_nat_gateway = true
  enable_vpn_gateway = false
  
  tags = {
    Name = "trailguide-${var.environment}"
  }
}

# RDS Database
module "database" {
  source = "./modules/database"
  
  environment    = var.environment
  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.private_subnets
  instance_class = var.db_instance_class
}

# ECS Cluster
module "ecs" {
  source = "./modules/ecs"
  
  environment = var.environment
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.private_subnets
}

# S3 and CloudFront
module "cdn" {
  source = "./modules/cdn"
  
  environment = var.environment
  domain_name = var.domain_name
}
```

### 6.2 Database Module

```hcl
# terraform/modules/database/main.tf
resource "aws_db_parameter_group" "trailguide" {
  family = "postgres15"
  name   = "trailguide-${var.environment}"
  
  parameter {
    name  = "log_statement"
    value = "all"
  }
  
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }
}

resource "aws_db_subnet_group" "trailguide" {
  name       = "trailguide-${var.environment}"
  subnet_ids = var.subnet_ids
  
  tags = {
    Name = "TrailGuide DB subnet group"
  }
}

resource "aws_db_instance" "trailguide" {
  identifier = "trailguide-${var.environment}"
  
  # Engine configuration
  engine         = "postgres"
  engine_version = "15.3"
  instance_class = var.instance_class
  
  # Storage configuration
  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true
  
  # Database configuration
  db_name  = "trailguide"
  username = "trailguide"
  password = var.db_password
  
  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.trailguide.name
  vpc_security_group_ids = [aws_security_group.database.id]
  
  # High availability
  multi_az               = var.environment == "production"
  backup_retention_period = var.environment == "production" ? 7 : 1
  backup_window          = "03:00-04:00"
  maintenance_window     = "Sun:04:00-Sun:05:00"
  
  # Monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn
  
  # Parameter group
  parameter_group_name = aws_db_parameter_group.trailguide.name
  
  # Security
  deletion_protection = var.environment == "production"
  skip_final_snapshot = var.environment != "production"
  
  tags = {
    Name = "TrailGuide Database"
  }
}

# Read replica for production
resource "aws_db_instance" "trailguide_replica" {
  count = var.environment == "production" ? 1 : 0
  
  identifier = "trailguide-${var.environment}-replica"
  
  # Source database
  replicate_source_db = aws_db_instance.trailguide.id
  
  # Configuration
  instance_class = var.instance_class
  
  # Monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn
  
  tags = {
    Name = "TrailGuide Database Replica"
  }
}
```

## 7. Monitoring and Observability

### 7.1 Application Monitoring Stack

#### CloudWatch Configuration
```yaml
# cloudwatch-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cloudwatch-config
data:
  cwagentconfig.json: |
    {
      "metrics": {
        "namespace": "TrailGuide/Application",
        "metrics_collected": {
          "cpu": {
            "measurement": [
              "cpu_usage_idle",
              "cpu_usage_iowait",
              "cpu_usage_system",
              "cpu_usage_user"
            ],
            "metrics_collection_interval": 60,
            "totalcpu": true
          },
          "disk": {
            "measurement": [
              "used_percent"
            ],
            "metrics_collection_interval": 60,
            "resources": ["*"]
          },
          "diskio": {
            "measurement": [
              "io_time"
            ],
            "metrics_collection_interval": 60,
            "resources": ["*"]
          },
          "mem": {
            "measurement": [
              "mem_used_percent"
            ],
            "metrics_collection_interval": 60
          }
        }
      },
      "logs": {
        "logs_collected": {
          "files": {
            "collect_list": [
              {
                "file_path": "/app/logs/application.log",
                "log_group_name": "/aws/ecs/trailguide-api",
                "log_stream_name": "{instance_id}",
                "timezone": "UTC"
              }
            ]
          }
        }
      }
    }
```

#### Custom Metrics and Alarms
```hcl
# terraform/modules/monitoring/main.tf
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "trailguide-${var.environment}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ec2 cpu utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    ServiceName = "trailguide-api-${var.environment}"
    ClusterName = "trailguide-${var.environment}"
  }
}

resource "aws_cloudwatch_metric_alarm" "high_memory" {
  alarm_name          = "trailguide-${var.environment}-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "90"
  alarm_description   = "This metric monitors memory utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    ServiceName = "trailguide-api-${var.environment}"
    ClusterName = "trailguide-${var.environment}"
  }
}

resource "aws_cloudwatch_metric_alarm" "high_error_rate" {
  alarm_name          = "trailguide-${var.environment}-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "High error rate detected"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }
}
```

### 7.2 Application Performance Monitoring

#### Sentry Integration
```typescript
// src/utils/monitoring.ts
import * as Sentry from '@sentry/node';

export const initializeMonitoring = () => {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: process.env.APP_VERSION,
    
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    beforeSend(event) {
      // Filter out sensitive data
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
      return event;
    },
  });
};

export const captureException = (error: Error, context?: any) => {
  Sentry.captureException(error, context);
};

export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  Sentry.captureMessage(message, level);
};
```

## 8. Security Implementation

### 8.1 Network Security

#### WAF Configuration
```hcl
# terraform/modules/security/waf.tf
resource "aws_wafv2_web_acl" "trailguide" {
  name  = "trailguide-${var.environment}-waf"
  scope = "CLOUDFRONT"
  
  default_action {
    allow {}
  }
  
  # Rate limiting rule
  rule {
    name     = "rate-limiting"
    priority = 1
    
    override_action {
      none {}
    }
    
    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }
    
    action {
      block {}
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitingRule"
      sampled_requests_enabled   = true
    }
  }
  
  # SQL injection protection
  rule {
    name     = "aws-managed-sql-injection"
    priority = 2
    
    override_action {
      none {}
    }
    
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "CommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }
  
  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "TrailGuideWAF"
    sampled_requests_enabled   = true
  }
}
```

### 8.2 Secrets Management

```hcl
# terraform/modules/security/secrets.tf
resource "aws_secretsmanager_secret" "database_url" {
  name        = "trailguide/${var.environment}/database-url"
  description = "Database connection string for TrailGuide"
  
  tags = {
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id     = aws_secretsmanager_secret.database_url.id
  secret_string = jsonencode({
    url = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.trailguide.endpoint}:5432/${var.db_name}?sslmode=require"
  })
}

# IAM role for ECS tasks to access secrets
resource "aws_iam_role" "ecs_task_role" {
  name = "trailguide-${var.environment}-ecs-task-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "ecs_secrets_access" {
  name = "secrets-access"
  role = aws_iam_role.ecs_task_role.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.database_url.arn
        ]
      }
    ]
  })
}
```

## 9. Backup and Disaster Recovery

### 9.1 Database Backup Strategy

```bash
#!/bin/bash
# scripts/backup-database.sh

set -e

ENVIRONMENT=$1
BACKUP_BUCKET="trailguide-backups-${ENVIRONMENT}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="database_backup_${TIMESTAMP}.sql"

# Get database URL from secrets manager
DB_URL=$(aws secretsmanager get-secret-value \
  --secret-id "trailguide/${ENVIRONMENT}/database-url" \
  --query SecretString --output text | jq -r .url)

# Create backup
pg_dump "${DB_URL}" \
  --verbose \
  --no-owner \
  --no-acl \
  --format=custom \
  --file="${BACKUP_FILE}"

# Compress backup
gzip "${BACKUP_FILE}"

# Upload to S3
aws s3 cp "${BACKUP_FILE}.gz" "s3://${BACKUP_BUCKET}/database/${BACKUP_FILE}.gz"

# Clean up local files
rm "${BACKUP_FILE}.gz"

# Verify backup integrity
aws s3 ls "s3://${BACKUP_BUCKET}/database/${BACKUP_FILE}.gz"

echo "Database backup completed successfully: ${BACKUP_FILE}.gz"
```

### 9.2 Disaster Recovery Plan

#### Recovery Time Objectives (RTO)
- **Database**: 30 minutes
- **Application**: 15 minutes
- **File Storage**: 5 minutes (CloudFront)
- **Total System**: 45 minutes

#### Recovery Point Objectives (RPO)
- **Database**: 15 minutes (continuous WAL backup)
- **File Storage**: Real-time (S3 cross-region replication)
- **Application State**: Real-time (stateless design)

#### Recovery Procedures
1. **Database Recovery**:
   ```bash
   # Restore from point-in-time backup
   aws rds restore-db-instance-to-point-in-time \
     --source-db-instance-identifier trailguide-production \
     --target-db-instance-identifier trailguide-recovery \
     --restore-time 2024-01-15T10:30:00Z
   ```

2. **Application Recovery**:
   ```bash
   # Deploy to recovery region
   aws ecs update-service \
     --cluster trailguide-recovery \
     --service trailguide-api \
     --desired-count 2
   ```

3. **DNS Failover**:
   ```bash
   # Update Route 53 to point to recovery region
   aws route53 change-resource-record-sets \
     --hosted-zone-id Z123456789 \
     --change-batch file://failover-changeset.json
   ```

## 10. Cost Optimization

### 10.1 Resource Optimization

#### Auto Scaling Configuration
```hcl
# Auto scaling for ECS service
resource "aws_appautoscaling_target" "ecs_target" {
  max_capacity       = var.environment == "production" ? 10 : 3
  min_capacity       = var.environment == "production" ? 2 : 1
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "scale_up" {
  name               = "scale-up"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace
  
  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}
```

#### Cost Monitoring
```hcl
resource "aws_budgets_budget" "trailguide" {
  name         = "trailguide-${var.environment}-budget"
  budget_type  = "COST"
  limit_amount = var.monthly_budget_limit
  limit_unit   = "USD"
  time_unit    = "MONTHLY"
  
  cost_filters = {
    Tag = {
      Project = ["TrailGuide"]
    }
  }
  
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                 = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = [var.alert_email]
  }
}
```

This comprehensive deployment architecture ensures TrailGuide PWA can be deployed reliably, monitored effectively, and scaled efficiently while maintaining security and cost optimization.