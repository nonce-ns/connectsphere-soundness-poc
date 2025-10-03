# Contributing to ConnectSphere POC

Thank you for your interest in contributing to ConnectSphere! This document provides guidelines for contributing to this Proof of Concept implementation.

## 🚀 Getting Started

### Prerequisites
- Docker and Docker Compose
- Node.js 20+
- Rust (for SP1 development)
- Basic understanding of zero-knowledge proofs

### Setup
1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/connectsphere-poc.git`
3. Install dependencies: `npm install`
4. Set up environment variables from `.env.example`
5. Start development: `docker compose up -d`

## 📝 Development Guidelines

### Code Style
- Use TypeScript for backend services
- Follow Rust conventions for SP1 programs
- Add JSDoc comments for all public functions
- Use semantic commit messages

### Testing
- Test all changes locally before submitting
- Verify SP1 proof generation works end-to-end
- Test Walrus upload functionality
- Validate Soundness CLI integration

### Documentation
- Update README.md for major changes
- Add inline code comments for complex logic
- Update API documentation for endpoint changes

## 🐛 Bug Reports

When filing bug reports, please include:
- Environment details (OS, Docker version)
- Error logs and stack traces
- Steps to reproduce
- Expected vs actual behavior

## 💡 Feature Requests

Feature requests are welcome! Please:
- Describe the use case clearly
- Explain why it would be valuable
- Consider implementation complexity
- Suggest possible approaches

## 🔧 Pull Requests

### Process
1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly
5. Submit a pull request with:
   - Clear description of changes
   - Testing performed
   - Related issues

### Review Criteria
- Code follows project conventions
- Changes are well-documented
- Tests pass successfully
- No sensitive data exposed
- Maintains backward compatibility where possible

## 🤝 Community Guidelines

- Be respectful and constructive
- Help others when possible
- Focus on what is best for the community
- Show empathy towards other community members

## 📞 Contact

For questions or discussions:
- Open an issue for technical questions
- Start a discussion for general topics
- Mention maintainers for urgent matters

---

Thank you for contributing to ConnectSphere! 🎉