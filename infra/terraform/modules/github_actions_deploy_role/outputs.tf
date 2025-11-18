output "role_arn" {
  description = "ARN of the GitHub Actions deploy role"
  value       = var.create_role ? aws_iam_role.github[0].arn : null
}

output "oidc_provider_arn" {
  description = "ARN of the GitHub Actions OIDC provider used by this role"
  value       = var.existing_oidc_provider_arn != "" ? var.existing_oidc_provider_arn : (var.create_role ? aws_iam_openid_connect_provider.github[0].arn : null)
}
