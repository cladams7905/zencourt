# Development Environment Backend Configuration
# Uncomment and configure for remote state management

# terraform {
#   backend "s3" {
#     bucket         = "zencourt-terraform-state"
#     key            = "dev/terraform.tfstate"
#     region         = "us-east-1"
#     encrypt        = true
#     dynamodb_table = "zencourt-terraform-lock"
#   }
# }
