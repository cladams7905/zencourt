# ECS Module Variables

# Cluster Configuration
variable "cluster_name" {
  description = "Name of the ECS cluster"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "enable_container_insights" {
  description = "Enable CloudWatch Container Insights"
  type        = bool
  default     = true
}

# Task Definition Configuration
variable "task_family" {
  description = "Family name for the ECS task definition"
  type        = string
}

variable "task_cpu" {
  description = "CPU units for the task (1024 = 1 vCPU)"
  type        = string
  default     = "2048" # 2 vCPU
}

variable "task_memory" {
  description = "Memory for the task in MB"
  type        = string
  default     = "4096" # 4 GB
}

variable "task_role_arn" {
  description = "ARN of the IAM role for the task (grants S3 permissions)"
  type        = string
}

variable "container_name" {
  description = "Name of the container"
  type        = string
  default     = "video-processor"
}

variable "container_image" {
  description = "Docker image for the container"
  type        = string
  default     = "nginx:latest" # Placeholder until video-server image is built
}

variable "container_port" {
  description = "Port exposed by the container"
  type        = number
  default     = 3001
}

variable "health_check_path" {
  description = "Health check endpoint path"
  type        = string
  default     = "/health"
}

variable "s3_bucket_name" {
  description = "Name of the S3 bucket for media storage"
  type        = string
}

variable "additional_environment_vars" {
  description = "Additional environment variables for the container"
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

variable "secrets" {
  description = "Secrets from AWS Secrets Manager or Parameter Store"
  type = list(object({
    name      = string
    valueFrom = string
  }))
  default = []
}

# Service Configuration
variable "desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 1
}

variable "health_check_grace_period" {
  description = "Health check grace period in seconds"
  type        = number
  default     = 60
}

# Networking
variable "private_subnet_ids" {
  description = "List of private subnet IDs for ECS tasks"
  type        = list(string)
}

variable "ecs_security_group_id" {
  description = "Security group ID for ECS tasks"
  type        = string
}

# Load Balancer
variable "alb_target_group_arn" {
  description = "ARN of the ALB target group"
  type        = string
}

variable "alb_listener_arn" {
  description = "ARN of the ALB listener (for dependency)"
  type        = string
}

# CloudWatch Logs
variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

# Auto-Scaling
variable "enable_autoscaling" {
  description = "Enable auto-scaling for the ECS service"
  type        = bool
  default     = true
}

variable "autoscaling_min_capacity" {
  description = "Minimum number of tasks for auto-scaling"
  type        = number
  default     = 1
}

variable "autoscaling_max_capacity" {
  description = "Maximum number of tasks for auto-scaling"
  type        = number
  default     = 5
}

variable "cpu_target_value" {
  description = "Target CPU utilization percentage for auto-scaling"
  type        = number
  default     = 70
}

variable "memory_target_value" {
  description = "Target memory utilization percentage for auto-scaling"
  type        = number
  default     = 80
}

variable "scale_in_cooldown" {
  description = "Cooldown period in seconds before scaling in"
  type        = number
  default     = 300
}

variable "scale_out_cooldown" {
  description = "Cooldown period in seconds before scaling out"
  type        = number
  default     = 60
}

# Tags
variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}
