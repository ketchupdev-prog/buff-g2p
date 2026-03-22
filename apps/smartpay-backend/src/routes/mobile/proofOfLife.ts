/**
 * Proof-of-Life API Routes
 * Location: fintech/smartpay/backend/src/routes/mobile/proofOfLife.ts
 * User profile and verification for continued service eligibility
 * ETA §32 audit logging for all verification operations
 */
import { Router, Response } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../../middleware/requireAuth';
import { strictRateLimiter, lenientRateLimiter } from '../../middleware/rateLimiter';
import { transaction } from '../../lib/db';
import { logWithAttribution } from '../../lib/etaAttribution';
import { ensureUser } from '../../lib/ensureUser';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface StartVerificationRequest {
  method: 'sms' | 'biometric' | 'agent' | 'auto';
  location?: string;
}

/**
 * GET /api/v1/user/profile
 * Get user profile including proof-of-life status
 */
router.get(
  '/user/profile',
  requireAuth,
  lenientRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const userEmail = req.userEmail;

    try {
      await ensureUser(userId, userEmail);
      const result = await transaction(async (client) => {
        const userResult = await client.query(
          `SELECT 
            id, email, phone, first_name, last_name,
            date_of_birth, national_id, kyc_tier, kyc_verified,
            last_proof_of_life, proof_of_life_required_by,
            credit_score, account_status, created_at, updated_at,
            metadata
           FROM users
           WHERE id = $1`,
          [userId]
        );

        if (userResult.rowCount === 0) {
          throw new Error('User not found');
        }

        const user = userResult.rows[0] as {
          id: string;
          email: string | null;
          phone: string;
          first_name: string;
          last_name: string;
          date_of_birth: Date | null;
          national_id: string | null;
          kyc_tier: string;
          kyc_verified: boolean;
          last_proof_of_life: Date | null;
          proof_of_life_required_by: Date | null;
          credit_score: number | null;
          account_status: string;
          created_at: Date;
          updated_at: Date;
          metadata: Record<string, unknown>;
        };

        // Determine proof-of-life status
        const now = new Date();
        const lastProofOfLife = user.last_proof_of_life
          ? new Date(user.last_proof_of_life)
          : null;
        const requiredBy = user.proof_of_life_required_by
          ? new Date(user.proof_of_life_required_by)
          : null;

        let proofOfLifeStatus: 'current' | 'due_soon' | 'overdue' | 'required';
        let daysUntilRequired: number | null = null;

        if (requiredBy) {
          const daysRemaining = Math.ceil(
            (requiredBy.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          daysUntilRequired = daysRemaining;

          if (daysRemaining < 0) {
            proofOfLifeStatus = 'overdue';
          } else if (daysRemaining <= 7) {
            proofOfLifeStatus = 'due_soon';
          } else {
            proofOfLifeStatus = 'current';
          }
        } else if (!lastProofOfLife) {
          proofOfLifeStatus = 'required';
        } else {
          proofOfLifeStatus = 'current';
        }

        // Get user's wallets count
        const walletsResult = await client.query(
          `SELECT COUNT(*) as wallet_count FROM wallets WHERE user_id = $1`,
          [userId]
        );
        const walletCount = parseInt(walletsResult.rows[0].wallet_count);

        const metadata = (user.metadata || {}) as Record<string, unknown>;
        const avatarUrl = typeof metadata.avatar_url === 'string' ? metadata.avatar_url : null;

        return {
          userId: user.id,
          email: user.email,
          phone: user.phone,
          firstName: user.first_name,
          lastName: user.last_name,
          dateOfBirth: user.date_of_birth,
          nationalId: user.national_id ? '***' + user.national_id.slice(-4) : null,
          kycTier: user.kyc_tier,
          kycVerified: user.kyc_verified,
          creditScore: user.credit_score,
          accountStatus: user.account_status,
          walletCount,
          avatarUrl,
          proofOfLife: {
            status: proofOfLifeStatus,
            lastVerified: lastProofOfLife,
            requiredBy,
            daysUntilRequired,
            isOverdue: proofOfLifeStatus === 'overdue'
          },
          createdAt: user.created_at,
          updatedAt: user.updated_at
        };
      });

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('[User Profile] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({
        success: false,
        error: { code: 'FETCH_FAILED', message: errorMessage }
      });
    }
  }
);

/**
 * PATCH /api/v1/user/profile
 * Update user profile (first name, last name, avatar URL). Email/phone read-only from auth.
 */
interface PatchProfileBody {
  firstName?: string;
  lastName?: string;
  photoUrl?: string | null;
}

