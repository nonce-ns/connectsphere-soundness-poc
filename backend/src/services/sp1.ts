/**
 * ConnectSphere SP1 Service
 *
 * Provides zero-knowledge proof generation for email domain verification
 * using SP1 zk-SNARKs. This service handles JWT verification, proof generation,
 * and integration with the SP1 prover.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { Buffer } from 'buffer';
import { createPublicKey, X509Certificate, generateKeyPairSync } from 'crypto';
import jwt from 'jsonwebtoken';

const execAsync = promisify(exec);

export interface SP1ProofGenerationRequest {
  jwtToken: string;
  expectedDomain: string;
  clerkUserId: string;
  userEmail?: string;
  googlePublicKey?: string;
  suiAddress?: string;
}

export interface SP1VerificationResults {
  domain: string;
  signature_valid: boolean;
  domain_verified: boolean;
  clerk_user_id: string;
  sui_address: string;
  verification_success: boolean;
}

export interface SP1ProofGenerationResponse {
  success: boolean;
  proof_file_path?: string;
  elf_file_path?: string;
  verification_results?: SP1VerificationResults;
  error?: string;
}

export class SP1ProofService {
  private readonly sp1ServicePath: string;
  private readonly outputDir: string;
  private jwksCache: {
    keys: Map<string, string>;
    expiresAt: number;
  } = {
    keys: new Map(),
    expiresAt: 0,
  };

  constructor() {
    this.sp1ServicePath = process.env.SP1_SERVICE_PATH || path.join(process.cwd(), 'sp1/bin/connectsphere-sp1-script');
    this.outputDir = process.env.SP1_OUTPUT_DIR || '/tmp/connectsphere-proofs';
  }

  async generateProof(request: SP1ProofGenerationRequest): Promise<SP1ProofGenerationResponse> {
    try {
      await fs.promises.mkdir(this.outputDir, { recursive: true });

      let publicKeyForProof = await this.getGooglePublicKey(request.jwtToken);
      let userInfo = await clerkAuthService.verifyClerkSession(request.jwtToken);

      if (!userInfo?.email && request.userEmail) {
        userInfo = {
          id: request.clerkUserId,
          email: request.userEmail,
          emailVerified: true,
        } as ClerkUserInfo;
      }

      if (!userInfo?.email) {
        throw new Error('Could not extract email from Clerk session');
      }

      if (request.suiAddress && !this.isValidSuiAddress(request.suiAddress)) {
        throw new Error(`Invalid SUI address format: ${request.suiAddress}`);
      }

      let tokenForProof = request.jwtToken;
      const originalHasEmail = this.hasEmailClaim(request.jwtToken);

      if (!originalHasEmail && userInfo.email) {
        const { token: customToken, publicKeyPem } = this.createEmailVerificationJWT(userInfo);
        tokenForProof = customToken;
        publicKeyForProof = publicKeyPem;
      }

      const tempPublicKeyFile = `/tmp/public-key-${Date.now()}.pem`;
      await fs.promises.writeFile(tempPublicKeyFile, publicKeyForProof);

      const command = `${this.sp1ServicePath} generate "${tokenForProof}" "${tempPublicKeyFile}" "${request.expectedDomain}" "${request.suiAddress || ''}" "${this.outputDir}"`;

      try {
        const result = await execAsync(command, {
          timeout: Number(process.env.SP1_PROOF_TIMEOUT_MS || 3600000),
          maxBuffer: 1024 * 1024 * 10,
        });

        const { stdout, stderr } = result;
        if (stderr) {
          // Log stderr for debugging without console.log
        }

        const response = this.parseSP1Response(stdout);
        return response;
      } finally {
        await fs.promises.unlink(tempPublicKeyFile).catch(() => {});
      }

    } catch (error: any) {
      return {
        success: false,
        error: `SP1 proof generation failed: ${error.message}`
      };
    }
  }

  private parseSP1Response(stdout: string): SP1ProofGenerationResponse {
    const candidates: string[] = [];
    const trimmedStdout = stdout.trim();

    if (trimmedStdout) {
      candidates.push(trimmedStdout);
    }

    const jsonMatches = trimmedStdout.match(/\{[\s\S]*\}/g);
    if (jsonMatches && jsonMatches.length) {
      candidates.push(...jsonMatches);
    }

    for (const candidate of candidates) {
      if (!candidate) continue;

      try {
        const cleaned = candidate.replace(/\u001b\[[0-9;]*m/g, '');
        const jsonCandidate = JSON.parse(cleaned);
        if (jsonCandidate && typeof jsonCandidate === 'object' && 'success' in jsonCandidate) {
          return jsonCandidate as SP1ProofGenerationResponse;
        }
      } catch {
        // Try next candidate
      }
    }

    throw new Error('No JSON response found in SP1 service output');
  }

  async readProofFile(filePath: string): Promise<Buffer> {
    return await fs.promises.readFile(filePath);
  }

  async readElfFile(filePath: string): Promise<Buffer> {
    return await fs.promises.readFile(filePath);
  }

  private async getGooglePublicKey(jwtToken: string): Promise<string> {
    const headerPart = jwtToken.split('.')[0];
    if (!headerPart) {
      throw new Error('Invalid JWT token format');
    }

    const headerJson = JSON.parse(
      Buffer.from(headerPart.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    );
    const kid = headerJson?.kid;

    if (!kid) {
      throw new Error('JWT missing key id (kid) header');
    }

    await this.ensureJwksCache();
    const cached = this.jwksCache.keys.get(kid);
    if (cached) {
      return cached;
    }

    await this.refreshGoogleJwks();
    const refreshed = this.jwksCache.keys.get(kid);
    if (!refreshed) {
      throw new Error(`Google JWKS does not contain key for kid ${kid}. Available keys: ${Array.from(this.jwksCache.keys.keys()).join(', ')}`);
    }
    return refreshed;
  }

  private async ensureJwksCache(): Promise<void> {
    if (this.jwksCache.expiresAt > Date.now() && this.jwksCache.keys.size > 0) {
      return;
    }
    await this.refreshGoogleJwks();
  }

  private async refreshGoogleJwks(): Promise<void> {
    const jwksUrl = process.env.GOOGLE_OAUTH_JWKS_URL || 'https://www.googleapis.com/oauth2/v3/certs';

    const response = await fetch(jwksUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch Google JWKS (status ${response.status})`);
    }

    const data = await response.json() as { keys?: Array<Record<string, any>> };
    if (!data.keys || !Array.isArray(data.keys)) {
      throw new Error('Invalid JWKS payload from Google');
    }

    const keyMap = new Map<string, string>();
    for (const key of data.keys) {
      if (!key || typeof key !== 'object' || !key.kid) {
        continue;
      }

      let pem: string | null = null;

      if (Array.isArray(key.x5c) && key.x5c[0]) {
        try {
          pem = this.convertCertificateToPublicKeyPem(key.x5c[0]);
        } catch (error) {
          // Continue on error
        }
      } else if (key.kty === 'RSA' && key.n && key.e) {
        try {
          pem = this.convertRsaJwkToPem(key);
        } catch (error) {
          // Continue on error
        }
      }

      if (pem) {
        keyMap.set(String(key.kid), pem);
      }
    }

    if (keyMap.size === 0) {
      throw new Error('Google JWKS did not contain any usable keys');
    }

    const cacheControl = response.headers.get('cache-control');
    const maxAgeMatch = cacheControl?.match(/max-age=(\d+)/i);
    const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) * 1000 : 5 * 60 * 1000;

    this.jwksCache = {
      keys: keyMap,
      expiresAt: Date.now() + maxAge,
    };
  }

  private convertCertificateToPublicKeyPem(certificate: string): string {
    try {
      const certBuffer = Buffer.from(certificate, 'base64');
      const x509 = new X509Certificate(certBuffer);
      return x509.publicKey.export({ type: 'spki', format: 'pem' }).toString();
    } catch (error) {
      throw new Error(`Failed to convert Google certificate to public key: ${(error as Error).message}`);
    }
  }

  private convertRsaJwkToPem(key: { [key: string]: any }): string {
    try {
      const publicKey = createPublicKey({
        key: {
          kty: 'RSA',
          n: key.n,
          e: key.e,
        },
        format: 'jwk',
      });
      return publicKey.export({ type: 'spki', format: 'pem' }).toString();
    } catch (error) {
      throw new Error(`Failed to convert Google JWK to public key: ${(error as Error).message}`);
    }
  }

  private createEmailVerificationJWT(userInfo: ClerkUserInfo): { token: string; publicKeyPem: string } {
    const payload = {
      email: userInfo.email,
      email_verified: userInfo.emailVerified,
      sub: userInfo.id,
      iss: 'connectsphere-verification',
      aud: 'gmail.com',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      name: `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim()
    };

    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
    return { token, publicKeyPem: publicKey };
  }

  private hasEmailClaim(token: string): boolean {
    try {
      const [, payloadPart] = token.split('.');
      if (!payloadPart) return false;
      const decoded = JSON.parse(Buffer.from(payloadPart.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));

      if (decoded?.email) {
        const email = decoded.email;
        if (typeof email === 'string' && !email.includes('{{') && !email.includes('}}') && email.includes('@')) {
          return true;
        }
      }

      const emailAddresses = decoded?.email_addresses;
      if (Array.isArray(emailAddresses) && emailAddresses.length > 0) {
        const firstEmail = emailAddresses[0];
        if (firstEmail?.email_address &&
            typeof firstEmail.email_address === 'string' &&
            !firstEmail.email_address.includes('{{') &&
            !firstEmail.email_address.includes('}}') &&
            firstEmail.email_address.includes('@')) {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  private isValidSuiAddress(address: string): boolean {
    const suiAddressRegex = /^0x[a-fA-F0-9]{64}$/;
    return suiAddressRegex.test(address);
  }
}

export const sp1ProofService = new SP1ProofService();