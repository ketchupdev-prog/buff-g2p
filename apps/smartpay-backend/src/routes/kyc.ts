/**
 * KYC API – Customer Due Diligence (CDD) per Namibia FIA/FIC.
 * GET status, POST submit identification for tier upgrade.
 * POST upload-documents – upload KYC documents and transition to documents-pending state.
 * Location: backend/src/routes/kyc.ts
 */
import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth';
import { lenientRateLimiter } from '../middleware/rateLimiter';
import { pool } from '../lib/db';
import { ensureUser } from '../lib/ensureUser';
import { validateKycSubmission } from '../middleware/zodValidation';
import multer from 'multer';
import crypto from 'crypto';
import FormData from 'form-data';
import axios from 'axios';

const router = Router();

const KYC_DOCUMENT_REQUIRED_DOCS = [
  'id_document_front',
  'proof_of_residence',
  'selfie_video',
] as const;

type KycDocField =
  | 'id_document_front'
  | 'id_document_back'
  | 'proof_of_residence'
  | 'selfie_video'
  | 'business_certificate';

const REQUIRED_MIME_BY_FIELD: Partial<Record<KycDocField, string[]>> = {
  id_document_front: ['image/jpeg', 'image/png', 'application/pdf'],
  id_document_back: ['image/jpeg', 'image/png', 'application/pdf'],
  proof_of_residence: ['image/jpeg', 'image/png', 'application/pdf'],
  selfie_video: ['video/mp4', 'video/webm', 'video/avi', 'video/quicktime'],
  business_certificate: ['image/jpeg', 'image/png', 'application/pdf'],
};

// Keep limits strict to reduce abuse + request size variance (and keep payloads manageable).
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_PDF_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_VIDEO_BYTES = 25 * 1024 * 1024; // 25MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO_BYTES },
});

let didEnsureKycDocumentsTable = false;
async function ensureKycDocumentsTable() {
  if (didEnsureKycDocumentsTable) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS kyc_documents (
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL,
      kyc_submission_id uuid NOT NULL,
      doc_type text NOT NULL,
      mime_type text NOT NULL,
      file_name text,
      file_size_bytes bigint NOT NULL,
      sha256 text NOT NULL,
      content bytea NOT NULL,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      UNIQUE (kyc_submission_id, doc_type)
    )
  `);
  didEnsureKycDocumentsTable = true;
}

let didEnsureKycSubmissionsTable = false;
async function ensureKycSubmissionsTable() {
  if (didEnsureKycSubmissionsTable) return;
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE TABLE IF NOT EXISTS kyc_submissions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL,
      full_name text NOT NULL,
      id_number text NOT NULL,
      id_type text NOT NULL,
      date_of_birth date NOT NULL,
      address text,
      status text NOT NULL,
      notes text,
      submitted_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    );
  `);
  // Backfill missing column without failing on existing deployments.
  await pool.query(`
    ALTER TABLE kyc_submissions
    ADD COLUMN IF NOT EXISTS notes text;
  `);
  await pool.query(`
    ALTER TABLE kyc_submissions
    ALTER COLUMN id SET DEFAULT gen_random_uuid();
  `);
  await pool.query(`
    ALTER TABLE kyc_submissions
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW();
  `);

  // Update status CHECK constraint to include liveness stage statuses.
  // Existing deployments may still restrict statuses to the legacy set.
  await pool.query(`
    ALTER TABLE kyc_submissions
    DROP CONSTRAINT IF EXISTS kyc_submissions_status_check;
  `);
  await pool.query(`
    ALTER TABLE kyc_submissions
    ADD CONSTRAINT kyc_submissions_status_check
    CHECK (status = ANY (ARRAY[
      'pending'::text,
      'pending_documents'::text,
      'liveness_failed'::text,
      'verified'::text,
      'rejected'::text
    ]));
  `);
  didEnsureKycSubmissionsTable = true;
}

