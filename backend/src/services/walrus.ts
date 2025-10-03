/**
 * Walrus Decentralized Storage Integration for ConnectSphere Backend
 *
 * This service provides a TypeScript interface to interact with Walrus storage
 * for uploading and downloading SP1 proof files and ELF programs.
 */

import { trackMetric } from '../utils/metrics';
import { logger } from '../utils/logger';

export interface WalrusConfig {
  publisherUrl: string;
  aggregatorUrl: string;
  epochs: number;
}

export interface WalrusUploadResponse {
  newlyCreated?: {
    blobObject: {
      id: string;
      registeredEpoch: number;
      blobId: string;
      size: number;
      encodingType: string;
      certifiedEpoch?: number;
      storage: {
        id: string;
        startEpoch: number;
        endEpoch: number;
        storageSize: number;
      };
      deletable: boolean;
    };
    resourceOperation: {
      registerFromScratch?: {
        encodedLength: number;
        epochsAhead: number;
      };
    };
    cost: number;
  };
  alreadyCertified?: {
    id: string;
    registeredEpoch: number;
    blobId: string;
    size: number;
    encodingType: string;
    certifiedEpoch?: number;
    storage: {
      id: string;
      startEpoch: number;
      endEpoch: number;
      storageSize: number;
    };
    deletable: boolean;
  };
}

export interface ConnectSphereProofMetadata {
  proofBlobId: string;
  elfBlobId: string;
  domain: string;
  clerkUserId: string;
  uploadedAt: string;
  verificationStatus: 'uploaded' | 'soundness_verified' | 'sbt_minted' | 'failed';
}

export class WalrusClient {
  private config: WalrusConfig;

  constructor(config?: Partial<WalrusConfig>) {
    this.config = {
      publisherUrl: config?.publisherUrl || 'https://publisher.walrus-testnet.walrus.space',
      aggregatorUrl: config?.aggregatorUrl || 'https://aggregator.walrus-testnet.walrus.space',
      epochs: config?.epochs || 5, // Storage duration
    };
  }

  /**
   * Test connectivity to Walrus endpoints
   */
  async testConnectivity(): Promise<{ publisher: boolean; aggregator: boolean; errors: string[] }> {
    const errors: string[] = [];
    let publisherHealthy = false;
    let aggregatorHealthy = false;

    try {
      // Test publisher endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const publisherResponse = await fetch(`${this.config.publisherUrl}/ping`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      publisherHealthy = publisherResponse.ok || publisherResponse.status === 405;
    } catch (error: any) {
      errors.push(`Publisher: ${error.message}`);
    }

    try {
      // Test aggregator endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const aggregatorResponse = await fetch(`${this.config.aggregatorUrl}/v1/blobs/test`, {
        method: 'HEAD',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      aggregatorHealthy = aggregatorResponse.ok || aggregatorResponse.status === 404;
    } catch (error: any) {
      errors.push(`Aggregator: ${error.message}`);
    }

    return {
      publisher: publisherHealthy,
      aggregator: aggregatorHealthy,
      errors
    };
  }

  /**
   * Upload proof data to Walrus storage
   */
  async uploadProofFile(proofData: Uint8Array | Buffer | string): Promise<string> {
    logger.info('Uploading SP1 proof to Walrus', { size: proofData.length });
    trackMetric('walrus_proof_upload_started', 1);

    const blobId = await this.uploadBlob(proofData, 'sp1-proof');

    logger.info('SP1 proof uploaded successfully', { blobId });
    trackMetric('walrus_proof_upload_success', 1, { blob_id: blobId });
    return blobId;
  }

  /**
   * Upload ELF program file to Walrus storage
   */
  async uploadElfFile(elfData: Uint8Array | Buffer | string): Promise<string> {
    logger.info('Uploading ELF program to Walrus', { size: elfData.length });
    trackMetric('walrus_elf_upload_started', 1);

    const blobId = await this.uploadBlob(elfData, 'elf-program');

    logger.info('ELF uploaded successfully', { blobId });
    trackMetric('walrus_elf_upload_success', 1, { blob_id: blobId });
    return blobId;
  }

