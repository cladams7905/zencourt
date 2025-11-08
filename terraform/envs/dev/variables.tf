# Development Environment Variables

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
  description = "Secret for signing webhooks (set via environment variable or .tfvars)"
  type        = string
  sensitive   = true
  default     = "CHANGE_ME_IN_PRODUCTION"
}

variable "vercel_to_aws_api_key" {
  description = "API key for Vercel -> AWS authentication (set via environment variable or .tfvars)"
  type        = string
  sensitive   = true
  default     = "CHANGE_ME_IN_PRODUCTION"
}

variable "vercel_webhook_url" {
  description = "Vercel webhook URL for video completion callbacks"
  type        = string
  default     = "https://zencourt.vercel.app/api/webhooks/video-complete"
}
