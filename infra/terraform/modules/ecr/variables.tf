variable "repository_name" {
  description = "Name of the ECR repository"
  type        = string
}

variable "enable_lifecycle_policy" {
  description = "Whether to enable lifecycle policy cleanup"
  type        = bool
  default     = true
}

variable "untagged_image_retention_days" {
  description = "Number of days to keep untagged images"
  type        = number
  default     = 7
}

variable "max_tagged_images" {
  description = "Maximum number of tagged images to retain"
  type        = number
  default     = 20
}

variable "lifecycle_tag_prefixes" {
  description = "List of tag prefixes that should be included in lifecycle rules"
  type        = list(string)
  default     = ["release", "main", "latest"]
}

variable "common_tags" {
  description = "Common tags to apply to the repository"
  type        = map(string)
  default     = {}
}
