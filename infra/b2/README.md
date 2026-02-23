# B2 / S3-compatible config

- **CORS:** `cors-s3-dev.json`, `cors-s3-prod.json` — use with `put-bucket-cors`.

All commands use the B2 S3 endpoint: `--endpoint-url https://s3.us-east-005.backblazeb2.com`. Run from repo root so `file://infra/b2/...` paths resolve.

**Credentials:** Use a B2 **Application Key** (S3-compatible), not AWS keys. Create one in B2 Console → Application Keys. Then set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` to the Key ID and secret (e.g. `export` them or pass inline before the command). If you use default AWS credentials you'll get `Malformed Access Key Id`.

**Public read:** B2's S3 API does not support `PutBucketPolicy`. Make buckets publicly readable in the B2 Console (Bucket Settings → Bucket type → Public) so the CDN can serve objects.

## Apply CORS

```bash
# Dev
aws s3api put-bucket-cors --bucket zencourt-media-dev --cors-configuration file://infra/b2/cors-s3-dev.json --endpoint-url https://s3.us-east-005.backblazeb2.com

# Prod
aws s3api put-bucket-cors --bucket zencourt-media-prod --cors-configuration file://infra/b2/cors-s3-prod.json --endpoint-url https://s3.us-east-005.backblazeb2.com
```
