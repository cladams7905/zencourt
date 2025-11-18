variable "create_role" {
  description = "Whether to create the GitHub Actions deploy role"
  type        = bool
  default     = true
}

variable "role_name" {
  description = "Name of the IAM role assumed by GitHub Actions"
  type        = string
}

variable "github_repositories" {
  description = "List of GitHub repositories (owner/name) allowed to assume the role"
  type        = list(string)

  validation {
    condition     = length(var.github_repositories) > 0
    error_message = "Provide at least one GitHub repository (owner/name) allowed to assume the deploy role."
  }
}

variable "existing_oidc_provider_arn" {
  description = "ARN of an existing GitHub Actions OIDC provider (leave empty to create one)"
  type        = string
  default     = ""
}

variable "ecr_repository_arn" {
  description = "ARN of the ECR repository that Actions can push to"
  type        = string
}

variable "task_role_arn" {
  description = "ARN of the ECS task role allowing GitHub to pass it when registering task definitions"
  type        = string
}

variable "task_execution_role_arn" {
  description = "ARN of the ECS task execution role allowing GitHub to pass it when registering task definitions"
  type        = string
}

variable "common_tags" {
  description = "Common tags applied to created resources"
  type        = map(string)
  default     = {}
}
