# S3 Module Variables

variable "bucket_name" {
  description = "Name of the S3 bucket"
  type        = string
}

variable "cors_allowed_origins" {
  description = "List of allowed origins for CORS"
  type        = list(string)
  default = [
    "https://*.vercel.app",
    "https://zencourt.com"
  ]
}

variable "temp_file_expiration_days" {
  description = "Number of days before temp files are deleted"
  type        = number
  default     = 7
}

variable "enable_glacier_archival" {
  description = "Enable automatic archival to Glacier"
  type        = bool
  default     = false
}

variable "glacier_transition_days" {
  description = "Number of days before transitioning to Glacier"
  type        = number
  default     = 90
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}
