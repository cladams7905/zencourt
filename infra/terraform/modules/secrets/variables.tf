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

variable "fal_api_key" {
  description = "API key for fal.ai video rendering"
  type        = string
  sensitive   = true
}

variable "database_url" {
  description = "Database connection string used by the video server"
  type        = string
  sensitive   = true
}

# SSM Parameter Store Variables
variable "vercel_webhook_url" {
  description = "Vercel webhook URL for video completion callbacks"
  type        = string
}

variable "vercel_api_url" {
  description = "Vercel API base URL for authenticated callbacks"
  type        = string
}

variable "aws_video_server_url" {
  description = "Public URL that Vercel should use to reach the ECS video server (typically ALB DNS)"
  type        = string
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
