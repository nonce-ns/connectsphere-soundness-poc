# Demo Instructions

## 🚀 Quick Demo Setup

### Prerequisites
- Docker and Docker Compose installed
- Clerk account (for JWT tokens)
- Supabase project (optional, for persistent storage)

### 1. Clone Repository
```bash
git clone <repository-url>
cd POC
```

### 2. Configure Environment
```bash
# Copy environment template
cp backend/.env.example backend/.env

# Edit with your credentials
nano backend/.env
```

### 3. Deploy Stack
```bash
docker compose build
docker compose up -d
```

### 4. Verify Deployment
```bash
# Check health status
curl http://localhost:3002/api/health

# Expected response:
# {
#   "status": "healthy",
#   "dependencies": {
#     "supabase": "healthy",
#     "redis": "healthy",
#     "walrus": "healthy"
#   }
# }
```

## 🎭 Demo Flow

### Step 1: Get Clerk JWT Token
1. Go to Clerk dashboard
2. Create test user with Gmail account
3. Get session JWT token

### Step 2: Generate SP1 Proof
```bash
curl -X POST http://localhost:3002/api/generate-proof-single \
  -H "Content-Type: application/json" \
  -d '{
    "clerk_user_id": "user_123",
    "sui_address": "0x<your_sui_address>",
    "jwt_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
  }'
```

### Expected Response
```json
{
  "success": true,
  "session_id": "sess_1730458671000_user_123",
  "status": "completed",
  "result": {
    "proof_blob_id": "<proof_blob_id_from_response>",
    "elf_blob_id": "<elf_blob_id_from_response>",
    "cli_command": "soundness-cli send --proof-file <proof_blob_id> --elf-file <elf_blob_id> --key-name connectsphere-verifier --proving-system sp1"
  }
}
```

### Step 3: Verify Walrus Upload
```bash
# Check if proof blob exists
curl -I https://aggregator.walrus-testnet.walrus.space/v1/blobs/<proof_blob_id>

# Expected: HTTP 200 OK
```

### Step 4: Soundness CLI Submission
```bash
soundness-cli send \
  --proof-file <proof_blob_id> \
  --elf-file <elf_blob_id> \
  --key-name connectsphere-verifier \
  --proving-system sp1
```

## 🔍 Monitoring

### Check Session Status
```bash
curl http://localhost:3002/api/session/sess_1730458671000_user_123
```

### Check Queue Status
```bash
curl http://localhost:3002/api/status
```

## 🐛 Troubleshooting

### Common Issues

**1. SP1 Proof Generation Fails**
- Check Redis connection: `docker logs connectsphere-redis-1`
- Verify JWT token format and validity
- Ensure Gmail domain in user email

**2. Walrus Upload Fails**
- Check network connectivity to Walrus testnet
- Verify blob size (< 10MB)
- Check Walrus service status

**3. Soundness CLI Errors**
- Currently returning HTTP 500 (testnet issue)
- Verify key is imported: `soundness-cli list-keys`
- Check role rotation schedule

### Logs
```bash
# Backend logs
docker logs connectsphere-backend-1

# Frontend logs
docker logs connectsphere-frontend-1

# Redis logs
docker logs connectsphere-redis-1
```

## 📊 Performance Metrics

- **Proof Generation Time**: 10-20 minutes
- **Walrus Upload Time**: 15-30 seconds
- **Proof Size**: ~9.55 MB
- **ELF Size**: ~400 KB
- **Memory Usage**: ~8GB during proving

## 🎯 Success Criteria

✅ SP1 proof generated successfully
✅ Proof uploaded to Walrus
✅ CLI command generated
✅ Public blob verification works
⏳ Soundness submission (blocked by testnet)