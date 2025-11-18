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

data "aws_caller_identity" "current" {}

locals {
  environment = "prod"
  account_id  = data.aws_caller_identity.current.account_id
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
  certificate_arn            = var.alb_certificate_arn
  common_tags                = local.common_tags
}

# ECR Module
module "ecr" {
  source = "../../modules/ecr"

  repository_name = "zencourt-video-server-${local.environment}"
  common_tags     = local.common_tags
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
  vercel_api_url             = var.vercel_api_url
  aws_video_server_url       = format("%s://%s", var.alb_certificate_arn != "" ? "https" : "http", module.network.alb_dns_name)
  fal_api_key                = var.fal_api_key
  database_url               = var.database_url
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
  container_image            = "${module.ecr.repository_url}:latest"
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
  additional_environment_vars = [
    {
      name  = "AWS_VIDEO_SERVER_URL"
      value = format("%s://%s", var.alb_certificate_arn != "" ? "https" : "http", module.network.alb_dns_name)
    },
    {
      name  = "VERCEL_API_URL"
      value = var.vercel_api_url
    },
    {
      name  = "FAL_WEBHOOK_URL"
      value = format(
        "%s://%s/webhooks/fal",
        var.alb_certificate_arn != "" ? "https" : "http",
        module.network.alb_dns_name
      )
    }
  ]

  # Secrets from Secrets Manager and SSM Parameter Store
  secrets = [
    {
      name      = "VERCEL_WEBHOOK_SIGNING_KEY"
      valueFrom = module.secrets.vercel_webhook_signing_key_arn
    },
    {
      name      = "VERCEL_TO_AWS_API_KEY"
      valueFrom = module.secrets.vercel_to_aws_api_key_arn
    },
    {
      name      = "FAL_KEY"
      valueFrom = module.secrets.fal_api_key_arn
    },
    {
      name      = "DATABASE_URL"
      valueFrom = module.secrets.database_url_secret_arn
    }
  ]
}

# GitHub Actions Deploy Role
module "github_actions_deploy_role" {
  source = "../../modules/github_actions_deploy_role"

  role_name                  = var.github_actions_role_name
  github_repositories        = var.github_actions_repositories
  existing_oidc_provider_arn = var.github_actions_oidc_provider_arn
  ecr_repository_arn         = module.ecr.repository_arn
  task_role_arn              = module.iam.ecs_task_role_arn
  task_execution_role_arn    = module.ecs.task_execution_role_arn
  common_tags                = local.common_tags
}

locals {
  alb_metric_load_balancer = replace(module.network.alb_arn, "arn:aws:elasticloadbalancing:${var.aws_region}:${local.account_id}:loadbalancer/", "")
  alb_metric_target_group  = replace(module.network.alb_target_group_arn, "arn:aws:elasticloadbalancing:${var.aws_region}:${local.account_id}:targetgroup/", "")
}

# CloudWatch alarms for basic observability
resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high" {
  alarm_name          = "zencourt-${local.environment}-ecs-cpu-high"
  alarm_description   = "Average ECS service CPU >= 80% for 3 minutes"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = module.ecs.cluster_name
    ServiceName = module.ecs.service_name
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "ecs_memory_high" {
  alarm_name          = "zencourt-${local.environment}-ecs-memory-high"
  alarm_description   = "Average ECS service memory >= 80% for 3 minutes"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 3
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = module.ecs.cluster_name
    ServiceName = module.ecs.service_name
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "alb_5xx_spike" {
  alarm_name          = "zencourt-${local.environment}-alb-5xx"
  alarm_description   = "ALB returning more than 25 5XX errors over 5 minutes"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 5
  metric_name         = "HTTPCode_ELB_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 25
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = local.alb_metric_load_balancer
  }

  tags = local.common_tags
}
