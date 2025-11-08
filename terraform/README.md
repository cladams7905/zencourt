# ZenCourt Terraform Infrastructure

This directory contains Terraform configurations for deploying ZenCourt's AWS infrastructure using a modular, multi-environment structure.

## Directory Structure

```
terraform/
├── modules/               # Reusable Terraform modules
│   ├── s3/               # S3 bucket configuration
│   ├── iam/              # IAM roles and users
│   ├── network/          # VPC and networking (future)
│   └── ecs/              # ECS cluster and services (future)
│
├── envs/                 # Environment-specific configurations
│   ├── dev/              # Development/Preview environments
│   └── prod/             # Production environment
│
└── README.md             # This file
```

## Prerequisites

- Terraform >= 1.0
- AWS CLI configured with appropriate credentials
- AWS account with permissions to create:
  - S3 buckets
  - IAM roles and users
  - (Future: VPC, ECS, ALB, etc.)

## Quick Start

### 1. Choose Environment

```bash
# Navigate to the environment you want to deploy
cd envs/dev     # For development
cd envs/staging # For staging
cd envs/prod    # For production
```

### 2. Initialize Terraform

```bash
terraform init
```

### 3. Review Configuration

Edit `terraform.tfvars` to customize settings:

```hcl
aws_region = "us-east-1"

vercel_domains = [
  "https://*.vercel.app",
  "https://zencourt.com"
]
```

### 4. Plan and Apply

```bash
# Preview changes
terraform plan

# Apply changes
terraform apply

# Auto-approve (use with caution)
terraform apply -auto-approve
```

### 5. Get Outputs

```bash
# View all outputs
terraform output

# Get specific output
terraform output s3_bucket_name
terraform output -raw vercel_api_secret_access_key
```

## Module Documentation

### S3 Module (`modules/s3`)

Creates and configures S3 bucket for media storage.

**Features:**

- Server-side encryption (AES-256)
- Public access blocking
- CORS configuration
- Lifecycle policies (temp file deletion, Glacier archival)
- Bucket policies (HTTPS-only, encryption enforcement)

**Inputs:**

- `bucket_name` - Name of the S3 bucket
- `cors_allowed_origins` - List of allowed CORS origins
- `temp_file_expiration_days` - Days before temp files are deleted (default: 7)
- `enable_glacier_archival` - Enable Glacier archival (default: false)
- `glacier_transition_days` - Days before Glacier transition (default: 90)
- `common_tags` - Tags to apply to resources

**Outputs:**

- `bucket_id` - S3 bucket ID
- `bucket_arn` - S3 bucket ARN
- `bucket_domain_name` - S3 bucket domain name

### IAM Module (`modules/iam`)

Creates IAM roles and users for application access.

**Resources Created:**

- ECS Task Role (for video processing containers)
- Vercel API User (for frontend uploads)
- Associated policies and access keys

**Inputs:**

- `ecs_task_role_name` - Name of ECS task role
- `vercel_api_user_name` - Name of Vercel API user
- `s3_bucket_arn` - ARN of S3 bucket to grant access to
- `create_access_key` - Whether to create access key (default: true)
- `common_tags` - Tags to apply to resources

**Outputs:**

- `ecs_task_role_arn` - ECS task role ARN
- `vercel_api_access_key_id` - Access key ID for Vercel
- `vercel_api_secret_access_key` - Secret access key for Vercel (sensitive)

## Environment-Specific Configurations

### Development (`envs/dev`)

- **Bucket**: `zencourt-media-dev`
- **CORS**: Includes `http://localhost:3000`
- **Glacier Archival**: Disabled
- **Purpose**: Local development and testing

### Production (`envs/prod`)

- **Bucket**: `zencourt-media-prod`
- **CORS**: Vercel domains only
- **Glacier Archival**: Enabled (90 days)
- **Purpose**: Live production environment

## Deploying Multiple Environments

```bash
# Deploy development
cd envs/dev
terraform init
terraform apply

# Deploy production
cd ../prod
terraform init
terraform apply
```

## State Management

### Local State (Default)

By default, state is stored locally in `terraform.tfstate`. **Not recommended for teams.**

### Remote State (Recommended)

Edit `backend.tf` in each environment:

```hcl
terraform {
  backend "s3" {
    bucket         = "zencourt-terraform-state"
    key            = "dev/terraform.tfstate"  # Change per environment
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "zencourt-terraform-lock"
  }
}
```

Then re-initialize:

```bash
terraform init -reconfigure
```

## Vercel Integration

After deploying, add outputs to Vercel environment variables:

