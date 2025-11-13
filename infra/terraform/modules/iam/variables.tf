# IAM Module Variables

variable "ecs_task_role_name" {
  description = "Name of the ECS task role"
  type        = string
}

variable "vercel_api_user_name" {
  description = "Name of the Vercel API IAM user"
  type        = string
}

variable "s3_bucket_arn" {
  description = "ARN of the S3 bucket to grant access to"
  type        = string
}

variable "create_access_key" {
  description = "Whether to create an access key for the Vercel API user"
  type        = bool
  default     = true
}

variable "create_ecs_task_role" {
  description = "Whether to create the ECS task role (set false for local-only dev)"
  type        = bool
  default     = true
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}
