# ZenCourt Production Environment

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

locals {
  environment = "prod"
  common_tags = {
    Environment = local.environment
    Application = "ZenCourt"
    ManagedBy   = "Terraform"
    Project     = "VideoProcessing"
  }
}

# S3 Module
module "s3" {
  source = "../../modules/s3"

  bucket_name             = "zencourt-media-${local.environment}"
  cors_allowed_origins    = concat(var.vercel_domains, ["http://localhost:3000"])
  temp_file_expiration_days = 7
  enable_glacier_archival = false
  common_tags             = local.common_tags
}

# IAM Module
module "iam" {
  source = "../../modules/iam"

  ecs_task_role_name    = "zencourt-ecs-task-role-${local.environment}"
  vercel_api_user_name  = "zencourt-vercel-api-${local.environment}"
  s3_bucket_arn         = module.s3.bucket_arn
  create_access_key     = true
  common_tags           = local.common_tags
}

# Network Module
module "network" {
  source = "../../modules/network"

  name_prefix                = "zencourt-${local.environment}"
  vpc_cidr                   = "10.1.0.0/16"  # Different CIDR from dev
  availability_zones         = ["${var.aws_region}a", "${var.aws_region}b"]
  public_subnet_cidrs        = ["10.1.1.0/24", "10.1.2.0/24"]
  private_subnet_cidrs       = ["10.1.11.0/24", "10.1.12.0/24"]
  enable_nat_gateway         = true
  container_port             = 3001
  health_check_path          = "/health"
  alb_ingress_cidrs          = ["0.0.0.0/0"] # Allow from anywhere - can restrict to Vercel IPs if needed
  enable_deletion_protection = true  # Enable deletion protection in production
  common_tags                = local.common_tags
}

# Secrets Module (must be created before ECS to reference in secrets)
module "secrets" {
  source = "../../modules/secrets"

  environment                = local.environment
  aws_region                 = var.aws_region
  vercel_webhook_signing_key = var.vercel_webhook_signing_key
  vercel_to_aws_api_key      = var.vercel_to_aws_api_key
  vercel_webhook_url         = var.vercel_webhook_url
  s3_bucket_name             = module.s3.bucket_id
  max_concurrent_jobs        = 1
  job_timeout_ms             = 600000  # 10 minutes
  common_tags                = local.common_tags
}

# ECS Module
module "ecs" {
  source = "../../modules/ecs"

  cluster_name               = "zencourt-${local.environment}"
  environment                = local.environment
  aws_region                 = var.aws_region
  enable_container_insights  = true
  task_family                = "zencourt-video-processor-${local.environment}"
  task_cpu                   = "2048"  # 2 vCPU
  task_memory                = "4096"  # 4 GB
  task_role_arn              = module.iam.ecs_task_role_arn
  container_name             = "video-processor"
  container_image            = "nginx:latest" # Placeholder - will be replaced with actual image in Task 5
  container_port             = 3001
  health_check_path          = "/health"
  s3_bucket_name             = module.s3.bucket_id
  desired_count              = 1
  health_check_grace_period  = 60
  private_subnet_ids         = module.network.private_subnet_ids
  ecs_security_group_id      = module.network.ecs_tasks_security_group_id
  alb_target_group_arn       = module.network.alb_target_group_arn
  alb_listener_arn           = module.network.alb_listener_arn
  log_retention_days         = 90  # Longer retention for production
  enable_autoscaling         = true
  autoscaling_min_capacity   = 1
  autoscaling_max_capacity   = 5
  cpu_target_value           = 70
  memory_target_value        = 80
  scale_in_cooldown          = 300
  scale_out_cooldown         = 60
  common_tags                = local.common_tags

  # Secrets from Secrets Manager and SSM Parameter Store
  secrets = [
    {
      name      = "vercel_webhook_signing_key"
      valueFrom = module.secrets.vercel_webhook_signing_key_arn
    },
    {
      name      = "vercel_to_aws_api_key"
      valueFrom = module.secrets.vercel_to_aws_api_key_arn
    }
  ]
}
