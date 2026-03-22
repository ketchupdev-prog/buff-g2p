/**
 * KYC Service - SmartPay Mobile
 * Handles KYC (Know Your Customer) verification per Namibia FIA/FIC
 * Location: mobile/services/kyc.ts
 */

import { api } from './api';
import { KycStatus, KycSubmitRequest, KycSubmitResponse } from '../types/api';
import { getAccessTokenKey, getSecureItem } from './secureStorage';

export { KycStatus };

/**
 * Get KYC status for authenticated user
 * GET /api/v1/kyc/status
 */
export async function getKycStatus(): Promise<KycStatus | null> {
  try {
    const response = await api.get<{ data: KycStatus }>('/api/v1/kyc/status', { retry: true });
    return response.data;
  } catch (error) {
    // Avoid noisy console.error logs that show up in the RN dev overlay.
    if (__DEV__) {
      console.log('getKycStatus failed:', error);
    }
    return null;
  }
}

/**
 * Submit KYC information for verification
 * POST /api/v1/kyc/submit
 */
export async function submitKyc(input: KycSubmitRequest): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await api.post<KycSubmitResponse>(
      '/api/v1/kyc/submit',
      input,
      { retry: false }
    );

    if (response.success) {
      return { success: true };
    }

    return {
      success: false,
      error: response.error?.message || 'Submission failed',
    };
  } catch (error) {
    if (__DEV__) {
      console.log('submitKyc failed:', error);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

export type KycUploadDocumentAsset = {
  uri: string;
  type: string;
  name: string;
};

/**
 * Upload KYC documents (multipart/form-data)
 * POST /api/v1/kyc/upload-documents
 *
 * This is implemented with fetch (not the axios `api` client) because axios defaults
 * to `application/json` and doesn't reliably handle RN multipart FormData headers.
 */
export async function uploadKycDocuments(input: {
  kycId: string;
  idDocumentFront: KycUploadDocumentAsset;
  idDocumentBack?: KycUploadDocumentAsset | null;
  proofOfResidence: KycUploadDocumentAsset;
  selfieVideo: KycUploadDocumentAsset;
  businessCertificate?: KycUploadDocumentAsset | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getSecureItem(getAccessTokenKey());
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:4000';

    const formDataUpload = new FormData();
    formDataUpload.append('kyc_id', input.kycId);
    formDataUpload.append('id_document_front', {
      uri: input.idDocumentFront.uri,
      type: input.idDocumentFront.type,
      name: input.idDocumentFront.name,
    } as any);

    if (input.idDocumentBack) {
      formDataUpload.append('id_document_back', {
        uri: input.idDocumentBack.uri,
        type: input.idDocumentBack.type,
        name: input.idDocumentBack.name,
      } as any);
    }

    formDataUpload.append('proof_of_residence', {
      uri: input.proofOfResidence.uri,
      type: input.proofOfResidence.type,
      name: input.proofOfResidence.name,
    } as any);

    formDataUpload.append('selfie_video', {
      uri: input.selfieVideo.uri,
      type: input.selfieVideo.type,
      name: input.selfieVideo.name,
    } as any);

    if (input.businessCertificate) {
      formDataUpload.append('business_certificate', {
        uri: input.businessCertificate.uri,
        type: input.businessCertificate.type,
        name: input.businessCertificate.name,
      } as any);
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/kyc/upload-documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formDataUpload,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return { success: false, error: text || 'Failed to upload documents' };
    }

    const json = (await response.json().catch(() => null)) as any;
    if (!json?.success) {
      return { success: false, error: json?.error?.message || 'Liveness failed or upload rejected' };
    }

    return { success: true };
  } catch (error) {
    console.error('uploadKycDocuments error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}
