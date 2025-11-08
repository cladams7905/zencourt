# Production Environment Outputs

output "s3_bucket_name" {
  description = "Name of the S3 media bucket"
  value       = module.s3.bucket_id
}

output "s3_bucket_arn" {
  description = "ARN of the S3 media bucket"
  value       = module.s3.bucket_arn
}

output "ecs_task_role_arn" {
  description = "ARN of the ECS task role"
  value       = module.iam.ecs_task_role_arn
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

# Network Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.network.vpc_id
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer (use as AWS_VIDEO_SERVER_URL)"
  value       = "http://${module.network.alb_dns_name}"
}

output "alb_target_group_arn" {
  description = "ARN of the ALB target group for ECS service"
  value       = module.network.alb_target_group_arn
}

output "ecs_security_group_id" {
  description = "Security group ID for ECS tasks"
  value       = module.network.ecs_tasks_security_group_id
}

output "private_subnet_ids" {
  description = "IDs of private subnets for ECS tasks"
  value       = module.network.private_subnet_ids
}

# ECS Outputs
output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.ecs.cluster_name
}

output "ecs_cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = module.ecs.cluster_arn
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = module.ecs.service_name
}

output "ecs_task_definition_arn" {
  description = "ARN of the ECS task definition"
  value       = module.ecs.task_definition_arn
}

output "ecs_log_group_name" {
  description = "CloudWatch log group name for ECS tasks"
  value       = module.ecs.log_group_name
}
