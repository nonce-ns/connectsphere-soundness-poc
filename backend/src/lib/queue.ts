if (process.env.SUI_NETWORK !== "testnet") throw "TESTNET ONLY";

import Redis from 'ioredis';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { sp1ProofService } from '../services/sp1';
import { walrusClient } from '../services/walrus';
import { trackMetric } from '../utils/metrics';
import { logger } from '../utils/logger';
import { VerificationSessionManager } from './verification-session';
import { UserQuotaManager } from './user-quota';

// Redis connection for simple lock mechanism
const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Active job tracking (single proof at a time)
let activeJob: {
  jobId: string;
  userId: string;
  startTime: number;
  progress: number;
} | null = null;

// Simple lock key for ensuring single processing
const PROCESSING_LOCK_KEY = 'connectsphere:proof_processing_lock';
const LOCK_TIMEOUT = 60 * 60 * 3; // 3 hours in seconds

const buildVerificationLink = (sessionId: string) => {
  const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${baseUrl}/verify/${sessionId}`;
};

const supabaseClient: SupabaseClient | null = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

// Queue-based proof generation system
export class ProofProcessor {
  private static processorLoop: Promise<void> | null = null;
  private static sessionIdCache: Map<string, string> = new Map();

  static {
    if (process.env.NODE_ENV !== 'test') {
      // Start the queue processor as soon as the module loads so pending jobs run after restarts
      this.startQueueProcessor().catch(error => {
        logger.error('Queue processor initialization failed', { error });
      });
    }
  }

  /**
   * Add job to queue and return unique verification link
   */
  static async addToQueue(data: {
    clerkUserId: string;
    sessionId: string;
    jwtToken: string;
    suiAddress: string;
    userEmail?: string;
  }) {
    const { clerkUserId, sessionId, jwtToken, suiAddress, userEmail } = data;
    const derivedDomain = userEmail?.split('@')[1]?.trim().toLowerCase();
    const expectedDomain = derivedDomain || process.env.DEFAULT_EMAIL_DOMAIN || 'gmail.com';

    // Create unique job ID
    const jobId = `proof_${Date.now()}_${clerkUserId}`;

    // Store job data in Redis
    const jobData = {
      id: jobId,
      clerkUserId,
      sessionId,
      jwtToken,
      suiAddress,
      userEmail,
      status: 'queued',
      createdAt: new Date().toISOString(),
      progress: 0,
    };

    // Store job with 24 hour expiration
    await redisClient.setex(`job:${jobId}`, 24 * 60 * 60, JSON.stringify(jobData));

    // Add to queue
    await redisClient.rpush('proof_queue', jobId);

    // Start processing if not already running
    this.startQueueProcessor().catch(err => {
      logger.error('Queue processor failed to start', { error: err });
    });

    logger.info('Job added to queue', { userId: clerkUserId, jobId });
    trackMetric('job_added_to_queue', 1, { user: clerkUserId });

    await UserQuotaManager.registerRequest(clerkUserId, sessionId);

    const queueLength = await UserQuotaManager.getQueueLength();
    const queuePosition = await UserQuotaManager.getQueuePosition(jobId);

    const humanQueuePosition = queuePosition !== null ? queuePosition + 1 : null;

    await this.recordSessionQueued({
      sessionId,
      sessionKey: sessionId,
      clerkUserId,
      suiAddress,
      emailDomain: expectedDomain,
      jobId,
      queuePosition: humanQueuePosition,
      queueLength
    });

    await this.recordEvent(sessionId, 'queued', {
      job_id: jobId,
      queue_position: humanQueuePosition,
      queue_length: queueLength
    });

    return {
      success: true,
      message: 'Job added to queue successfully',
      session_id: sessionId,
      verification_link: buildVerificationLink(sessionId),
      job_id: jobId,
      queue_position: humanQueuePosition,
      queue_length: queueLength,
      status: 'queued',
    };
  }

  /**
   * Process a proof generation job from queue
   */
  static async processProof(data: {
    clerkUserId: string;
    sessionId: string;
    jwtToken: string;
    suiAddress: string;
    userEmail?: string;
    jobId?: string;
  }) {
    const { clerkUserId, sessionId, jwtToken, suiAddress, userEmail } = data;
    const derivedDomain = userEmail?.split('@')[1]?.trim().toLowerCase();
    const expectedDomain = derivedDomain || process.env.DEFAULT_EMAIL_DOMAIN || 'gmail.com';

    // Try to acquire processing lock
    const lockAcquired = await this.acquireProcessingLock(clerkUserId);
    if (!lockAcquired) {
      throw new Error('Another proof generation is currently in progress. Please wait.');
    }

    const jobId = data.jobId ?? `proof_${Date.now()}_${clerkUserId}`;

    try {
      // Mark job as active
      activeJob = {
        jobId,
        userId: clerkUserId,
        startTime: Date.now(),
        progress: 0,
      };

      logger.info('Starting SP1 proof generation', { userId: clerkUserId, jobId });
      trackMetric('sp1_proof_generation_started', 1, { user: clerkUserId });

      // Update job progress - Session validation
      await this.updateProgress(jobId, 10);
      activeJob.progress = 10;
      await new Promise(resolve => setTimeout(resolve, 1000));

      await VerificationSessionManager.updateSession(sessionId, {
        status: 'processing',
        jobId,
        updatedAt: new Date().toISOString(),
      } as any);

      const proofStartedAt = new Date().toISOString();
      await this.updateSessionRecord(sessionId, {
        status: 'processing',
        job_id: jobId,
        proof_started_at: proofStartedAt,
      });

      await this.recordEvent(sessionId, 'processing_started', {
        job_id: jobId,
        started_at: proofStartedAt,
      });

      // Real SP1 proof generation
      await this.updateProgress(jobId, 20);
      activeJob.progress = 20;

      logger.debug('Invoking SP1 binary', { userId: clerkUserId, jobId });

      let result;
      let proofData: Buffer | null = null;
      let elfData: Buffer | null = null;

      try {
        // Try real SP1 proof generation
        const sp1Response = await sp1ProofService.generateProof({
          jwtToken: jwtToken, // Use original JWT token directly
          expectedDomain,
          clerkUserId: clerkUserId,
          userEmail,
          suiAddress: data.suiAddress, // NEW: Pass wallet address
        });

        if (!sp1Response.success) {
          throw new Error(`SP1 proof generation failed: ${sp1Response.error}`);
        }

        if (!sp1Response.proof_file_path || !sp1Response.elf_file_path) {
          throw new Error('SP1 proof generation succeeded but no files returned');
        }

        if (!sp1Response.verification_results?.verification_success) {
          throw new Error('SP1 verification reported failure for generated proof');
        }

        // Progress update - SP1 generation complete
        await this.updateProgress(jobId, 60);
        activeJob.progress = 60;

        logger.info('SP1 proof generation successful', {
          userId: clerkUserId,
          jobId,
          verificationSuccess: sp1Response.verification_results?.verification_success,
        });

        // Read the generated proof and ELF files
        proofData = await sp1ProofService.readProofFile(sp1Response.proof_file_path);
        elfData = await sp1ProofService.readElfFile(sp1Response.elf_file_path);

        // Progress update - Starting Walrus upload
        await this.updateProgress(jobId, 80);
        activeJob.progress = 80;

        logger.info('Uploading SP1 artifacts to Walrus', { userId: clerkUserId, jobId });

        // Upload proof and ELF to Walrus storage
        trackMetric('walrus_upload_started', 1);

        const proofBlobId = await walrusClient.uploadProofFile(proofData);
        const elfBlobId = await walrusClient.uploadElfFile(elfData);

        trackMetric('walrus_upload_success', 1, {
          proof_blob_id: proofBlobId,
          elf_blob_id: elfBlobId
        });

        // Create result with real verification data
        result = {
          blob_id: proofBlobId,
          elf_blob_id: elfBlobId,
          cli_command: `soundness-cli send \\\\
  --proof-file ${proofBlobId} \\\\
  --elf-file ${elfBlobId} \\\\
  --key-name YourKeyName \\\\
  --proving-system sp1`,
          verification_link: buildVerificationLink(sessionId),
          session_id: sessionId,
          metadata: {
            domain: sp1Response.verification_results?.domain || expectedDomain,
            clerkUserId,
            uploadedAt: new Date().toISOString(),
            verificationStatus: 'uploaded',
            sp1Results: sp1Response.verification_results,
          },
          sp1_verification: sp1Response.verification_results,
        };

        result.cli_command = [
          'soundness-cli send',
          `--proof-file ${proofBlobId}`,
          `--elf-file ${elfBlobId}`,
          '--key-name YourKeyName',
          '--proving-system sp1',
        ].join(' ');

      } catch (sp1Error) {
        // SP1 failed - throw error instead of fallback
        logger.error('SP1 proof generation failed', {
          userId: clerkUserId,
          jobId,
          error: sp1Error instanceof Error ? sp1Error.message : sp1Error,
        });

        trackMetric('sp1_proof_generation_failed', 1, {
          user: clerkUserId,
          error: sp1Error instanceof Error ? sp1Error.message : 'unknown'
        });

        throw new Error(`SP1 proof generation failed: ${sp1Error instanceof Error ? sp1Error.message : 'Unknown error'}`);
      }

      // Progress update - Complete
      await this.updateProgress(jobId, 100);
      activeJob.progress = 100;

      // Store result in Redis with 1 hour expiration
      await redisClient.setex(`proof_result:${jobId}`, 3600, JSON.stringify(result));

      trackMetric('sp1_proof_generation_success', 1, {
        user: clerkUserId,
        domain: result.sp1_verification?.domain || expectedDomain,
        verification_success: 'true'
      });
      logger.info('SP1 proof pipeline completed', {
        userId: clerkUserId,
        jobId,
        proofBlobId: result.blob_id,
        elfBlobId: result.elf_blob_id,
      });

      await this.updateSessionRecord(sessionId, {
        status: 'proof_ready',
        job_id: jobId,
        proof_completed_at: new Date().toISOString(),
      });

      await this.upsertProofArtifactsRecord(sessionId, {
        proofBlobId: result.blob_id,
        elfBlobId: result.elf_blob_id,
        cliCommand: result.cli_command,
        proofSize: proofData?.length,
        elfSize: elfData?.length,
      });

      await this.recordEvent(sessionId, 'proof_ready', {
        proof_blob_id: result.blob_id,
        elf_blob_id: result.elf_blob_id,
        cli_command: result.cli_command,
      });

      return result;
    } catch (error) {
      logger.error('Proof generation failed', {
        userId: clerkUserId,
        jobId,
        error,
      });

      trackMetric('sp1_proof_generation_error', 1, {
        user: clerkUserId,
        error: error instanceof Error ? error.message : 'unknown'
      });

      await VerificationSessionManager.updateSession(sessionId, {
        status: 'failed' as any,
        error: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);

      await this.updateSessionRecord(sessionId, {
        status: 'failed',
        failure_reason: error instanceof Error ? error.message : 'Unknown error',
      });

      await this.recordEvent(sessionId, 'proof_failed', {
        error: error instanceof Error ? error.message : error,
      });

      throw error;
    } finally {
      // Clear the processing lock and active job
      await this.releaseProcessingLock();
      activeJob = null;
    }
  }

  /**
   * Acquire processing lock to ensure single proof processing
   */
  private static async acquireProcessingLock(userId: string): Promise<boolean> {
    // Use Redis SET command with NX (not exist) and EX (expire) options
    const result = await (redisClient as unknown as {
      set: (...args: unknown[]) => Promise<'OK' | null>;
    }).set(
      PROCESSING_LOCK_KEY,
      `${userId}:${Date.now()}`,
      'NX',
      'EX',
      LOCK_TIMEOUT
    );

    return result === 'OK';
  }

  /**
   * Release the processing lock
   */
  private static async releaseProcessingLock(): Promise<void> {
    await redisClient.del(PROCESSING_LOCK_KEY);
  }

  /**
   * Check if processing lock is active
   */
  static async isProcessing(): Promise<boolean> {
    const lockValue = await redisClient.get(PROCESSING_LOCK_KEY);
    return lockValue !== null;
  }

  /**
   * Start queue processor (runs continuously)
   */
  private static async startQueueProcessor() {
    if (this.processorLoop) {
      return this.processorLoop;
    }

    const loop = async () => {
      logger.info('Queue processor started');

      while (true) {
        try {
          const jobItem = await redisClient.blpop('proof_queue', 10);

          if (jobItem) {
            const [_, job_id] = jobItem;
            await this.processJobFromQueue(job_id);
          } // 10 second timeout
        } catch (error) {
          logger.error('Queue processor error', { error });
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds on error
        }
      }
    };

    this.processorLoop = loop().catch(error => {
      logger.error('Queue processor stopped unexpectedly', { error });
      this.processorLoop = null;
      throw error;
    });

    return this.processorLoop;
  }

  /**
   * Process a job from queue
   */
  private static async processJobFromQueue(jobId: string) {
    let jobData: any = null;
    let clerkUserId: string = '';

    try {
      // Get job data
      const jobDataStr = await redisClient.get(`job:${jobId}`);
      if (!jobDataStr) {
        logger.warn('Job data not found', { jobId });
        return;
      }

      jobData = JSON.parse(jobDataStr);
      clerkUserId = jobData.clerkUserId;

      // Update job status to processing
      jobData.status = 'processing';
      jobData.progress = 10;
      await redisClient.setex(`job:${jobId}`, 24 * 60 * 60, JSON.stringify(jobData));

      // Process the proof
      const result = await this.processProof({
        clerkUserId: jobData.clerkUserId,
        sessionId: jobData.sessionId,
        jwtToken: jobData.jwtToken,
        suiAddress: jobData.suiAddress,
        userEmail: jobData.userEmail,
        jobId: jobId,
      });

      // Store result and update job status
      jobData.status = 'completed';
      jobData.progress = 100;
      jobData.result = result;
      jobData.completedAt = new Date().toISOString();
      await redisClient.setex(`job:${jobId}`, 24 * 60 * 60, JSON.stringify(jobData));

      // Store result separately for easy retrieval
      await redisClient.setex(`proof_result:${jobId}`, 24 * 60 * 60, JSON.stringify(result));

      await VerificationSessionManager.updateSession(jobData.sessionId, {
        status: 'completed' as any,
        result,
        completedAt: jobData.completedAt,
        updatedAt: jobData.completedAt,
      } as any);

      logger.info('Job completed successfully', { userId: jobData.clerkUserId, jobId });
      trackMetric('job_completed', 1, { user: jobData.clerkUserId });

    } catch (error) {
      logger.error('Job processing failed', { jobId, error });

      // Update job status to failed
      if (jobData) {
        jobData.status = 'failed';
        jobData.error = error instanceof Error ? error.message : 'Unknown error';
        jobData.failedAt = new Date().toISOString();
        await redisClient.setex(`job:${jobId}`, 24 * 60 * 60, JSON.stringify(jobData));

        await redisClient.del(`proof_result:${jobId}`);

        await VerificationSessionManager.updateSession(jobData.sessionId, {
          status: 'failed' as any,
          error: jobData.error,
          completedAt: jobData.failedAt,
          updatedAt: jobData.failedAt,
        } as any);
      }

      trackMetric('job_failed', 1, { user: clerkUserId || 'unknown', error: error instanceof Error ? error.message : 'unknown' });
    }
  }

  /**
   * Get job status
   */
  static async getJobStatus(jobId: string) {
    const jobDataStr = await redisClient.get(`job:${jobId}`);
    if (!jobDataStr) {
      return { error: 'Job not found' };
    }

    const jobData = JSON.parse(jobDataStr);
    return {
      success: true,
      job: jobData,
    };
  }

  /**
   * Get job result
   */
  static async getJobResult(jobId: string) {
    const resultStr = await redisClient.get(`proof_result:${jobId}`);
    if (!resultStr) {
      return { error: 'Result not found' };
    }

    const result = JSON.parse(resultStr);
    return {
      success: true,
      result: result,
    };
  }

  /**
   * Get current processing status
   */
  static getProcessingStatus() {
    return {
      activeJob,
      isProcessing: activeJob !== null,
    };
  }

  /**
   * Update progress of active job
   */
  private static async updateProgress(jobId: string, progress: number): Promise<void> {
    // In this simplified version, we just update the activeJob object
    // In a more complex system, we might want to store this in Redis or database
    if (activeJob && activeJob.jobId === jobId) {
      activeJob.progress = progress;
    }
  }

  private static async recordSessionQueued(args: {
    sessionId: string;
    sessionKey: string;
    clerkUserId: string;
    suiAddress: string;
    emailDomain: string;
    jobId: string;
    queuePosition: number | null;
    queueLength: number;
  }): Promise<void> {
    if (!supabaseClient) return;

    const sessionKey = args.sessionKey || args.sessionId;
    const payload: Record<string, unknown> = {
      session_key: sessionKey,
      clerk_user_id: args.clerkUserId,
      sui_address: args.suiAddress,
      email_domain: args.emailDomain,
      status: 'queued',
      job_id: args.jobId,
    };

    try {
      const { data, error } = await supabaseClient
        .from('verification_sessions')
        .upsert(payload, { onConflict: 'session_key' })
        .select('id')
        .maybeSingle();

      if (error) {
        throw error;
      }

      const sessionUuid = data?.id;
      if (sessionUuid) {
        this.sessionIdCache.set(sessionKey, sessionUuid);
      }
    } catch (error) {
      logger.warn('Supabase recordSessionQueued failed', {
        sessionKey,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  private static async updateSessionRecord(sessionKey: string, updates: Record<string, unknown>): Promise<void> {
    if (!supabaseClient) return;
    if (!updates || Object.keys(updates).length === 0) return;

    try {
      const { error, data } = await supabaseClient
        .from('verification_sessions')
        .update(updates)
        .eq('session_key', sessionKey)
        .select('id')
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data?.id) {
        this.sessionIdCache.set(sessionKey, data.id);
      }
    } catch (error) {
      logger.warn('Supabase updateSessionRecord failed', {
        sessionKey,
        updates,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  private static async recordEvent(sessionKey: string, eventType: string, payload?: Record<string, unknown>): Promise<void> {
    if (!supabaseClient) return;

    try {
      const sessionUuid = await this.getSupabaseSessionId(sessionKey);
      if (!sessionUuid) {
        return;
      }

      const insertPayload = {
        session_id: sessionUuid,
        event_type: eventType,
        event_payload: payload ?? {},
      };

      const { error } = await supabaseClient
        .from('verification_events')
        .insert(insertPayload);

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.warn('Supabase recordEvent failed', {
        sessionKey,
        eventType,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  private static async upsertProofArtifactsRecord(
    sessionKey: string,
    args: {
      proofBlobId: string;
      elfBlobId: string;
      cliCommand: string;
      proofSize?: number;
      elfSize?: number;
    }
  ): Promise<void> {
    if (!supabaseClient) return;

    try {
      const sessionUuid = await this.getSupabaseSessionId(sessionKey);
      if (!sessionUuid) {
        return;
      }

      const payload: Record<string, unknown> = {
        session_id: sessionUuid,
        walrus_proof_id: args.proofBlobId,
        walrus_elf_id: args.elfBlobId,
        cli_command: args.cliCommand,
      };

      if (typeof args.proofSize === 'number') {
        payload.proof_size_bytes = args.proofSize;
      }

      if (typeof args.elfSize === 'number') {
        payload.elf_size_bytes = args.elfSize;
      }

      const { error } = await supabaseClient
        .from('proof_artifacts')
        .upsert(payload, { onConflict: 'session_id' });

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.warn('Supabase upsertProofArtifactsRecord failed', {
        sessionKey,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  private static async getSupabaseSessionId(sessionKey: string): Promise<string | null> {
    if (!supabaseClient) return null;

    if (this.sessionIdCache.has(sessionKey)) {
      return this.sessionIdCache.get(sessionKey) || null;
    }

    try {
      const { data, error } = await supabaseClient
        .from('verification_sessions')
        .select('id')
        .eq('session_key', sessionKey)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data?.id) {
        this.sessionIdCache.set(sessionKey, data.id);
        return data.id;
      }
    } catch (error) {
      logger.warn('Supabase getSupabaseSessionId failed', {
        sessionKey,
        error: error instanceof Error ? error.message : error,
      });
    }

    return null;
  }
}

// Initialize processor
logger.info('Simplified proof generation processor initialized');
