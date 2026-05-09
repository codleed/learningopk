# LearningoPK AWS Deployment Script
# Run from: learningopk/ directory
# Prerequisites: AWS CLI installed and configured (aws configure)
#
# Usage:
#   .\scripts\deploy-aws.ps1 -DbPassword "YourSecurePassword123!" -MistralApiKey "your-mistral-key"
#
# If DbPassword is omitted, a random one is generated.

param(
    [string]$DbPassword = "",
    [string]$MistralApiKey = "",
    [string]$GitRepo = ""
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$Region   = "us-east-1"
$App      = "learningopk"
$DbName   = "learningo"
$DbUser   = "postgres"
$S3Suffix = -join ((48..57) + (97..122) | Get-Random -Count 8 | ForEach-Object { [char]$_ })
$S3Bucket = "$App-media-$S3Suffix"
$KeyName  = "$App-key"

# ----- Utility Functions -----

function Write-Step { param([string]$Text) Write-Host "[$Text] " -ForegroundColor Yellow -NoNewline }
function Write-OK   { Write-Host "OK" -ForegroundColor Green }
function Write-Info { param([string]$Text) Write-Host "  $Text" -ForegroundColor Gray }
function Write-Warn { param([string]$Text) Write-Host "  WARN: $Text" -ForegroundColor Magenta }
function Write-Fatal{ param([string]$Text) Write-Host "  FATAL: $Text" -ForegroundColor Red; exit 1 }

# Run an AWS CLI command safely (won't crash on non-zero exit)
function Invoke-Aws {
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $output = aws @args 2>&1
    $global:LASTEXITCODE = $LASTEXITCODE
    $ErrorActionPreference = $prevEAP
    return $output
}

# Run an AWS CLI command and stop on failure
function Invoke-AwsRequired {
    $output = Invoke-Aws @args
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host $output
        Write-Fatal "AWS command failed: aws $args"
    }
    return $output
}

# ----- 1. Verify AWS CLI and Credentials -----

Write-Host ""
Write-Host "========================================" -ForegroundColor Blue
Write-Host "  LearningoPK AWS Deployment" -ForegroundColor Blue
Write-Host "  Region: $Region" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

Write-Step "1. Verifying AWS CLI"
try {
    $awsVer = aws --version 2>&1
    Write-OK
    Write-Info $awsVer
} catch {
    Write-Fatal "AWS CLI not installed. Run: msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi"
}

$caller = aws sts get-caller-identity --region $Region 2>&1 | ConvertFrom-Json
if (-not $caller.Arn) {
    Write-Fatal "AWS credentials not configured. Run: aws configure"
}
Write-Info "Logged in as: $($caller.Arn)"

# ----- 2. Database Password -----

