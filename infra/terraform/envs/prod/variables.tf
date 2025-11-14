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

variable "vercel_webhook_url" {
  description = "Vercel webhook URL for video completion callbacks"
  type        = string
  default     = "https://zencourt.com/api/v1/webhooks/video"
}