  /**
   * Upload any blob to Walrus storage
   */
  private async uploadBlob(data: Uint8Array | Buffer | string, blobType: string): Promise<string> {
    const url = `${this.config.publisherUrl}/v1/blobs?epochs=${this.config.epochs}`;

    logger.debug('Uploading to Walrus', { url, blobType });

    // Convert data to Uint8Array if needed
    let bodyData: Uint8Array;
    if (typeof data === 'string') {
      bodyData = new TextEncoder().encode(data);
    } else if (Buffer.isBuffer(data)) {
      bodyData = new Uint8Array(data);
    } else {
      bodyData = data;
    }

    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/octet-stream',
          },
          body: bodyData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          trackMetric('walrus_upload_failed', 1, {
            status: response.status.toString(),
            error: errorText,
            blob_type: blobType,
            attempt: attempt.toString(),
          });

          if (attempt === maxAttempts) {
            throw new Error(`Walrus upload failed with status ${response.status}: ${errorText}`);
          }

          logger.warn('Walrus upload failed, retrying', {
            blobType,
            attempt,
            status: response.status,
          });
          await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
          continue;
        }

        const uploadResponse = await response.json() as WalrusUploadResponse;

        // Extract blob ID from response
        let blobId: string;
        if (uploadResponse.newlyCreated) {
          blobId = uploadResponse.newlyCreated.blobObject.blobId;
        } else if (uploadResponse.alreadyCertified) {
          blobId = uploadResponse.alreadyCertified.blobId;
        } else {
          throw new Error('No blob ID found in Walrus response');
        }

        return blobId;
      } catch (error: any) {
        if (attempt === maxAttempts) {
          trackMetric('walrus_upload_error', 1, {
            error: error.message,
            blob_type: blobType,
          });
          logger.error('Failed to upload to Walrus after retries', { blobType, error });
          throw new Error(`Failed to upload to Walrus: ${error.message}`);
        }

        logger.warn('Walrus upload encountered error, retrying', {
          blobType,
          attempt,
          error: error instanceof Error ? error.message : error,
        });
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }

    throw new Error('Walrus upload failed after retries');
  }

  /**
   * Download blob from Walrus storage
   */
  async downloadBlob(blobId: string): Promise<Uint8Array> {
    logger.info('Downloading Walrus blob', { blobId });
    trackMetric('walrus_download_started', 1, { blob_id: blobId });

    const url = `${this.config.aggregatorUrl}/v1/blobs/${blobId}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        trackMetric('walrus_download_failed', 1, {
          status: response.status.toString(),
          blob_id: blobId
        });
        throw new Error(`Walrus download failed with status ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);

      logger.info('Downloaded Walrus blob', { blobId, size: data.length });
      trackMetric('walrus_download_success', 1, {
        blob_id: blobId,
        size: data.length.toString()
      });

      return data;
    } catch (error: any) {
      trackMetric('walrus_download_error', 1, {
        error: error.message,
        blob_id: blobId
      });
      logger.error('Failed to download Walrus blob', { blobId, error });
      throw new Error(`Failed to download from Walrus: ${error.message}`);
    }
  }

  /**
   * Check if a blob exists in Walrus storage
   */
  async blobExists(blobId: string): Promise<boolean> {
    const url = `${this.config.aggregatorUrl}/v1/blobs/${blobId}`;

    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create ConnectSphere proof metadata
   */
  createProofMetadata(
    proofBlobId: string,
    elfBlobId: string,
    domain: string,
    clerkUserId: string
  ): ConnectSphereProofMetadata {
    return {
      proofBlobId,
      elfBlobId,
      domain,
      clerkUserId,
      uploadedAt: new Date().toISOString(),
      verificationStatus: 'uploaded',
    };
  }
}

// Default Walrus client instance for ConnectSphere
export const walrusClient = new WalrusClient();
