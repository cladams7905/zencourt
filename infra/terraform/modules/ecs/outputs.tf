# ECS Module Outputs

# Cluster Outputs
output "cluster_id" {
  description = "ID of the ECS cluster"
  value       = aws_ecs_cluster.main.id
}

output "cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

output "cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

# Service Outputs
output "service_id" {
  description = "ID of the ECS service"
  value       = aws_ecs_service.main.id
}

output "service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.main.name
}

# Task Definition Outputs
output "task_definition_arn" {
  description = "ARN of the task definition"
  value       = aws_ecs_task_definition.main.arn
}

output "task_definition_family" {
  description = "Family of the task definition"
  value       = aws_ecs_task_definition.main.family
}

output "task_definition_revision" {
  description = "Revision of the task definition"
  value       = aws_ecs_task_definition.main.revision
}

# IAM Role Outputs
output "task_execution_role_arn" {
  description = "ARN of the task execution role"
  value       = aws_iam_role.ecs_task_execution.arn
}

output "task_execution_role_name" {
  description = "Name of the task execution role"
  value       = aws_iam_role.ecs_task_execution.name
}

# CloudWatch Logs Output
output "log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.ecs.name
}

output "log_group_arn" {
  description = "ARN of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.ecs.arn
}

# Auto-Scaling Outputs
output "autoscaling_target_id" {
  description = "ID of the auto-scaling target"
  value       = var.enable_autoscaling ? aws_appautoscaling_target.ecs[0].id : null
}

output "cpu_autoscaling_policy_arn" {
  description = "ARN of the CPU-based auto-scaling policy"
  value       = var.enable_autoscaling ? aws_appautoscaling_policy.ecs_cpu[0].arn : null
}

output "memory_autoscaling_policy_arn" {
  description = "ARN of the memory-based auto-scaling policy"
  value       = var.enable_autoscaling ? aws_appautoscaling_policy.ecs_memory[0].arn : null
}
