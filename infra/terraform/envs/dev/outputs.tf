# Development Environment Outputs

output "s3_bucket_name" {
  description = "Name of the S3 media bucket"
  value       = module.s3.bucket_id
}

output "s3_bucket_arn" {
  description = "ARN of the S3 media bucket"
  value       = module.s3.bucket_arn
}

output "vercel_api_access_key_id" {
  description = "Access Key ID for Vercel API user (add to Vercel env vars)"
  value       = module.iam.vercel_api_access_key_id
}

output "vercel_api_secret_access_key" {
  description = "Secret Access Key for Vercel API user (add to Vercel secrets)"
  value       = module.iam.vercel_api_secret_access_key
  sensitive   = true
}