/** GET /api/v1/kyc/status – KYC tier, verified flag, and pending submission if any */
router.get(
  '/kyc/status',
  requireAuth,
  lenientRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const userEmail = req.userEmail;
    try {
      await ensureUser(userId, userEmail);
      await ensureKycSubmissionsTable();
      const userRes = await pool.query(
        `SELECT kyc_tier, kyc_verified FROM users WHERE id = $1::uuid`,
        [userId]
      );
      if (userRes.rowCount === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found.' },
        });
      }
      const user = userRes.rows[0] as { kyc_tier: string; kyc_verified: boolean };
      const subRes = await pool.query(
        `SELECT id, status, submitted_at FROM kyc_submissions WHERE user_id = $1::uuid ORDER BY submitted_at DESC LIMIT 1`,
        [userId]
      );
      const latest = subRes.rows[0] as { id: string; status: string; submitted_at: Date } | undefined;
      const latestStatus = latest?.status ?? '';
      return res.status(200).json({
        success: true,
        data: {
          kycTier: user.kyc_tier,
          kycVerified: user.kyc_verified,
          pendingSubmission: (latestStatus === 'pending' || latestStatus === 'pending_documents') || false,
          lastSubmission: latest
            ? { id: latest.id, status: latest.status, submittedAt: latest.submitted_at }
            : null,
        },
      });
    } catch (err) {
      console.error('[KYC status]', err);
      return res.status(500).json({
        success: false,
        error: { code: 'FETCH_FAILED', message: err instanceof Error ? err.message : 'Unknown error' },
      });
    }
  }
);

export interface KycSubmitBody {
  fullName: string;
  idNumber: string;
  idType: 'national_id' | 'passport';
  dateOfBirth: string; // YYYY-MM-DD
  address?: string;
}

/** POST /api/v1/kyc/submit – Submit CDD information (FIC Guidance Note No 3 of 2015) */
router.post(
  '/kyc/submit',
  requireAuth,
  lenientRateLimiter,
  validateKycSubmission,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const body = req.body as KycSubmitBody;
    const { fullName, idNumber, idType, dateOfBirth, address } = body || {};
    if (!fullName?.trim() || !idNumber?.trim() || !idType || !dateOfBirth?.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'fullName, idNumber, idType, and dateOfBirth are required.',
        },
      });
    }
    if (idType !== 'national_id' && idType !== 'passport') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID_TYPE', message: 'idType must be national_id or passport.' },
      });
    }
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_DATE', message: 'dateOfBirth must be YYYY-MM-DD.' },
      });
    }
    try {
      await ensureUser(userId, req.userEmail);
      await ensureKycSubmissionsTable();
      await pool.query(
        `INSERT INTO kyc_submissions (user_id, full_name, id_number, id_type, date_of_birth, address, status)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, 'pending')`,
        [userId, fullName.trim(), idNumber.trim(), idType, dateOfBirth, address?.trim() || null]
      );
      await pool.query(
        `UPDATE users SET kyc_tier = 'standard', updated_at = NOW() WHERE id = $1::uuid`,
        [userId]
      );
      return res.status(200).json({
        success: true,
        data: {
          message: 'KYC information submitted successfully. Your account will be reviewed for higher limits.',
          kycTier: 'standard',
          kycVerified: false,
        },
      });
    } catch (err) {
      console.error('[KYC submit]', err);
      return res.status(500).json({
        success: false,
        error: { code: 'SUBMIT_FAILED', message: err instanceof Error ? err.message : 'Unknown error' },
      });
    }
  }
);

/**
 * POST /api/v1/kyc/upload-documents
 * Upload multipart KYC documents and transition the latest submission to a documents-pending state.
 *
 * Request content-type: multipart/form-data
 * Auth: Bearer token (requireAuth middleware)
 *
 * Request fields:
 * - kyc_id: string (UUID) - the KYC submission id to attach uploads to
 * - id_document_front: file (required) - image/jpeg|image/png|application/pdf
 * - id_document_back: file (optional) - image/jpeg|image/png|application/pdf
 * - proof_of_residence: file (required) - image/jpeg|image/png|application/pdf
 * - selfie_video: file (required) - video/mp4|video/webm|video/avi
 * - business_certificate: file (optional) - image/jpeg|image/png|application/pdf
 *
 * Response shape:
 * { success: true, data: { message: string } }
 */