Write-Step "2. Database password"
if (-not $DbPassword) {
    $bytes = New-Object byte[] 16
    [Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes($bytes)
    $DbPassword = "P" + [Convert]::ToBase64String($bytes).Replace("=","").Replace("+","x").Replace("/","z") + "!"
}
Write-OK
Write-Info "DB password: $DbPassword"

# ----- 3. Git Repo URL -----

Write-Step "3. Git repo URL"
if (-not $GitRepo) {
    Write-Fatal "GitRepo is required. Usage: .\scripts\deploy-aws.ps1 -GitRepo 'https://github.com/your-org/Learningo.git' -MistralApiKey 'key'"
}
Write-OK
Write-Info "Repo: $GitRepo"

# ----- 4. Mistral API Key -----

Write-Step "4. Mistral API Key"
if (-not $MistralApiKey) {
    $MistralApiKey = "not-configured"
    Write-Warn "No Mistral API key provided. AI chat will not work until configured."
} else {
    Write-OK
}

# ----- 5. S3 Bucket -----

Write-Step "5. S3 Bucket ($S3Bucket)"
$bucketExists = $false
try {
    aws s3api head-bucket --bucket $S3Bucket --region $Region 2>$null
    $bucketExists = $true
    Write-Warn "Bucket already exists"
} catch { }

if (-not $bucketExists) {
    if ($Region -eq "us-east-1") {
        aws s3api create-bucket --bucket $S3Bucket --region $Region 2>&1 | Out-Null
    } else {
        aws s3api create-bucket --bucket $S3Bucket --region $Region --create-bucket-configuration "LocationConstraint=$Region" 2>&1 | Out-Null
    }
    Write-OK
}

# Wait a moment for bucket to be ready
Start-Sleep -Seconds 3

# Block public access must be off for public-read images
try {
    aws s3api put-public-access-block --bucket $S3Bucket --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false" 2>&1 | Out-Null
} catch {
    Write-Warn "Could not update public access block (bucket may not be ready yet)"
}

# Public-read policy (write to temp file to avoid PowerShell JSON escaping issues)
$bucketPolicy = @{
    Version = "2012-10-17"
    Statement = @(
        @{
            Effect = "Allow"
            Principal = "*"
            Action = "s3:GetObject"
            Resource = "arn:aws:s3:::$S3Bucket/*"
        }
    )
} | ConvertTo-Json -Depth 4 -Compress

$policyFile = [System.IO.Path]::GetTempFileName()
# Use .NET WriteAllText to avoid BOM that Out-File adds (AWS rejects BOM-prefixed JSON)
[System.IO.File]::WriteAllText($policyFile, $bucketPolicy)

# Retry policy a few times (public access block setting takes time to propagate)
$policyOk = $false
for ($i = 0; $i -lt 3; $i++) {
    Invoke-Aws s3api put-bucket-policy --bucket $S3Bucket --policy "file://$policyFile"
    if ($LASTEXITCODE -eq 0) {
        $policyOk = $true
        break
    }
    if ($i -lt 2) {
        Write-Info "Retrying in 5s..."
        Start-Sleep -Seconds 5
    }
}

if ($policyOk) {
    Write-Info "Public-read policy applied"
} else {
    Write-Warn "Could not apply bucket policy (may need public access settings to propagate):"
    Write-Info "  Run manually: aws s3api put-bucket-policy --bucket $S3Bucket --policy file://$policyFile"
}
Remove-Item -LiteralPath $policyFile -Force -ErrorAction SilentlyContinue
Write-Info "Bucket URL: https://$S3Bucket.s3.amazonaws.com"

# ----- 5. IAM User for S3 -----

Write-Step "5. IAM User ($App-s3-user)"
$iamUserExists = $false
try {
    aws iam get-user --user-name "$App-s3-user" 2>$null
    $iamUserExists = $true
    Write-Warn "IAM user already exists"
} catch { }

if (-not $iamUserExists) {
    aws iam create-user --user-name "$App-s3-user" 2>&1 | Out-Null
    aws iam attach-user-policy --user-name "$App-s3-user" --policy-arn "arn:aws:iam::aws:policy/AmazonS3FullAccess" 2>&1 | Out-Null
    Write-OK
}

# Manage access keys: delete old ones (IAM limit of 2), create fresh
$existingKeys = Invoke-Aws iam list-access-keys --user-name "$App-s3-user" --query 'AccessKeyMetadata[].AccessKeyId' --output text
if ($LASTEXITCODE -eq 0 -and $existingKeys) {
    foreach ($keyId in ($existingKeys -split '\s+')) {
        if ($keyId.Trim()) {
            Write-Info "Deleting old access key: $keyId"
            Invoke-Aws iam delete-access-key --user-name "$App-s3-user" --access-key-id $keyId.Trim() | Out-Null
            Start-Sleep -Seconds 1
        }
    }
}

$s3Keys = Invoke-Aws iam create-access-key --user-name "$App-s3-user" --query '{AccessKeyId: AccessKey.AccessKeyId, SecretAccessKey: AccessKey.SecretAccessKey}' --output json
if ($LASTEXITCODE -ne 0) {
    Write-Fatal "Could not create IAM access key. Check IAM console."
}
$s3KeysObj = $s3Keys | ConvertFrom-Json
$s3AccessKey = $s3KeysObj.AccessKeyId
$s3SecretKey = $s3KeysObj.SecretAccessKey
Write-Info "S3 Access Key: $s3AccessKey"

# ----- 6. Security Groups -----

Write-Step "6. Security Groups"

# EC2 SG
$ec2SgName = "$App-ec2-sg"
try {
    aws ec2 describe-security-groups --group-names $ec2SgName --region $Region 2>$null | Out-Null
    Write-Warn "EC2 SG already exists"
} catch {
    $ec2SgId = aws ec2 create-security-group --group-name $ec2SgName --description "LearningoPK EC2" --region $Region --query 'GroupId' --output text 2>&1
    aws ec2 authorize-security-group-ingress --group-id $ec2SgId --protocol tcp --port 22 --cidr "0.0.0.0/0" --region $Region 2>&1 | Out-Null
    aws ec2 authorize-security-group-ingress --group-id $ec2SgId --protocol tcp --port 3001 --cidr "0.0.0.0/0" --region $Region 2>&1 | Out-Null
    Write-OK
}
$ec2SgId = aws ec2 describe-security-groups --group-names $ec2SgName --region $Region --query 'SecurityGroups[0].GroupId' --output text 2>&1
Write-Info "EC2 SG: $ec2SgId (SSH:22, API:3001)"

# RDS SG
$rdsSgName = "$App-rds-sg"
try {
    aws ec2 describe-security-groups --group-names $rdsSgName --region $Region 2>$null | Out-Null
    Write-Warn "RDS SG already exists"
} catch {
    $rdsSgId = aws ec2 create-security-group --group-name $rdsSgName --description "LearningoPK RDS" --region $Region --query 'GroupId' --output text 2>&1
    aws ec2 authorize-security-group-ingress --group-id $rdsSgId --protocol tcp --port 5432 --source-group $ec2SgId --region $Region 2>&1 | Out-Null
    Write-OK
}
$rdsSgId = aws ec2 describe-security-groups --group-names $rdsSgName --region $Region --query 'SecurityGroups[0].GroupId' --output text 2>&1

# Redis SG
$redisSgName = "$App-redis-sg"
try {
    aws ec2 describe-security-groups --group-names $redisSgName --region $Region 2>$null | Out-Null
    Write-Warn "Redis SG already exists"
} catch {
    $redisSgId = aws ec2 create-security-group --group-name $redisSgName --description "LearningoPK Redis" --region $Region --query 'GroupId' --output text 2>&1
    aws ec2 authorize-security-group-ingress --group-id $redisSgId --protocol tcp --port 6379 --source-group $ec2SgId --region $Region 2>&1 | Out-Null
    Write-OK
}
$redisSgId = aws ec2 describe-security-groups --group-names $redisSgName --region $Region --query 'SecurityGroups[0].GroupId' --output text 2>&1

# ----- 7. ElastiCache Redis -----

Write-Step "7. ElastiCache Redis"
$redisClusterId = "$App-redis"

$redisInfo = Invoke-Aws elasticache describe-cache-clusters --cache-cluster-id $redisClusterId --region $Region --query "CacheClusters[0].{Endpoint:CacheNodes[0].Endpoint.Address,Port:CacheNodes[0].Endpoint.Port,Status:CacheClusterStatus}" --output json
$clusterExists = ($LASTEXITCODE -eq 0 -and $redisInfo)

$redisEndpoint = $null; $redisPort = $null; $redisStatus = $null

if ($clusterExists) {
    $redisObj = $redisInfo | ConvertFrom-Json
    $redisStatus = $redisObj.Status
    $redisEndpoint = $redisObj.Endpoint
    $redisPort = $redisObj.Port
}

# If cluster exists but is broken (no cache node/endpoint), delete and recreate
if ($clusterExists -and $redisStatus -eq "available" -and (-not $redisEndpoint -or $redisEndpoint -eq "None")) {
    Write-Warn "Redis cluster exists but has no cache nodes (broken from prior attempt). Deleting..."
    Invoke-Aws elasticache delete-cache-cluster --cache-cluster-id $redisClusterId --region $Region | Out-Null
    Write-Info "Waiting for deletion..."
    for ($i = 0; $i -lt 20; $i++) {
        $check = Invoke-Aws elasticache describe-cache-clusters --cache-cluster-id $redisClusterId --region $Region 2>&1
        if ($LASTEXITCODE -ne 0) { break }
        Write-Host -NoNewline "."
        Start-Sleep -Seconds 15
    }
    Write-Host ""
    $clusterExists = $false
}

if ($clusterExists -and $redisEndpoint -and $redisEndpoint -ne "None") {
    if ($redisStatus -eq "creating") {
        Write-Info "Redis cluster exists and is creating. Waiting..."
        while ($true) {
            $status = aws elasticache describe-cache-clusters --cache-cluster-id $redisClusterId --region $Region --query 'CacheClusters[0].CacheClusterStatus' --output text 2>&1
            if ($status -eq "available") { break }
            Write-Host -NoNewline "."
            Start-Sleep -Seconds 15
        }
        Write-Host ""
    }
    Write-Warn "Redis cluster already exists and is available"
}

if (-not $clusterExists -or -not $redisEndpoint -or $redisEndpoint -eq "None") {
    # Get default cache subnet group
    $subnetGroup = Invoke-Aws elasticache describe-cache-subnet-groups --region $Region --query 'CacheSubnetGroups[0].CacheSubnetGroupName' --output text
    if (-not $subnetGroup -or $subnetGroup -eq "None") {
        Write-Fatal "No ElastiCache subnet group found. Create one in the ElastiCache console first."
    }

    $createResult = Invoke-Aws elasticache create-cache-cluster `
        --cache-cluster-id $redisClusterId `
        --cache-node-type cache.t3.micro `
        --engine redis `
        --engine-version 7.1 `
        --num-cache-nodes 1 `
        --cache-subnet-group-name $subnetGroup `
        --security-group-ids $redisSgId `
        --region $Region
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host $createResult
        Write-Fatal "ElastiCache creation failed. See error above."
    }
    Write-OK
    Write-Info "Waiting for Redis to be available (takes 3-5 minutes)..."
    while ($true) {
        $status = aws elasticache describe-cache-clusters --cache-cluster-id $redisClusterId --region $Region --query 'CacheClusters[0].CacheClusterStatus' --output text 2>&1
        if ($status -eq "available") { break }
        Write-Host -NoNewline "."
        Start-Sleep -Seconds 15
    }
    Write-Host ""
}
# Final endpoint retrieval (works for both existing and new clusters)
$redisEndpoint = Invoke-Aws elasticache describe-cache-clusters --cache-cluster-id $redisClusterId --region $Region --query "CacheClusters[0].CacheNodes[0].Endpoint.Address" --output text
if (-not $redisEndpoint -or $redisEndpoint -eq "None") {
    Write-Info "Redis endpoint not ready yet, retrying..."
    for ($i = 0; $i -lt 10; $i++) {
        Start-Sleep -Seconds 15
        $redisEndpoint = Invoke-Aws elasticache describe-cache-clusters --cache-cluster-id $redisClusterId --region $Region --query "CacheClusters[0].CacheNodes[0].Endpoint.Address" --output text
        if ($redisEndpoint -and $redisEndpoint -ne "None") { break }
        Write-Host -NoNewline "."
    }
    Write-Host ""
}
$redisPort = Invoke-Aws elasticache describe-cache-clusters --cache-cluster-id $redisClusterId --region $Region --query "CacheClusters[0].CacheNodes[0].Endpoint.Port" --output text
if (-not $redisEndpoint -or $redisEndpoint -eq "None") {
    Write-Fatal "Redis cluster exists but has no endpoint. Check AWS console."
}
Write-Info "Redis: $redisEndpoint`:$redisPort"
$RedisUrl = "redis://${redisEndpoint}:${redisPort}"

