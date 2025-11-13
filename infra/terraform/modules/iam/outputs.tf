# IAM Module Outputs

output "ecs_task_role_arn" {
  description = "ARN of the ECS task role"
  value       = length(aws_iam_role.ecs_task) > 0 ? aws_iam_role.ecs_task[0].arn : null
}

output "ecs_task_role_name" {
  description = "Name of the ECS task role"
  value       = length(aws_iam_role.ecs_task) > 0 ? aws_iam_role.ecs_task[0].name : null
}

output "vercel_api_user_name" {
  description = "Name of the Vercel API user"
  value       = aws_iam_user.vercel_api.name
}

output "vercel_api_user_arn" {
  description = "ARN of the Vercel API user"
  value       = aws_iam_user.vercel_api.arn
}

output "vercel_api_access_key_id" {
  description = "Access Key ID for Vercel API user"
  value       = var.create_access_key ? aws_iam_access_key.vercel_api[0].id : null
}

output "vercel_api_secret_access_key" {
  description = "Secret Access Key for Vercel API user"
  value       = var.create_access_key ? aws_iam_access_key.vercel_api[0].secret : null
  sensitive   = true
}