router.post(
  '/kyc/upload-documents',
  requireAuth,
  lenientRateLimiter,
  upload.fields([
    { name: 'id_document_front', maxCount: 1 },
    { name: 'id_document_back', maxCount: 1 },
    { name: 'proof_of_residence', maxCount: 1 },
    { name: 'selfie_video', maxCount: 1 },
    { name: 'business_certificate', maxCount: 1 },
  ]),
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const userEmail = req.userEmail;
    try {
      await ensureUser(userId, userEmail);
      await ensureKycDocumentsTable();
      await ensureKycSubmissionsTable();

      const body = req.body as Record<string, unknown>;
      const kycIdRaw = body.kyc_id;
      const kycId = typeof kycIdRaw === 'string' ? kycIdRaw : Array.isArray(kycIdRaw) ? kycIdRaw[0] : null;
      if (!kycId) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Missing required field: kyc_id' },
        });
      }

      const submissionRes = await pool.query(
        `SELECT id, status FROM kyc_submissions WHERE id = $1::uuid AND user_id = $2::uuid LIMIT 1`,
        [kycId, userId]
      );
      if (submissionRes.rowCount === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'KYC_NOT_FOUND', message: 'KYC submission not found.' },
        });
      }

      const submission = submissionRes.rows[0] as { id: string; status: string };
      // Prevent overwriting uploads on already advanced submissions.
      if (submission.status !== 'pending' && submission.status !== 'liveness_failed') {
        return res.status(409).json({
          success: false,
          error: { code: 'KYC_STAGE_INVALID', message: `Cannot upload documents while status is '${submission.status}'.` },
        });
      }

      const files = req.files as Partial<Record<KycDocField, Express.Multer.File[]>> | undefined;

      for (const requiredField of KYC_DOCUMENT_REQUIRED_DOCS) {
        const uploaded = files?.[requiredField]?.[0];
        if (!uploaded) {
          return res.status(400).json({
            success: false,
            error: { code: 'MISSING_DOCUMENT', message: `Missing required file: ${requiredField}` },
          });
        }
      }

      const validateFile = (field: KycDocField, file: Express.Multer.File) => {
        const allowedMimes = REQUIRED_MIME_BY_FIELD[field] ?? [];
        if (!allowedMimes.includes(file.mimetype)) {
          return { ok: false, message: `Invalid mime type for ${field}.` };
        }

        const isPdf = file.mimetype === 'application/pdf';
        const isVideo = field === 'selfie_video';
        const maxBytes = isVideo ? MAX_VIDEO_BYTES : isPdf ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
        if (file.size > maxBytes) {
          return { ok: false, message: `File too large for ${field}.` };
        }

        return { ok: true as const };
      };

      const now = new Date();
      const docInserts: Array<{
        doc_type: string;
        mime_type: string;
        file_name: string | null;
        file_size_bytes: number;
        sha256: string;
        content: Buffer;
      }> = [];

      const fieldsToProcess: KycDocField[] = [
        'id_document_front',
        'id_document_back',
        'proof_of_residence',
        'selfie_video',
        'business_certificate',
      ];

      for (const field of fieldsToProcess) {
        const file = files?.[field]?.[0];
        if (!file) continue;

        const validation = validateFile(field, file);
        if (!validation.ok) {
          return res.status(400).json({
            success: false,
            error: { code: 'INVALID_DOCUMENT', message: validation.message },
          });
        }

        if (!file.buffer || file.buffer.length === 0) {
          return res.status(400).json({
            success: false,
            error: { code: 'INVALID_DOCUMENT', message: `Empty upload for ${field}.` },
          });
        }

        const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');
        docInserts.push({
          doc_type: field,
          mime_type: file.mimetype,
          file_name: file.originalname ?? null,
          file_size_bytes: file.size,
          sha256,
          content: file.buffer,
        });
      }

      if (docInserts.length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_DOCUMENT', message: 'No valid documents received.' },
        });
      }

      const getLivenessFromService = async (selfieVideoFile: Express.Multer.File) => {
        const baseUrl = process.env.KETCHUP_LIVENESS_SERVICE_URL || 'http://localhost:8002';
        const url = `${baseUrl.replace(/\/$/, '')}/api/v1/liveness/video`;

        const form = new FormData();
        form.append('video_file', selfieVideoFile.buffer, {
          filename: selfieVideoFile.originalname || 'selfie_video.mp4',
          contentType: selfieVideoFile.mimetype,
          knownLength: selfieVideoFile.size,
        });
        form.append('beneficiary_id', userId);
        form.append('device_id', '');

        try {
          const resp = await axios.post(url, form as any, {
            headers: form.getHeaders(),
            timeout: 45_000,
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
            // Response shape expected from recognition service:
            // { success: boolean, data?: { is_live, confidence, ... } , error?: string }
          });

          const json = resp.data as any;
          if (!json?.success) {
            return {
              isLive: false,
              confidence: 0,
              error: json?.error || 'Liveness rejected',
            };
          }

          const data = json.data as { is_live: boolean; confidence?: number };
          return {
            isLive: Boolean(data?.is_live),
            confidence: typeof data?.confidence === 'number' ? data.confidence : 0.5,
          };
        } catch (e: any) {
          const status = e?.response?.status;
          const message = e?.response?.data?.error || e?.message || 'Liveness call failed';
          return { isLive: false, confidence: 0, error: `Liveness service error${status ? ` (status=${status})` : ''}: ${message}` };
        }
      };

      // Persist uploads atomically with a submission stage transition.
      await pool.query('BEGIN');
      try {
        for (const doc of docInserts) {
          const documentId = crypto.randomUUID();
          await pool.query(
            `INSERT INTO kyc_documents
              (id, user_id, kyc_submission_id, doc_type, mime_type, file_name, file_size_bytes, sha256, content, created_at, updated_at)
             VALUES
              ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (kyc_submission_id, doc_type)
             DO UPDATE SET
               mime_type = EXCLUDED.mime_type,
               file_name = EXCLUDED.file_name,
               file_size_bytes = EXCLUDED.file_size_bytes,
               sha256 = EXCLUDED.sha256,
               content = EXCLUDED.content,
               updated_at = EXCLUDED.updated_at`,
            [
              documentId,
              userId,
              kycId,
              doc.doc_type,
              doc.mime_type,
              doc.file_name,
              doc.file_size_bytes,
              doc.sha256,
              doc.content,
              now,
              now,
            ]
          );
        }

        const selfieVideoFile = files?.['selfie_video']?.[0];
        if (!selfieVideoFile) {
          throw new Error('selfie_video is required but missing');
        }

        const liveness = await getLivenessFromService(selfieVideoFile);
        const finalStatus = liveness.isLive ? 'pending_documents' : 'liveness_failed';
        const notes = liveness.isLive
          ? JSON.stringify({ liveness: { isLive: liveness.isLive, confidence: liveness.confidence } })
          : JSON.stringify({ livenessFailed: true, liveness: { isLive: false, confidence: liveness.confidence }, error: liveness.error ?? null });

        await pool.query(
          `UPDATE kyc_submissions
           SET status = $3::text, notes = $4::text, updated_at = NOW()
           WHERE id = $1::uuid AND user_id = $2::uuid`,
          [kycId, userId, finalStatus, notes]
        );

        await pool.query('COMMIT');
      } catch (txErr) {
        await pool.query('ROLLBACK');
        throw txErr;
      }

      const latestAfter = await pool.query(
        `SELECT status FROM kyc_submissions WHERE id = $1::uuid AND user_id = $2::uuid LIMIT 1`,
        [kycId, userId]
      );
      const latestStatus = latestAfter.rows[0]?.status as string | undefined;

      if (latestStatus === 'pending_documents') {
        return res.status(200).json({
          success: true,
          data: {
            message: 'Documents uploaded successfully. Liveness passed. We are reviewing your submission.',
          },
        });
      }

      return res.status(200).json({
        success: false,
        error: {
          code: 'LIVENESS_FAILED',
          message: 'Liveness detection failed. Please try again with a new selfie video.',
        },
      });
    } catch (err) {
      console.error('[KYC upload-documents]', err);
      return res.status(500).json({
        success: false,
        error: { code: 'UPLOAD_FAILED', message: err instanceof Error ? err.message : 'Unknown error' },
      });
    }
  }
);

export default router;
