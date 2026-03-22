/**
 * KYC Documents Upload Card
 *
 * Purpose: Presents the document + selfie video upload step (CDD) for KYC.
 * The selfie video is required for OpenCV/MediaPipe liveness detection.
 *
 * Location: fintech/apps/smartpay-mobile/components/kyc/KycDocumentsUploadCard.tsx
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { designSystem as DS } from '@/constants/designSystem';
import { Button } from '@/components/ui/Button';
import { KycDocumentPickerField, type KycPickedFile } from './KycDocumentPickerField';
import { KycSelfieVideoCaptureField } from './KycSelfieVideoCaptureField';

interface KycDocumentsUploadCardProps {
  /**
   * KYC submission id used for backend upload.
   * In "fields-only" mode (when `showSubmitButton=false`), this can be omitted.
   */
  kycId?: string;
  isUploading: boolean;
  idDocumentFront: KycPickedFile | null;
  idDocumentBack: KycPickedFile | null;
  proofOfResidence: KycPickedFile | null;
  selfieVideo: KycPickedFile | null;
  businessCertificate: KycPickedFile | null;
  onUpload: (payload: {
    kycId: string;
    idDocumentFront: KycPickedFile;
    idDocumentBack?: KycPickedFile | null;
    proofOfResidence: KycPickedFile;
    selfieVideo: KycPickedFile;
    businessCertificate?: KycPickedFile | null;
  }) => Promise<{ success: boolean; error?: string }>;
  onError?: (message: string) => void;
  setIdDocumentFront: (v: KycPickedFile | null) => void;
  setIdDocumentBack: (v: KycPickedFile | null) => void;
  setProofOfResidence: (v: KycPickedFile | null) => void;
  setSelfieVideo: (v: KycPickedFile | null) => void;
  setBusinessCertificate: (v: KycPickedFile | null) => void;

  /**
   * When false, the card only renders pickers (no internal submit button).
   * Used when the parent screen orchestrates identity+upload in one CTA.
   */
  showSubmitButton?: boolean;
}

export function KycDocumentsUploadCard({
  kycId,
  isUploading,
  idDocumentFront,
  idDocumentBack,
  proofOfResidence,
  selfieVideo,
  businessCertificate,
  onUpload,
  onError,
  setIdDocumentFront,
  setIdDocumentBack,
  setProofOfResidence,
  setSelfieVideo,
  setBusinessCertificate,
  showSubmitButton = true,
}: KycDocumentsUploadCardProps) {
  const handleUpload = async () => {
    if (!kycId) {
      onError?.('KYC submission id missing. Please submit for verification first.');
      return;
    }

    if (!idDocumentFront) {
      onError?.('Please upload your ID front.');
      return;
    }
    if (!proofOfResidence) {
      onError?.('Please upload proof of residence.');
      return;
    }
    if (!selfieVideo) {
      onError?.('Please record your selfie video for liveness detection.');
      return;
    }

    const res = await onUpload({
      kycId,
      idDocumentFront,
      idDocumentBack,
      proofOfResidence,
      selfieVideo,
      businessCertificate,
    });

    if (!res.success) {
      onError?.(res.error || 'Upload failed');
    }
  };

  const handlePress = async () => {
    try {
      await handleUpload();
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Upload documents</Text>
      <Text style={styles.subtitle}>
        Submit your documents and record a short selfie video to confirm liveness.
      </Text>

      <KycDocumentPickerField
        label="ID front"
        required
        allowedTypes={['image/*', 'application/pdf']}
        value={idDocumentFront}
        onChange={setIdDocumentFront}
        disabled={isUploading}
      />

      <KycDocumentPickerField
        label="ID back (optional)"
        required={false}
        allowedTypes={['image/*', 'application/pdf']}
        value={idDocumentBack}
        onChange={setIdDocumentBack}
        disabled={isUploading}
      />

      <KycDocumentPickerField
        label="Proof of residence"
        required
        allowedTypes={['image/*', 'application/pdf']}
        value={proofOfResidence}
        onChange={setProofOfResidence}
        disabled={isUploading}
      />

      <KycSelfieVideoCaptureField
        label="Selfie video (required)"
        required
        value={selfieVideo}
        onChange={setSelfieVideo}
        disabled={isUploading}
      />

      <KycDocumentPickerField
        label="Business certificate (optional)"
        required={false}
        allowedTypes={['image/*', 'application/pdf']}
        value={businessCertificate}
        onChange={setBusinessCertificate}
        disabled={isUploading}
      />

      {showSubmitButton ? (
        <Button
          title={isUploading ? 'Uploading...' : 'Submit documents'}
          onPress={handlePress}
          disabled={isUploading}
          variant="primary"
          size="lg"
          isLoading={isUploading}
          style={{ backgroundColor: DS.colors.brand.primary }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DS.colors.neutral.surface,
    padding: DS.spacing.lg,
    borderRadius: DS.radius.md,
    marginBottom: DS.spacing.lg,
    ...DS.shadows.sm,
  },
  title: {
    ...DS.typography.textStyles.h3,
    color: DS.colors.neutral.text,
    marginBottom: DS.spacing.xs,
  },
  subtitle: {
    ...DS.typography.textStyles.bodySmall,
    color: DS.colors.neutral.textSecondary,
    marginBottom: DS.spacing.lg,
  },
});

