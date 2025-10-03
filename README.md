# ConnectSphere × Soundness Layer POC

> **Privacy-preserving identity verification using SP1 zero-knowledge proofs and Soundness Layer**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![SP1](https://img.shields.io/badge/SP1-zkSNARKs-blue.svg)](https://succinct.xyz/)
[![Walrus](https://img.shields.io/badge/Walrus-Storage-green.svg)](https://walrus.space/)
[![Soundness](https://img.shields.io/badge/Soundness-Attestation-purple.svg)](https://soundness.xyz/)

## 🎯 Overview

ConnectSphere demonstrates a complete integration of SP1 zero-knowledge proofs with Soundness Layer for decentralized email domain verification without exposing personal information.

## ✅ Key Achievements

- **🔐 ZK Email Verification**: SP1 proofs for Gmail domain validation
- **💾 Decentralized Storage**: Walrus blob storage with public access
- **⚡ Production API**: Queue management & session handling
- **⛓️ Soundness Ready**: CLI integration for on-chain attestation

## 🏗️ Architecture

```
Frontend → Backend → SP1 Prover → Walrus Storage → Soundness CLI
   🎭       🔄        🔐           💾            ⛓️
 Clerk    Queue    ZK Proof    Blob Storage   On-chain
 OAuth    Mgmt     Generation  Public Access  Attestation
```

## 🚀 Quick Start

**Option 1: Web UI Demo (Recommended)**
```bash
docker compose up -d
# Open http://localhost:3000
# Simple web interface for testing SP1 proof generation
```

**Option 2: CLI Demo (5 minutes)**
- See [`QUICK_START.md`](./QUICK_START.md)

**Option 3: Full Documentation**
- See [`POC_Soundness.md`](./POC_Soundness.md)

**Option 4: API Demo**
- See [`DEMO.md`](./DEMO.md)

## 📊 Current Status

| Component | Status | Details |
|-----------|--------|---------|
| SP1 Prover | ✅ Working | Generates valid ZK proofs |
| Walrus Upload | ✅ Working | 9.55MB proof blobs stored |
| Backend API | ✅ Working | Queue + rate limiting |
| Soundness CLI | 🔧 Blocked | HTTP 500 on testnet |

## 📁 Project Structure

```
POC/
├── 📖 README.md                    # This file
├── 🚀 QUICK_START.md              # 5-minute setup guide
├── 📋 POC_Soundness.md      # Technical documentation
├── 🛠️ DEMO.md                      # Detailed demo instructions
├── 📜 LICENSE                      # MIT license
├── 🤝 CONTRIBUTING.md              # Contribution guidelines
├── 🐳 compose.yaml                 # Docker configuration
├── 🚫 .gitignore                   # Security rules
├── frontend/                       # Simple demo UI
│   ├── index.html                  # Single-page demo interface
│   ├── server.js                   # Express server
│   ├── Dockerfile                  # Frontend container
│   └── package.json                # Dependencies
└── backend/
    ├── ⚙️ .env.example             # Environment template
    ├── src/
    │   ├── services/
    │   │   ├── 📧 sp1.ts           # SP1 proof generation
    │   │   └── 💾 walrus.ts        # Walrus storage client
    │   └── lib/
    │       └── 🔄 queue.ts         # Processing logic
    └── sp1/
        └── program/
            └── src/
                └── 🔐 main.rs      # ZK verification circuit
```

## 🔧 Technologies

- **SP1**: Zero-knowledge proof generation
- **Walrus**: Decentralized storage network
- **Soundness**: On-chain attestation layer
- **Express**: Backend API framework
- **Docker**: Containerization

## 💡 Use Cases Demonstrated

1. **Privacy-Preserving Identity**: Verify email domains without exposing personal data
2. **Decentralized Storage**: Store proofs on Walrus with public verification
3. **Zero-Knowledge Integration**: Complete SP1 + Soundness workflow
4. **Production Architecture**: Queue management, rate limiting, monitoring

## 📞 Getting Started

1. **Clone**: `git clone <repository-url>`
2. **Configure**: Copy `.env.example` to `.env`
3. **Deploy**: `docker compose up -d`
4. **Demo**: Open http://localhost:3000 or follow CLI instructions

## 🌐 Demo Interfaces

- **🖥️ Web UI**: http://localhost:3000 (Simple interface)
- **📊 API**: http://localhost:3002/api (Backend endpoints)
- **📋 Docs**: [`POC_Soundness.md`](./POC_Soundness.md)

## 🎯 What This Proves

- ✅ SP1 integration is feasible for identity verification
- ✅ Walrus storage works for ZK proof artifacts
- ✅ Soundness Layer can be integrated with existing applications
- ✅ Production-ready architecture for decentralized identity

---

> **Note**: This is a working Proof of Concept. Implementation may evolve based on ecosystem feedback and testing results.

---

*For detailed technical documentation, see [`POC_Soundness.md`](./POC_Soundness.md)*