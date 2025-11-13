#!/bin/bash

# LocalStack S3 Bucket Initialization Script
# This script creates the required S3 bucket in LocalStack
# It is idempotent and can be run multiple times safely

set -e

# Set AWS credentials for LocalStack (required even though they're dummy values)
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-test}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-test}"
export AWS_DEFAULT_REGION="${AWS_REGION:-us-east-1}"

# Configuration
BUCKET_NAME="${AWS_S3_BUCKET:-zencourt-media-dev}"
AWS_ENDPOINT="${AWS_ENDPOINT:-http://localhost:4566}"
AWS_REGION="${AWS_REGION:-us-east-1}"

echo "=========================================="
echo "LocalStack S3 Initialization"
echo "=========================================="
echo "Bucket Name: $BUCKET_NAME"
echo "Endpoint: $AWS_ENDPOINT"
echo "Region: $AWS_REGION"
echo "=========================================="

# Wait for LocalStack to be ready
echo "Waiting for LocalStack to be ready..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
  if curl -s "${AWS_ENDPOINT}/_localstack/health" > /dev/null 2>&1; then
    echo "LocalStack is ready!"
    break
  fi
  attempt=$((attempt + 1))
  echo "Attempt $attempt/$max_attempts: LocalStack not ready yet, waiting..."
  sleep 2
done

if [ $attempt -eq $max_attempts ]; then
  echo "ERROR: LocalStack failed to become ready after $max_attempts attempts"
  exit 1
fi

# Check if bucket already exists
echo "Checking if bucket '$BUCKET_NAME' exists..."
if aws --endpoint-url="$AWS_ENDPOINT" s3 ls "s3://$BUCKET_NAME" > /dev/null 2>&1; then
  echo "Bucket '$BUCKET_NAME' already exists. Skipping creation."
else
  echo "Creating bucket '$BUCKET_NAME'..."
  aws --endpoint-url="$AWS_ENDPOINT" \
    s3 mb "s3://$BUCKET_NAME" \
    --region "$AWS_REGION"

  echo "Bucket '$BUCKET_NAME' created successfully!"
fi

# Configure CORS for the bucket (useful for web uploads)
echo "Configuring CORS for bucket '$BUCKET_NAME'..."
aws --endpoint-url="$AWS_ENDPOINT" \
  s3api put-bucket-cors \
  --bucket "$BUCKET_NAME" \
  --cors-configuration '{
    "CORSRules": [
      {
        "AllowedOrigins": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
        "AllowedHeaders": ["*"],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3000
      }
    ]
  }'

echo "CORS configured successfully!"

# Verify bucket exists
echo "Verifying bucket creation..."
if aws --endpoint-url="$AWS_ENDPOINT" s3 ls "s3://$BUCKET_NAME" > /dev/null 2>&1; then
  echo "SUCCESS: Bucket '$BUCKET_NAME' is accessible!"
else
  echo "ERROR: Bucket verification failed!"
  exit 1
fi

echo "=========================================="
echo "LocalStack S3 initialization complete!"
echo "=========================================="
