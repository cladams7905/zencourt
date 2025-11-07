# ZenCourt Development Environment

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
  environment = "dev"
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
