# Quick Start Guide

## 🚀 5-Minute Demo

### 1. Clone & Setup
```bash
git clone <repository-url>
cd POC
cp backend/.env.example backend/.env
# Edit .env with your credentials
```

### 2. Deploy
```bash
docker compose build
docker compose up -d
```

### 3. Generate Proof
```bash
curl -X POST http://localhost:3002/api/generate-proof-single \
  -H "Content-Type: application/json" \
  -d '{
    "clerk_user_id": "user_123",
    "sui_address": "0x<your_sui_address>",
    "jwt_token": "<your_clerk_jwt>"
  }'
```

### 4. Submit to Soundness
```bash
soundness-cli send \
  --proof-file <proof_blob_id> \
  --elf-file <elf_blob_id> \
  --key-name connectsphere-verifier \
  --proving-system sp1
```

## 📋 Requirements

- Docker & Docker Compose
- Clerk account (for JWT)
- Sui wallet address
- Soundness CLI

## 📊 What This Demonstrates

✅ **SP1 Integration**: Zero-knowledge email verification
✅ **Walrus Storage**: Decentralized proof storage
✅ **Soundness CLI**: Ready for on-chain attestation
✅ **Production API**: Queue management & monitoring

## 🔧 Status

- **Working**: SP1 + Walrus pipeline
- **Blocked**: Soundness CLI (testnet issues)
- **Network**: Sui testnet, Walrus testnet

## 📞 Support

See `README.md` for detailed documentation or open an issue for questions.