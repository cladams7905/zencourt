# Secrets Module Outputs

# Secrets Manager Outputs
output "vercel_webhook_signing_key_arn" {
  description = "ARN of the webhook secret in Secrets Manager"
  value       = aws_secretsmanager_secret.vercel_webhook_signing_key.arn
}

output "vercel_webhook_signing_key_name" {
  description = "Name of the webhook secret"
  value       = aws_secretsmanager_secret.vercel_webhook_signing_key.name
}

output "vercel_to_aws_api_key_arn" {
  description = "ARN of the API key secret in Secrets Manager"
  value       = aws_secretsmanager_secret.vercel_to_aws_api_key.arn
}

output "vercel_to_aws_api_key_name" {
  description = "Name of the API key secret"
  value       = aws_secretsmanager_secret.vercel_to_aws_api_key.name
}

output "fal_api_key_arn" {
  description = "ARN of the fal.ai API key secret"
  value       = aws_secretsmanager_secret.fal_api_key.arn
}

output "database_url_secret_arn" {
  description = "ARN of the database URL secret"
  value       = aws_secretsmanager_secret.database_url.arn
}

# SSM Parameter Store Outputs
output "vercel_webhook_url_parameter" {
  description = "SSM parameter name for Vercel webhook URL"
  value       = aws_ssm_parameter.vercel_webhook_url.name
}

output "vercel_api_url_parameter" {
  description = "SSM parameter name for Vercel API URL"
  value       = aws_ssm_parameter.vercel_api_url.name
}

output "aws_video_server_url_parameter" {
  description = "SSM parameter name for AWS video server URL"
  value       = aws_ssm_parameter.aws_video_server_url.name
}

output "s3_bucket_name_parameter" {
  description = "SSM parameter name for S3 bucket"
  value       = aws_ssm_parameter.s3_bucket_name.name
}

output "aws_region_parameter" {
  description = "SSM parameter name for AWS region"
  value       = aws_ssm_parameter.aws_region.name
}

# All parameter ARNs for IAM policy attachment
output "all_parameter_arns" {
  description = "List of all SSM parameter ARNs"
  value = [
    aws_ssm_parameter.vercel_webhook_url.arn,
    aws_ssm_parameter.aws_region.arn,
    aws_ssm_parameter.s3_bucket_name.arn,
    aws_ssm_parameter.max_concurrent_jobs.arn,
    aws_ssm_parameter.job_timeout_ms.arn,
    aws_ssm_parameter.vercel_api_url.arn,
    aws_ssm_parameter.aws_video_server_url.arn
  ]
}

output "all_secret_arns" {
  description = "List of all Secrets Manager secret ARNs"
  value = [
    aws_secretsmanager_secret.vercel_webhook_signing_key.arn,
    aws_secretsmanager_secret.vercel_to_aws_api_key.arn,
    aws_secretsmanager_secret.fal_api_key.arn,
    aws_secretsmanager_secret.database_url.arn
  ]
}
