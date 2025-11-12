# IAM Module - Roles and Users for ZenCourt

# ECS Task Role
resource "aws_iam_role" "ecs_task" {
  name = var.ecs_task_role_name

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = merge(var.common_tags, {
    Name = var.ecs_task_role_name
  })
}

# ECS Task Role - S3 Access Policy
resource "aws_iam_role_policy" "ecs_task_s3" {
  name = "S3MediaAccess"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:PutObjectAcl"
        ]
        Resource = "${var.s3_bucket_arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = var.s3_bucket_arn
      }
    ]
  })
}

# ECS Task Role - CloudWatch Logs Access
resource "aws_iam_role_policy_attachment" "ecs_task_cloudwatch" {
  role       = aws_iam_role.ecs_task.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess"
}

# IAM User for Vercel API
resource "aws_iam_user" "vercel_api" {
  name = var.vercel_api_user_name

  tags = merge(var.common_tags, {
    Name = var.vercel_api_user_name
  })
}

# Vercel API User - S3 Access Policy
resource "aws_iam_user_policy" "vercel_api_s3" {
  name = "S3ReadWriteAccess"
  user = aws_iam_user.vercel_api.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "${var.s3_bucket_arn}/user_*/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = var.s3_bucket_arn
        Condition = {
          StringLike = {
            "s3:prefix" = ["user_*/*"]
          }
        }
      }
    ]
  })
}

# Access Key for Vercel API User
resource "aws_iam_access_key" "vercel_api" {
  count = var.create_access_key ? 1 : 0
  user  = aws_iam_user.vercel_api.name
}
