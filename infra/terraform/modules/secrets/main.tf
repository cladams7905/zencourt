# Secrets Module for ZenCourt Video Processing Infrastructure
# This module manages secrets in AWS Secrets Manager and parameters in SSM Parameter Store

# ------------------------------------------------------------------------------
# AWS Secrets Manager - Secrets
# ------------------------------------------------------------------------------

# Webhook Secret (for signing webhooks from AWS to Vercel)
resource "aws_secretsmanager_secret" "vercel_webhook_signing_key" {
  name        = "/${var.environment}/zencourt/vercel-webhook-signing-key"
  description = "Secret key for signing webhooks to Vercel"

  tags = merge(var.common_tags, {
    Name = "${var.environment}-vercel-webhook-signing-key"
  })
}

resource "aws_secretsmanager_secret_version" "vercel_webhook_signing_key" {
  secret_id     = aws_secretsmanager_secret.vercel_webhook_signing_key.id
  secret_string = var.vercel_webhook_signing_key
}

# API Key for Vercel -> AWS authentication
resource "aws_secretsmanager_secret" "vercel_to_aws_api_key" {
  name        = "/${var.environment}/zencourt/vercel-to-aws-api-key"
  description = "API key for authenticating requests from Vercel to AWS"

  tags = merge(var.common_tags, {
    Name = "${var.environment}-vercel-to-aws-api-key"
  })
}

resource "aws_secretsmanager_secret_version" "vercel_to_aws_api_key" {
  secret_id     = aws_secretsmanager_secret.vercel_to_aws_api_key.id
  secret_string = var.vercel_to_aws_api_key
}

# ------------------------------------------------------------------------------
# SSM Parameter Store - Configuration Parameters
# ------------------------------------------------------------------------------

# Vercel Webhook URL
resource "aws_ssm_parameter" "vercel_webhook_url" {
  name        = "/${var.environment}/zencourt/vercel-webhook-url"
  description = "Vercel webhook URL for video completion callbacks"
  type        = "String"
  value       = var.vercel_webhook_url

  tags = merge(var.common_tags, {
    Name = "${var.environment}-vercel-webhook-url"
  })
}

# AWS Region (for easy reference)
resource "aws_ssm_parameter" "aws_region" {
  name        = "/${var.environment}/zencourt/aws-region"
  description = "AWS region for resources"
  type        = "String"
  value       = var.aws_region

  tags = merge(var.common_tags, {
    Name = "${var.environment}-aws-region"
  })
}

# S3 Bucket Name
resource "aws_ssm_parameter" "s3_bucket_name" {
  name        = "/${var.environment}/zencourt/s3-bucket-name"
  description = "S3 bucket name for media storage"
  type        = "String"
  value       = var.s3_bucket_name

  tags = merge(var.common_tags, {
    Name = "${var.environment}-s3-bucket-name"
  })
}

# Video Processing Configuration
resource "aws_ssm_parameter" "max_concurrent_jobs" {
  name        = "/${var.environment}/zencourt/max-concurrent-jobs"
  description = "Maximum number of concurrent video processing jobs"
  type        = "String"
  value       = tostring(var.max_concurrent_jobs)

  tags = merge(var.common_tags, {
    Name = "${var.environment}-max-concurrent-jobs"
  })
}

resource "aws_ssm_parameter" "job_timeout_ms" {
  name        = "/${var.environment}/zencourt/job-timeout-ms"
  description = "Job timeout in milliseconds"
  type        = "String"
  value       = tostring(var.job_timeout_ms)

  tags = merge(var.common_tags, {
    Name = "${var.environment}-job-timeout-ms"
  })
}
