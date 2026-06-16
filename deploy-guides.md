# Auckland Transit Pulse — Deploy & Undeploy Guide

## Prerequisites (one-time, already done)

- AWS IAM user `Auckland-Transit-Pulse-Dev` created with `AdministratorAccess`
- AWS CLI profile `atpulse-dev` configured (`aws configure --profile atpulse-dev`)
- CDK bootstrapped for account `<YOUR_AWS_ACCOUNT_ID>` / `ap-southeast-2`
- esbuild installed globally (`npm install -g esbuild`) — required for CDK bundling on Windows
- GitHub repo: `https://github.com/zachho9/Auckland-Transit-Pulse`

---

## Deploy

### 1. Restore the AT API key in SSM

> ⚠️ If you just ran undeploy, wait at least 30 seconds before running this — AWS requires
> a 30-second delay between deleting and recreating a parameter with the same name.

```bash
MSYS_NO_PATHCONV=1 aws ssm put-parameter --name "/auckland-transit-pulse/at-api-key" --value "YOUR_AT_API_KEY_HERE" --type SecureString --region ap-southeast-2 --profile atpulse-dev --overwrite
```

> Replace `YOUR_AT_API_KEY_HERE` with your actual key.
> `--overwrite` is safe to include whether or not the parameter already exists.

### 2. Deploy the CDK stack

```bash
cd infra
AWS_PROFILE=atpulse-dev npx cdk deploy --require-approval never
```

Note the `ApiUrl` output from the deploy. Copy it — you need it for Amplify in step 5.

### 3. Verify the backend pipeline

Wait ~60 seconds for the first poller run, then:

```bash
curl https://<your-api-id>.execute-api.ap-southeast-2.amazonaws.com/prod/snapshot
```

Expected: JSON with `scorecard`, `vehicles`, `alerts`.

### 4. Generate route shapes

The shapes bucket is created by the CDK stack (`ShapesBucketName` output, pattern
`auckland-transit-pulse-shapes-<YOUR_AWS_ACCOUNT_ID>`). Populate it by running the shape
generation script from `backend/`:

```bash
cd backend
AWS_PROFILE=atpulse-dev SHAPES_BUCKET_NAME=auckland-transit-pulse-shapes-<YOUR_AWS_ACCOUNT_ID> npm run generate-shapes
```

This only needs to be (re)run after a fresh deploy or when GTFS shape data changes —
the API Lambda reads shapes from this bucket at request time.

### 5. Create a new Amplify app and connect to GitHub

> Amplify app URLs are tied to the app instance. After deleting the old app you must
> create a new one — there is no "re-enable" option.

In the AWS Console:

1. Open **AWS Amplify** → **Create new app** → **Host web app**
2. Choose **GitHub** → authorise if prompted → select repo `zachho9/Auckland-Transit-Pulse`, branch `main`
3. Build settings: leave as-is — Amplify auto-detects `amplify.yml` at the repo root
4. Add environment variable:
   - Key: `VITE_API_URL`
   - Value: the `ApiUrl` from step 2 above, **without trailing slash**
     e.g. `https://<your-api-id>.execute-api.ap-southeast-2.amazonaws.com/prod`
5. Click **Save and deploy**

The new live URL appears in the Amplify console once the build completes
(format: `https://main.<new-app-id>.amplifyapp.com`).

Update the **Amplify App** row in the AWS Resource Reference table below with the new URL.

---

## AWS Resource Reference

| Resource | Name / ID |
|---|---|
| AWS Account | `<YOUR_AWS_ACCOUNT_ID>` |
| Region | `ap-southeast-2` |
| IAM User | `Auckland-Transit-Pulse-Dev` |
| CLI Profile | `atpulse-dev` |
| DynamoDB Table | `auckland-transit-pulse-snapshot` |
| Poller Lambda | `atp-poller` |
| API Lambda | `atp-api` |
| API Gateway | `auckland-transit-pulse-api` |
| API URL | *(update after each redeploy — from `ApiUrl` output of `cdk deploy`)* |
| SSM Parameter | `/auckland-transit-pulse/at-api-key` |
| Shapes S3 Bucket | `auckland-transit-pulse-shapes-<YOUR_AWS_ACCOUNT_ID>` |
| Amplify App | *(update after each redeploy — from Amplify Console)* |
| GitHub Repo | `https://github.com/zachho9/Auckland-Transit-Pulse` |

