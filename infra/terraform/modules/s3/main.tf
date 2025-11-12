# S3 Module - Media Storage Bucket

resource "aws_s3_bucket" "media" {
  bucket = var.bucket_name

  tags = merge(var.common_tags, {
    Name    = var.bucket_name
    Purpose = "MediaStorage"
  })
}

# Server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Allow public read access via bucket policy, but block public ACLs
resource "aws_s3_bucket_public_access_block" "media" {
  bucket = aws_s3_bucket.media.id

  block_public_acls       = true  # Prevent setting ACLs to public
  block_public_policy     = false # Allow bucket policy for public read
  ignore_public_acls      = true  # Ignore any existing public ACLs
  restrict_public_buckets = false # Allow public read via bucket policy
}

# CORS configuration
resource "aws_s3_bucket_cors_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = var.cors_allowed_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

# Lifecycle configuration
resource "aws_s3_bucket_lifecycle_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    id     = "DeleteTempFiles"
    status = "Enabled"

    filter {
      prefix = "temp/"
    }

    expiration {
      days = var.temp_file_expiration_days
    }

    noncurrent_version_expiration {
      noncurrent_days = 1
    }
  }
}

# Bucket policy
resource "aws_s3_bucket_policy" "media" {
  bucket = aws_s3_bucket.media.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.media.arn}/*"
      },
      {
        Sid       = "DenyInsecureTransport"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.media.arn,
          "${aws_s3_bucket.media.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      },
      {
        Sid       = "DenyUnencryptedObjectUploads"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.media.arn}/*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption" = "AES256"
          }
        }
      }
    ]
  })
}