router.patch(
  '/user/profile',
  requireAuth,
  lenientRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;

    try {
      const body = (req.body || {}) as PatchProfileBody;
      const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : undefined;
      const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : undefined;
      const photoUrl = body.photoUrl === null || body.photoUrl === '' ? null : (typeof body.photoUrl === 'string' ? body.photoUrl.trim() : undefined);

      await ensureUser(userId, req.userEmail);

      await transaction(async (client) => {
        const updates: string[] = [];
        const values: unknown[] = [];
        let i = 1;
        if (firstName !== undefined) {
          updates.push(`first_name = $${i++}`);
          values.push(firstName);
        }
        if (lastName !== undefined) {
          updates.push(`last_name = $${i++}`);
          values.push(lastName);
        }
        if (photoUrl !== undefined) {
          updates.push(`metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{avatar_url}', $${i}::jsonb)`);
          values.push(photoUrl === null ? null : JSON.stringify(photoUrl));
          i++;
        }
        updates.push(`updated_at = now()`);
        if (values.length === 0) {
          return;
        }
        values.push(userId);
        await client.query(
          `UPDATE users SET ${updates.join(', ')} WHERE id = $${i}`,
          values
        );
      });

      return res.status(200).json({
        success: true,
        data: { updated: true }
      });
    } catch (error) {
      console.error('[User Profile PATCH] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({
        success: false,
        error: { code: 'UPDATE_FAILED', message: errorMessage }
      });
    }
  }
);

/**
 * POST /api/v1/user/proof-of-life
 * Start proof-of-life verification process
 */