# ----- 8. RDS PostgreSQL -----

Write-Step "8. RDS PostgreSQL"
$rdsId = "$App-db"

# Generate a random BETTER_AUTH_SECRET
$authBytes = New-Object byte[] 32
[Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes($authBytes)
$BetterAuthSecret = [Convert]::ToBase64String($authBytes)

try {
    $rdsInfo = aws rds describe-db-instances --db-instance-identifier $rdsId --region $Region 2>&1 | ConvertFrom-Json
    $rdsEndpoint = $rdsInfo.DBInstances[0].Endpoint.Address
    $rdsPort = $rdsInfo.DBInstances[0].Endpoint.Port
    Write-Warn "RDS instance already exists"
} catch {
    aws rds create-db-instance `
        --db-instance-identifier $rdsId `
        --db-instance-class db.t3.micro `
        --engine postgres `
        --engine-version 16.4 `
        --allocated-storage 20 `
        --storage-type gp2 `
        --master-username $DbUser `
        --master-user-password $DbPassword `
        --db-name $DbName `
        --vpc-security-group-ids $rdsSgId `
        --no-publicly-accessible `
        --backup-retention-period 0 `
        --region $Region 2>&1 | Out-Null
    Write-OK
    Write-Info "Waiting for RDS to be available (this takes 5-10 minutes)..."
    while ($true) {
        $status = aws rds describe-db-instances --db-instance-identifier $rdsId --region $Region --query 'DBInstances[0].DBInstanceStatus' --output text 2>&1
        if ($status -eq "available") { break }
        Write-Host -NoNewline "."
        Start-Sleep -Seconds 20
    }
    Write-Host ""
}
$rdsEndpoint = aws rds describe-db-instances --db-instance-identifier $rdsId --region $Region --query 'DBInstances[0].Endpoint.Address' --output text 2>&1
$rdsPort = aws rds describe-db-instances --db-instance-identifier $rdsId --region $Region --query 'DBInstances[0].Endpoint.Port' --output text 2>&1
Write-Info "RDS: $rdsEndpoint`:$rdsPort"
$DatabaseUrl = "postgresql://${DbUser}:${DbPassword}@${rdsEndpoint}:${rdsPort}/${DbName}"

# ----- 9. EC2 Key Pair -----

Write-Step "9. EC2 Key Pair ($KeyName)"
$keyFile = "$PSScriptRoot\$KeyName.pem"
try {
    aws ec2 describe-key-pairs --key-names $KeyName --region $Region 2>$null | Out-Null
    Write-Warn "Key pair already exists"
    if (-not (Test-Path $keyFile)) {
        Write-Fatal "Key file $keyFile not found. Please locate your existing key or delete the key pair in AWS console."
    }
} catch {
    $keyMaterial = aws ec2 create-key-pair --key-name $KeyName --region $Region --query 'KeyMaterial' --output text 2>&1
    $keyMaterial | Out-File -Encoding ASCII -FilePath $keyFile
    Write-OK
    Write-Info "Key saved to: $keyFile"
}

# ----- 10. EC2 Instance -----

Write-Step "10. EC2 Instance"
$ec2Name = "$App-server"

try {
    $ec2Info = aws ec2 describe-instances --filters "Name=tag:Name,Values=$ec2Name" "Name=instance-state-name,Values=running" --region $Region 2>&1 | ConvertFrom-Json
    if ($ec2Info.Reservations.Count -gt 0 -and $ec2Info.Reservations[0].Instances.Count -gt 0) {
        $ec2Ip = $ec2Info.Reservations[0].Instances[0].PublicIpAddress
        $ec2Id = $ec2Info.Reservations[0].Instances[0].InstanceId
        Write-Warn "EC2 already running: $ec2Id ($ec2Ip)"
    } else {
        throw "Not found"
    }
} catch {
    # Get latest Ubuntu 24.04 AMI
    $amiId = aws ec2 describe-images `
        --owners 099720109477 `
        --filters "Name=name,Values=ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*" "Name=state,Values=available" `
        --region $Region `
        --query 'sort_by(Images, &CreationDate)[-1].ImageId' `
        --output text 2>&1
    Write-Info "AMI: $amiId"

    # EC2 user-data script (bash)
    $userData = @'
#!/bin/bash
set -e
exec > /var/log/user-data.log 2>&1

echo "=== LearningoPK EC2 Setup ==="
echo "Started at $(date)"

# Install Docker
apt-get update -y
apt-get install -y docker.io git wget curl
systemctl enable docker
systemctl start docker
usermod -aG docker ubuntu

# Install Docker Compose plugin
curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Clone repo
echo "Cloning repository..."
cd /opt
if [ -d "Learningo" ]; then
  echo "Repo already cloned, pulling latest..."
  cd Learningo/learningopk
  git pull
else
  git clone __GIT_REPO__ Learningo
  cd Learningo/learningopk
fi

# Create .env file
cat > .env << ENVEOF
DATABASE_URL=__DATABASE_URL__
REDIS_URL=__REDIS_URL__
BETTER_AUTH_SECRET=__BETTER_AUTH_SECRET__
BETTER_AUTH_URL=http://localhost:3001
FRONTEND_ORIGIN=__FRONTEND_ORIGIN__
MINIO_ENDPOINT=s3.amazonaws.com
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=__S3_ACCESS_KEY__
MINIO_SECRET_KEY=__S3_SECRET_KEY__
MINIO_BUCKET=__S3_BUCKET__
MINIO_PUBLIC_URL=https://__S3_BUCKET__.s3.amazonaws.com
MISTRAL_API_KEY=__MISTRAL_API_KEY__
PORT=3001
ENVEOF

# Build and start
docker-compose -f docker-compose.prod.yml up -d --build

echo "Setup complete at $(date)"
'@

    # Replace placeholders
    $userData = $userData.Replace('__GIT_REPO__', $GitRepo)
    $userData = $userData.Replace('__DATABASE_URL__', $DatabaseUrl)
    $userData = $userData.Replace('__REDIS_URL__', $RedisUrl)
    $userData = $userData.Replace('__BETTER_AUTH_SECRET__', $BetterAuthSecret)
    $userData = $userData.Replace('__FRONTEND_ORIGIN__', 'http://localhost:3000')
    $userData = $userData.Replace('__S3_ACCESS_KEY__', $s3AccessKey)
    $userData = $userData.Replace('__S3_SECRET_KEY__', $s3SecretKey)
    $userData = $userData.Replace('__S3_BUCKET__', $S3Bucket)
    $userData = $userData.Replace('__MISTRAL_API_KEY__', $MistralApiKey)

    # Base64 encode user-data for AWS
    $userDataB64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($userData))

    $ec2Result = Invoke-Aws ec2 run-instances `
        --image-id $amiId `
        --instance-type t2.micro `
        --key-name $KeyName `
        --security-group-ids $ec2SgId `
        --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$ec2Name}]" `
        --user-data $userDataB64 `
        --block-device-mappings "[{DeviceName=/dev/sda1,Ebs={VolumeSize=20,VolumeType=gp2}}]" `
        --region $Region `
        --query "Instances[0].InstanceId" `
        --output text
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host $ec2Result
        Write-Fatal "EC2 launch failed. See error above."
    }
    $ec2Id = $ec2Result.Trim()

    Write-OK
    Write-Info "Instance ID: $ec2Id"

    Write-Info "Waiting for EC2 to be running..."
    aws ec2 wait instance-running --instance-ids $ec2Id --region $Region 2>&1
    Start-Sleep -Seconds 10

    $ec2Ip = aws ec2 describe-instances --instance-ids $ec2Id --region $Region --query 'Reservations[0].Instances[0].PublicIpAddress' --output text 2>&1
    Write-Info "Public IP: $ec2Ip"
}