```bash
# Get values
export AWS_S3_BUCKET=$(terraform output -raw s3_bucket_name)
export AWS_ACCESS_KEY_ID=$(terraform output -raw vercel_api_access_key_id)
export AWS_SECRET_ACCESS_KEY=$(terraform output -raw vercel_api_secret_access_key)
export AWS_REGION="us-east-1"

# Add to Vercel
vercel env add AWS_S3_BUCKET production
vercel env add AWS_ACCESS_KEY_ID production
vercel env add AWS_SECRET_ACCESS_KEY production
vercel env add AWS_REGION production
```

## Common Commands

```bash
# Initialize
terraform init

# Validate configuration
terraform validate

# Format code
terraform fmt -recursive

# Plan changes
terraform plan

# Apply changes
terraform apply

# Destroy resources
terraform destroy

# List resources
terraform state list

# Show resource
terraform state show module.s3.aws_s3_bucket.media

# Import existing resource
terraform import module.s3.aws_s3_bucket.media zencourt-media-dev
```

## Updating Infrastructure

### Modifying Modules

1. Edit module files in `modules/`
2. Navigate to environment directory
3. Run `terraform plan` to preview changes
4. Run `terraform apply` to apply changes

### Modifying Environment Config

1. Edit files in `envs/{environment}/`
2. Run `terraform plan` to preview
3. Run `terraform apply` to deploy

### Adding New Modules

1. Create new module in `modules/new-module/`
2. Add module call in `envs/{environment}/main.tf`:

```hcl
module "new_module" {
  source = "../../modules/new-module"

  # Variables...
}
```

3. Run `terraform init` to initialize new module
4. Run `terraform plan` and `terraform apply`

## Troubleshooting

### Error: Bucket Already Exists

S3 bucket names are globally unique. If the bucket name is taken:

1. Add a random suffix to bucket name
2. Or choose a different name

### Error: Access Denied

Ensure your AWS credentials have the required permissions:

```bash
# Check current credentials
aws sts get-caller-identity

# Verify permissions
aws iam get-user-policy --user-name your-user --policy-name your-policy
```

### State Lock Issues

If state is locked:

```bash
# View lock info
terraform force-unlock <LOCK_ID>

# Use with caution - only if you're sure no other operation is running
```

### Module Not Found

```bash
# Re-initialize to download modules
terraform init -upgrade
```

## Security Best Practices

1. **Remote State**: Use S3 backend with encryption and DynamoDB locking
2. **Access Keys**: Rotate Vercel API access keys every 90 days
3. **Least Privilege**: Grant minimum required IAM permissions
4. **Secrets Management**: Never commit `terraform.tfvars` with secrets
5. **State Security**: Restrict access to state files (contain sensitive data)
6. **MFA**: Enable MFA on AWS account
7. **Audit**: Review Terraform plans before applying

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Terraform Deploy

on:
  push:
    branches: [main]
    paths:
      - "terraform/**"

jobs:
  terraform:
    runs-on: ubuntu-latest
    env:
      TF_VAR_aws_region: us-east-1

    steps:
      - uses: actions/checkout@v3

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2
        with:
          terraform_version: 1.5.0

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Terraform Init
        working-directory: terraform/envs/dev
        run: terraform init

      - name: Terraform Plan
        working-directory: terraform/envs/dev
        run: terraform plan

      - name: Terraform Apply
        if: github.ref == 'refs/heads/main'
        working-directory: terraform/envs/dev
        run: terraform apply -auto-approve
```

## Cost Estimation

### Per Environment (Approximate)

**Development:**

- S3 Storage (10GB): $0.23/month
- S3 Requests: $0.05/month
- Data Transfer (5GB): $0.45/month
- **Total**: ~$0.73/month

**Production:**

- S3 Storage (100GB): $2.30/month
- S3 Requests: $0.50/month
- Data Transfer (50GB): $4.50/month
- **Total**: ~$7.30/month

Use `terraform plan` with cost estimation tools:

- [Infracost](https://www.infracost.io/)
- [terraform-cost-estimation](https://github.com/antonbabenko/terraform-cost-estimation)

## Next Steps

1. ✅ Deploy S3 and IAM infrastructure
2. ⏳ Add VPC and networking module (Task 2)
3. ⏳ Add ECS cluster module (Task 3)
4. ⏳ Implement Express video processing server
5. ⏳ Deploy to AWS ECS

## Resources

- [Terraform Documentation](https://www.terraform.io/docs)
- [AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Terraform Best Practices](https://www.terraform-best-practices.com/)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
