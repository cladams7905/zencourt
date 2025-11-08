# Secrets Module Variables

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

# Secrets Manager Variables
variable "vercel_webhook_signing_key" {
  description = "Secret value for webhook signing (use a strong random string)"
  type        = string
  sensitive   = true
}

variable "vercel_to_aws_api_key" {
  description = "API key for Vercel -> AWS authentication (use a strong random string)"
  type        = string
  sensitive   = true
}

# SSM Parameter Store Variables
variable "vercel_webhook_url" {
  description = "Vercel webhook URL for video completion callbacks"
  type        = string
}

variable "redis_host" {
  description = "Redis host for video processing queue"
  type        = string
  default     = "localhost" # Placeholder - will be updated when Redis is deployed
}

variable "redis_port" {
  description = "Redis port"
  type        = number
  default     = 6379
}

variable "redis_password" {
  description = "Redis password (optional, use for production)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "s3_bucket_name" {
  description = "S3 bucket name for media storage"
  type        = string
}

# Video Processing Configuration
variable "max_concurrent_jobs" {
  description = "Maximum number of concurrent video processing jobs"
  type        = number
  default     = 1
}

variable "job_timeout_ms" {
  description = "Job timeout in milliseconds (default: 10 minutes)"
  type        = number
  default     = 600000
}

# Tags
variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}