# ----- 11. Run Database Migrations -----

Write-Step "11. Database migrations"
Write-Info "Waiting for EC2 app to be ready (user-data may still be running)..."
Start-Sleep -Seconds 30

$migrationCmd = @"
cd /opt/Learningo/learningopk && \
DATABASE_URL='$DatabaseUrl' \
docker-compose -f docker-compose.prod.yml exec -T backend node -e "
const { drizzle } = require('drizzle-orm/node-postgres');
const { migrate } = require('drizzle-orm/node-postgres/migrator');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: '$DatabaseUrl' });
const db = drizzle(pool);
migrate(db, { migrationsFolder: 'drizzle' }).then(() => { console.log('Migrations complete'); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });
"
"@

Write-Info "Migration endpoint: $rdsEndpoint"
Write-Info "Run migrations manually after SSH:"
Write-Info "  ssh -i scripts/$KeyName.pem ubuntu@$ec2Ip"
Write-Info "  cd /opt/Learningo/learningopk"
Write-Info "  docker-compose -f docker-compose.prod.yml exec backend node ... (see DEPLOYMENT.md)"

# ----- 12. Summary -----

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  DEPLOYMENT COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "--- AWS Resources ---" -ForegroundColor Cyan
Write-Host "EC2 IP:             $ec2Ip"
Write-Host "EC2 SSH:            ssh -i scripts/$KeyName.pem ubuntu@$ec2Ip"
Write-Host "RDS Endpoint:       $rdsEndpoint`:$rdsPort"
Write-Host "Redis Endpoint:     $redisEndpoint`:$redisPort"
Write-Host "S3 Bucket:          $S3Bucket"
Write-Host "DB Password:        $DbPassword"
Write-Host ""
Write-Host "--- Vercel Configuration ---" -ForegroundColor Cyan
Write-Host "Add these env vars in Vercel project settings:"
Write-Host "  NEXT_PUBLIC_APP_URL      = https://<your-vercel-app>.vercel.app"
Write-Host "  NEXT_PUBLIC_BACKEND_URL  = https://<your-vercel-app>.vercel.app"
Write-Host "  BACKEND_URL              = http://$ec2Ip`:3001"
Write-Host ""
Write-Host "--- Next Steps ---" -ForegroundColor Cyan
Write-Host "1. SSH into EC2 and run database migrations:"
Write-Host "   ssh -i scripts/$KeyName.pem ubuntu@$ec2Ip"
Write-Host "   cd /opt/Learningo/learningopk"
Write-Host "   See DEPLOYMENT.md Part 3 for migration commands"
Write-Host ""
Write-Host "2. Deploy frontend on Vercel:"
Write-Host "   - Import GitHub repo"
Write-Host "   - Root directory: learningopk/frontend"
Write-Host "   - Set env vars as shown above"
Write-Host "   - The BACKEND_URL env var enables Vercel API proxying"
Write-Host ""
Write-Host "3. Verify API health:"
Write-Host "   curl http://$ec2Ip`:3001/api/health"
Write-Host ""
Write-Host "4. Get Mistral API key: https://console.mistral.ai/"
Write-Host "   (Set MISTRAL_API_KEY env var on EC2 and restart)"
Write-Host "========================================" -ForegroundColor Green
