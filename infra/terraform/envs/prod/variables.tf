# Production Environment Variables

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "vercel_domains" {
  description = "List of Vercel domains for CORS"
  type        = list(string)
  default = [
    "https://*.vercel.app",
    "https://zencourt.com"
  ]
}

# Secrets and Configuration
variable "vercel_api_url" {
  description = "Base URL for the Vercel API that the video server calls"
  type        = string
}

variable "vercel_webhook_signing_key" {
  description = "Secret for signing webhooks (MUST be set via environment variable or .tfvars for production)"
  type        = string
  sensitive   = true
}

variable "vercel_to_aws_api_key" {
  description = "API key for Vercel -> AWS authentication (MUST be set via environment variable or .tfvars for production)"
  type        = string
  sensitive   = true
}

variable "fal_api_key" {
  description = "fal.ai API key used for Kling submissions"
  type        = string
  sensitive   = true
}

variable "database_url" {
  description = "Database connection string for the video server"
  type        = string
  sensitive   = true
}

variable "vercel_webhook_url" {
  description = "Vercel webhook URL for video completion callbacks"
  type        = string
  default     = "https://zencourt.com/api/v1/webhooks/video"
}

variable "alb_certificate_arn" {
  description = "ACM certificate ARN for HTTPS on the Application Load Balancer (leave blank to keep HTTP only)"
  type        = string
  default     = ""
}

variable "github_actions_role_name" {
  description = "Name of the IAM role that GitHub Actions assumes for deployments"
  type        = string
  default     = "zencourt-github-deploy-prod"
}

variable "github_actions_repositories" {
  description = "List of GitHub repositories (owner/name) that may assume the deploy role"
  type        = list(string)
  default     = []
}

variable "github_actions_oidc_provider_arn" {
  description = "Existing GitHub Actions OIDC provider ARN (optional)"
  type        = string
  default     = ""
}