---

## Local Preview

### Mock data (no AWS needed)

```bash
cd frontend
VITE_MOCK=true npm run dev
```

Open `http://localhost:5173` — uses hardcoded mock data, no API calls. Works without any deployment.

### Live data (CDK stack must be deployed)

```bash
cd frontend
VITE_API_URL=https://<your-api-id>.execute-api.ap-southeast-2.amazonaws.com/prod npm run dev
```

Open `http://localhost:5173` — polls the real API every 30 seconds. Requires the CDK stack to be deployed (Deploy steps 1–3). No other prerequisites — `npm install` was done during initial setup and doesn't need to be repeated.

> Route shape overlays on the map require Deploy step 4 (generate route shapes) to have been
> run. Without it, `/shapes/{routeId}` returns 404 and the app falls back to no route line —
> everything else (vehicles, scorecard, alerts, history) works fine.

---

## Undeploy

### 1. Destroy the CDK stack (Lambdas, API Gateway, EventBridge)

```bash
cd infra
AWS_PROFILE=atpulse-dev npx cdk destroy --force
```

### 2. Delete the DynamoDB table (retained by CDK)

> The table has `RemovalPolicy.RETAIN`, so `cdk destroy` does **not** delete it —
> it must be removed manually.

```bash
aws dynamodb delete-table --table-name auckland-transit-pulse-snapshot \
  --region ap-southeast-2 --profile atpulse-dev
```

### 3. Empty and delete the shapes S3 bucket (retained by CDK)

> The bucket also has `RemovalPolicy.RETAIN`, so `cdk destroy` leaves it behind.
> S3 buckets must be emptied before they can be deleted.

```bash
aws s3 rm s3://auckland-transit-pulse-shapes-<YOUR_AWS_ACCOUNT_ID> --recursive \
  --region ap-southeast-2 --profile atpulse-dev

aws s3api delete-bucket --bucket auckland-transit-pulse-shapes-<YOUR_AWS_ACCOUNT_ID> \
  --region ap-southeast-2 --profile atpulse-dev
```

### 4. Delete the SSM parameter (not managed by CDK)

```bash
MSYS_NO_PATHCONV=1 aws ssm delete-parameter --name "/auckland-transit-pulse/at-api-key" --region ap-southeast-2 --profile atpulse-dev
```

### 5. Delete the Amplify app

> ⚠️ **Deleting the app is permanent.** The `amplifyapp.com` URL is lost and cannot be recovered.
> You will need to create a brand new Amplify app when redeploying (see Deploy step 5 below).

- AWS Console → Amplify → `Auckland-Transit-Pulse`
- **Actions → Delete app** → confirm

### 6. Verify everything is gone

```bash
# CDK stack — expect: "Stack with id AucklandTransitPulseStack does not exist"
aws cloudformation describe-stacks --stack-name AucklandTransitPulseStack \
  --region ap-southeast-2 --profile atpulse-dev

# DynamoDB table — expect: "ResourceNotFoundException"
aws dynamodb describe-table --table-name auckland-transit-pulse-snapshot \
  --region ap-southeast-2 --profile atpulse-dev

# Shapes S3 bucket — expect: "NoSuchBucket" (404)
aws s3api head-bucket --bucket auckland-transit-pulse-shapes-<YOUR_AWS_ACCOUNT_ID> \
  --region ap-southeast-2 --profile atpulse-dev

# SSM parameter — expect: "ParameterNotFound"
MSYS_NO_PATHCONV=1 aws ssm get-parameter \
  --name "/auckland-transit-pulse/at-api-key" \
  --region ap-southeast-2 --profile atpulse-dev

# Lambdas — expect: "ResourceNotFoundException" for both
aws lambda get-function --function-name atp-poller --region ap-southeast-2 --profile atpulse-dev
aws lambda get-function --function-name atp-api   --region ap-southeast-2 --profile atpulse-dev

# Amplify app — expect: empty list []
aws amplify list-apps --region ap-southeast-2 --profile atpulse-dev --query 'apps[?name==`Auckland-Transit-Pulse`]'
```