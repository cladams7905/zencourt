# IAM role that GitHub Actions assumes via OIDC to deploy to ECS/ECR

locals {
  github_sub_patterns = [
    for repo in var.github_repositories : "repo:${repo}:*"
  ]

  oidc_provider_arn = var.existing_oidc_provider_arn != "" ? var.existing_oidc_provider_arn : (var.create_role ? aws_iam_openid_connect_provider.github[0].arn : null)
}

resource "aws_iam_openid_connect_provider" "github" {
  count = var.create_role && var.existing_oidc_provider_arn == "" ? 1 : 0

  client_id_list = ["sts.amazonaws.com"]
  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b5a1d5110c1e24b7e7f"
  ]
  url = "https://token.actions.githubusercontent.com"

  tags = merge(var.common_tags, {
    Name = "${var.role_name}-oidc"
  })
}

resource "aws_iam_role" "github" {
  count = var.create_role ? 1 : 0
  name  = var.role_name

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = local.oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = local.github_sub_patterns
          }
        }
      }
    ]
  })

  tags = merge(var.common_tags, {
    Name = var.role_name
  })
}

data "aws_iam_policy_document" "github" {
  statement {
    effect = "Allow"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:CompleteLayerUpload",
      "ecr:GetAuthorizationToken",
      "ecr:GetDownloadUrlForLayer",
      "ecr:InitiateLayerUpload",
      "ecr:ListImages",
      "ecr:PutImage",
      "ecr:UploadLayerPart",
      "ecr:DescribeRepositories"
    ]
    resources = [
      var.ecr_repository_arn
    ]
  }

  statement {
    effect = "Allow"
    actions = [
      "ecs:DescribeClusters",
      "ecs:DescribeServices",
      "ecs:DescribeTaskDefinition",
      "ecs:DescribeTaskSets",
      "ecs:ListServices",
      "ecs:ListTaskDefinitions",
      "ecs:ListTasks",
      "ecs:RegisterTaskDefinition",
      "ecs:UpdateService",
      "ecs:DescribeTasks"
    ]
    resources = ["*"]
  }

  statement {
    effect = "Allow"
    actions = ["iam:PassRole"]
    resources = compact([
      var.task_role_arn,
      var.task_execution_role_arn
    ])

    condition {
      test     = "StringEquals"
      variable = "iam:PassedToService"
      values   = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy" "github" {
  count  = var.create_role ? 1 : 0
  name   = "${var.role_name}-deploy"
  role   = aws_iam_role.github[0].id
  policy = data.aws_iam_policy_document.github.json
}