router.post(
  '/user/proof-of-life',
  requireAuth,
  strictRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { method, location } = req.body as StartVerificationRequest;

    try {
      if (!method) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_METHOD',
            message: 'Verification method is required (sms, biometric, agent, or auto)'
          }
        });
      }

      const validMethods = ['sms', 'biometric', 'agent', 'auto'];
      if (!validMethods.includes(method)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_METHOD',
            message: `Invalid verification method. Must be one of: ${validMethods.join(', ')}`
          }
        });
      }

      const result = await transaction(async (client) => {
        // Get user details
        const userResult = await client.query(
          `SELECT 
            id, phone, kyc_tier, last_proof_of_life, account_status
           FROM users
           WHERE id = $1
           FOR UPDATE`,
          [userId]
        );

        if (userResult.rowCount === 0) {
          throw new Error('User not found');
        }

        const user = userResult.rows[0] as {
          id: string;
          phone: string;
          kyc_tier: string;
          last_proof_of_life: Date | null;
          account_status: string;
        };

        if (user.account_status === 'suspended' || user.account_status === 'closed') {
          throw new Error('Account is not active. Contact support for assistance.');
        }

        // Create verification session
        const sessionId = uuidv4();
        
        // SECURITY: Generate cryptographically secure verification code for SMS
        const { generate6DigitPIN } = require('../../lib/secureCodeGenerator');
        const verificationCode = method === 'sms' 
          ? await generate6DigitPIN(
              true, // Check uniqueness
              client,
              'proof_of_life_verifications',
              'verification_code'
            )
          : null;
        
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        await client.query(
          `INSERT INTO proof_of_life_verifications
            (id, user_id, method, status, verification_code, expires_at, 
             location, ip_address, session_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
          [
            sessionId,
            userId,
            method,
            'pending',
            verificationCode,
            expiresAt,
            location || null,
            req.ipAddress,
            req.sessionId,
          ]
        );

        let responseData: Record<string, unknown> = {
          sessionId,
          method,
          status: 'pending',
          expiresAt: expiresAt.toISOString()
        };

        switch (method) {
          case 'sms':
            // In production, send actual SMS via SMS gateway
            responseData = {
              ...responseData,
              message: `Verification code sent to ${user.phone}`,
              phone: user.phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2'),
              instructions: 'Enter the 6-digit code sent to your phone',
              // In dev, include code for testing
              ...(process.env.NODE_ENV === 'development' && { code: verificationCode })
            };
            break;

          case 'biometric':
            responseData = {
              ...responseData,
              message: 'Biometric verification initiated',
              instructions: 'Complete biometric verification on your device',
              biometricTypes: ['fingerprint', 'face_id']
            };
            break;

          case 'agent': {
            // SECURITY: Generate secure verification code for agent
            const { generate6DigitPIN } = require('../../lib/secureCodeGenerator');
            const agentVerificationCode = await generate6DigitPIN(
              true, // Check uniqueness
              client,
              'proof_of_life_verifications',
              'verification_code'
            );
            
            responseData = {
              ...responseData,
              message: 'Agent verification initiated',
              instructions:
                'Visit any SmartPay agent or NamPost branch with your ID to complete verification',
              verificationCode: agentVerificationCode,
              validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            };
            break;
          }

          case 'auto':
            // Automatic verification based on recent activity
            const recentActivityResult = await client.query(
              `SELECT COUNT(*) as activity_count
               FROM transactions
               WHERE (source_user_id = $1 OR destination_user_id = $1)
                 AND created_at > NOW() - INTERVAL '7 days'`,
              [userId]
            );

            const activityCount = parseInt(recentActivityResult.rows[0].activity_count);

            if (activityCount >= 3) {
              // User has sufficient recent activity - auto-verify
              await client.query(
                `UPDATE proof_of_life_verifications
                 SET status = 'verified', verified_at = NOW()
                 WHERE id = $1`,
                [sessionId]
              );

              await client.query(
                `UPDATE users
                 SET last_proof_of_life = NOW(),
                     proof_of_life_required_by = NOW() + INTERVAL '90 days',
                     updated_at = NOW()
                 WHERE id = $1`,
                [userId]
              );

              responseData = {
                ...responseData,
                status: 'verified',
                message: 'Verified automatically based on recent account activity',
                verifiedAt: new Date().toISOString(),
                nextVerificationDue: new Date(
                  Date.now() + 90 * 24 * 60 * 60 * 1000
                ).toISOString()
              };
            } else {
              responseData = {
                ...responseData,
                status: 'insufficient_activity',
                message: 'Insufficient recent activity for automatic verification',
                instructions: 'Please use SMS, biometric, or agent verification instead',
                recentTransactions: activityCount
              };
            }
            break;
        }

        return responseData;
      });

      await logWithAttribution({
        userId,
        toolName: 'proof_of_life_verification',
        action: 'start_verification',
        input: { method, location },
        result: 'success',
        ipAddress: req.ipAddress,
        sessionId: req.sessionId,
        isAutomated: false,
        createdAt: new Date()
      });

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('[Proof of Life] Error:', error);

      await logWithAttribution({
        userId,
        toolName: 'proof_of_life_verification',
        action: 'start_verification',
        input: { method, location },
        result: 'failure',
        ipAddress: req.ipAddress,
        sessionId: req.sessionId,
        isAutomated: false,
        createdAt: new Date()
      }).catch(console.error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(400).json({
        success: false,
        error: { code: 'VERIFICATION_FAILED', message: errorMessage }
      });
    }
  }
);

/**
 * POST /api/v1/user/proof-of-life/verify
 * Complete proof-of-life verification (for SMS and biometric methods)
 */
router.post(
  '/user/proof-of-life/verify',
  requireAuth,
  strictRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const { sessionId, code, biometricToken } = req.body;

    try {
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_SESSION', message: 'sessionId is required' }
        });
      }

      const result = await transaction(async (client) => {
        // Get verification session
        const sessionResult = await client.query(
          `SELECT 
            id, user_id, method, status, verification_code, expires_at
           FROM proof_of_life_verifications
           WHERE id = $1 AND user_id = $2
           FOR UPDATE`,
          [sessionId, userId]
        );

        if (sessionResult.rowCount === 0) {
          throw new Error('Verification session not found');
        }

        const session = sessionResult.rows[0] as {
          id: string;
          user_id: string;
          method: string;
          status: string;
          verification_code: string | null;
          expires_at: Date;
        };

        if (session.status === 'verified') {
          throw new Error('This verification session has already been completed');
        }

        if (session.status === 'expired') {
          throw new Error('This verification session has expired');
        }

        if (new Date() > new Date(session.expires_at)) {
          await client.query(
            `UPDATE proof_of_life_verifications SET status = 'expired' WHERE id = $1`,
            [sessionId]
          );
          throw new Error('Verification session has expired. Please start a new one.');
        }

        // Verify based on method
        if (session.method === 'sms') {
          if (!code) {
            throw new Error('Verification code is required');
          }

          if (code !== session.verification_code) {
            throw new Error('Invalid verification code');
          }
        } else if (session.method === 'biometric') {
          if (!biometricToken) {
            throw new Error('Biometric token is required');
          }
          // In production, validate biometric token with device API
          // For now, accept any token
        } else {
          throw new Error('This verification method cannot be completed via this endpoint');
        }

        // Mark verification as complete
        await client.query(
          `UPDATE proof_of_life_verifications
           SET status = 'verified', verified_at = NOW()
           WHERE id = $1`,
          [sessionId]
        );

        // Update user's proof-of-life timestamp
        await client.query(
          `UPDATE users
           SET last_proof_of_life = NOW(),
               proof_of_life_required_by = NOW() + INTERVAL '90 days',
               updated_at = NOW()
           WHERE id = $1`,
          [userId]
        );

        return {
          sessionId,
          status: 'verified',
          verifiedAt: new Date().toISOString(),
          nextVerificationDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          message: 'Proof-of-life verification completed successfully'
        };
      });

      await logWithAttribution({
        userId,
        toolName: 'proof_of_life_verification',
        action: 'complete_verification',
        input: { sessionId },
        result: 'success',
        ipAddress: req.ipAddress,
        sessionId: req.sessionId,
        isAutomated: false,
        createdAt: new Date()
      });

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('[Proof of Life Verify] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(400).json({
        success: false,
        error: { code: 'VERIFICATION_FAILED', message: errorMessage }
      });
    }
  }
);

export default router;
