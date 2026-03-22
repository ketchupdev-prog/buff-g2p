/**
 * KYC screen – Submit Customer Due Diligence (CDD) per Namibia FIA/FIC.
 * Full name, ID number, ID type, date of birth, address. Aligns with docs/NAMIBIA_KYC_REQUIREMENTS.md.
 * Location: fintech/smartpay/app/(authenticated)/kyc.tsx
 */
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { designSystem } from '@/constants/designSystem';
import { getKycStatus, submitKyc, uploadKycDocuments, type KycStatus } from '@/services/kyc';
import { OperationResultModal } from '@/components/feedback/OperationResultModal';
import { Button } from '@/components/ui/Button';
import {
  KycDocumentsUploadCard,
} from '@/components/kyc/KycDocumentsUploadCard';
import type { KycPickedFile } from '@/components/kyc/KycDocumentPickerField';
import { KycHeader } from '@/components/kyc/KycHeader';
import { KycIdentityForm } from '@/components/kyc/KycIdentityForm';
import { KycStatusCard } from '@/components/kyc/KycStatusCard';

const ds = designSystem;

export default function KycScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<KycStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [fullName, setFullName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [idType, setIdType] = useState<'national_id' | 'passport'>('national_id');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');

  const [idDocumentFront, setIdDocumentFront] = useState<KycPickedFile | null>(null);
  const [idDocumentBack, setIdDocumentBack] = useState<KycPickedFile | null>(null);
  const [proofOfResidence, setProofOfResidence] = useState<KycPickedFile | null>(null);
  const [selfieVideo, setSelfieVideo] = useState<KycPickedFile | null>(null);
  const [businessCertificate, setBusinessCertificate] = useState<KycPickedFile | null>(null);

  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalType, setResultModalType] = useState<'success' | 'error'>('success');
  const [resultModalTitle, setResultModalTitle] = useState('KYC update');
  const [resultModalMessage, setResultModalMessage] = useState('');
  const [didAutoShowCompletion, setDidAutoShowCompletion] = useState(false);

  const openResultModal = (args: {
    type: 'success' | 'error';
    title: string;
    message: string;
  }) => {
    setResultModalType(args.type);
    setResultModalTitle(args.title);
    setResultModalMessage(args.message);
    setResultModalVisible(true);
  };

  useEffect(() => {
    getKycStatus().then((s) => {
      setStatus(s ?? null);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!status) return;

    // Show completion feedback once when entering the screen and KYC is already verified.
    if (status.kycVerified && !status.pendingSubmission && !didAutoShowCompletion) {
      openResultModal({
        type: 'success',
        title: 'KYC verified',
        message: 'Your identity verification is complete. Higher limits are now enabled.',
      });
      setDidAutoShowCompletion(true);
    }
  }, [loading, status, didAutoShowCompletion]);

  // While under review, periodically refresh so the screen can transition
  // from "pending" to "verified" without requiring push-notifications.
  useEffect(() => {
    if (loading) return;
    if (!status?.pendingSubmission) return;
    if (status.kycVerified) return;

    const intervalMs = 8000;
    const interval = setInterval(() => {
      getKycStatus()
        .then((fresh) => {
          if (fresh) setStatus(fresh);
        })
        .catch(() => {
          // Silently ignore polling errors; UI already shows pending.
        });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [loading, status?.pendingSubmission, status?.kycVerified]);

  const submissionStage = status?.lastSubmission?.status ?? null;

  const identityInputsDisabled =
    submitting ||
    uploadingDocs ||
    (!!status?.lastSubmission && (submissionStage === 'pending' || submissionStage === 'liveness_failed'));

  const validateIdentity = (): { ok: true } | { ok: false; message: string } => {
    if (!fullName.trim() || !idNumber.trim() || !dateOfBirth.trim()) {
      const missingIdLabel = idType === 'passport' ? 'passport number' : 'ID number';
      return {
        ok: false,
        message: `Please enter full name, ${missingIdLabel}, and date of birth.`,
      };
    }

    const dob = dateOfBirth.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      return { ok: false, message: 'Use date of birth in YYYY-MM-DD format.' };
    }

    return { ok: true };
  };

  const validateRequiredDocs = (): { ok: true } | { ok: false; message: string } => {
    if (!idDocumentFront) return { ok: false, message: 'Please upload your ID front.' };
    if (!proofOfResidence) return { ok: false, message: 'Please upload proof of residence.' };
    if (!selfieVideo) return { ok: false, message: 'Please record your selfie video for liveness detection.' };
    return { ok: true };
  };

  /**
   * UX requirement:
   * Users should pick/upload all required documents + selfie video before we create the review submission.
   * When no `kyc_id` exists yet, we call `POST /api/v1/kyc/submit` first and then immediately
   * call `POST /api/v1/kyc/upload-documents`, so the status card appears only after the full sequence.
   */
  const handleSubmitAndUploadDocs = async () => {
    if (!status || status.kycVerified) return;

    // Always require docs + selfie for the UX flow.
    const docsValidation = validateRequiredDocs();
    if (!docsValidation.ok) {
      openResultModal({ type: 'error', title: 'Missing uploads', message: docsValidation.message });
      return;
    }
    // Narrow picked files for TypeScript (validateRequiredDocs already enforced this).
    if (!idDocumentFront || !proofOfResidence || !selfieVideo) return;

    // If we don't have a submission yet, validate identity and create it first.
    if (!status.lastSubmission) {
      const identityValidation = validateIdentity();
      if (!identityValidation.ok) {
        openResultModal({ type: 'error', title: 'Missing fields', message: identityValidation.message });
        return;
      }

      setSubmitting(true);
      try {
        const result = await submitKyc({
          fullName: fullName.trim(),
          idNumber: idNumber.trim(),
          idType,
          dateOfBirth: dateOfBirth.trim(),
          address: address.trim() || undefined,
        });

        if (!result.success) {
          openResultModal({ type: 'error', title: 'Submission failed', message: result.error ?? 'Please try again.' });
          return;
        }

        // Fetch only the generated `kyc_id` so we can upload docs right away.
        // We intentionally do NOT update screen state yet, so the user only sees
        // "submission status" after the upload step has been attempted.
        const fresh = await getKycStatus();
        const kycId = fresh?.lastSubmission?.id;
        if (!kycId) {
          openResultModal({ type: 'error', title: 'Upload unavailable', message: 'We could not locate your KYC submission id. Please try again.' });
          return;
        }

        // Immediately upload docs + selfie video after identity submission.
        const uploadRes = await handleUploadDocs({
          kycId,
          idDocumentFront,
          idDocumentBack,
          proofOfResidence,
          selfieVideo,
          businessCertificate,
        });

        if (!uploadRes.success) {
          // handleUploadDocs already opens an error modal; this is a guard to prevent silent failure.
          openResultModal({
            type: 'error',
            title: 'Upload failed',
            message: uploadRes.error ?? 'Please try again.',
          });
        }
      } finally {
        setSubmitting(false);
      }

      return;
    }

    // If we already have a submission (pending or liveness_failed), only upload docs.
    if (submissionStage !== 'pending' && submissionStage !== 'liveness_failed') return;

    if (!idDocumentFront || !proofOfResidence || !selfieVideo) {
      openResultModal({ type: 'error', title: 'Missing uploads', message: 'Please upload required documents and record your selfie video.' });
      return;
    }

    setSubmitting(true);
    try {
      const uploadRes = await handleUploadDocs({
        kycId: status.lastSubmission.id,
        idDocumentFront,
        idDocumentBack,
        proofOfResidence,
        selfieVideo,
        businessCertificate,
      });

      if (!uploadRes.success) {
        openResultModal({
          type: 'error',
          title: 'Upload failed',
          message: uploadRes.error ?? 'Please try again.',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const shouldShowUploadStep =
    !!status && !status.kycVerified && (submissionStage === null || submissionStage === 'pending' || submissionStage === 'liveness_failed');

  // identityInputsDisabled is already derived from the last submission stage.
  const canSubmitIdentity =
    !submitting &&
    !uploadingDocs &&
    !!fullName.trim() &&
    !!idNumber.trim() &&
    !!dateOfBirth.trim() &&
    /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth.trim());

  const canUploadDocs = !!idDocumentFront && !!proofOfResidence && !!selfieVideo;

  const idNumberLabel = idType === 'passport' ? 'Passport Number' : 'ID number';
  const idNumberPlaceholder = idType === 'passport' ? 'Passport number' : 'Document number';

  const handleUploadDocs = async (payload: {
    kycId: string;
    idDocumentFront: KycPickedFile;
    idDocumentBack?: KycPickedFile | null;
    proofOfResidence: KycPickedFile;
    selfieVideo: KycPickedFile;
    businessCertificate?: KycPickedFile | null;
  }) => {
    setUploadingDocs(true);
    try {
      const res = await uploadKycDocuments(payload);
      const fresh = await getKycStatus();
      setStatus(fresh ?? null);

      if (res.success) {
        const freshStage = fresh?.lastSubmission?.status ?? payload.kycId;
        openResultModal({
          type: 'success',
          title: 'Submitted',
          message:
            freshStage === 'pending_documents'
              ? 'Documents uploaded and liveness passed. Status: pending review.'
              : 'Documents uploaded. Status updated.',
        });
      }
      return res;
    } finally {
      setUploadingDocs(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={ds.colors.brand.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KycHeader title="Verify your identity" onBackPress={() => router.back()} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {status ? <KycStatusCard status={status} /> : null}

          <KycIdentityForm
            introText="To unlock higher transaction limits and full features, we need to verify your identity (per Namibia FIA/FIC requirements)."
            fullName={fullName}
            setFullName={setFullName}
            idType={idType}
            setIdType={setIdType}
            idNumber={idNumber}
            setIdNumber={setIdNumber}
            idNumberLabel={idNumberLabel}
            idNumberPlaceholder={idNumberPlaceholder}
            dateOfBirth={dateOfBirth}
            setDateOfBirth={setDateOfBirth}
            address={address}
            setAddress={setAddress}
            identityInputsDisabled={identityInputsDisabled}
          />

          {shouldShowUploadStep ? (
            <>
            <KycDocumentsUploadCard
              kycId={status?.lastSubmission?.id}
              isUploading={uploadingDocs || submitting}
              idDocumentFront={idDocumentFront}
              idDocumentBack={idDocumentBack}
              proofOfResidence={proofOfResidence}
              selfieVideo={selfieVideo}
              businessCertificate={businessCertificate}
              onUpload={handleUploadDocs}
              onError={(message) =>
                openResultModal({
                  type: 'error',
                  title: 'Upload error',
                  message,
                })
              }
              setIdDocumentFront={setIdDocumentFront}
              setIdDocumentBack={setIdDocumentBack}
              setProofOfResidence={setProofOfResidence}
              setSelfieVideo={setSelfieVideo}
              setBusinessCertificate={setBusinessCertificate}
              showSubmitButton={false}
            />
              <Button
                title={!status?.lastSubmission ? 'Submit for verification' : 'Submit documents'}
                onPress={handleSubmitAndUploadDocs}
                disabled={
                  submitting ||
                  uploadingDocs ||
                  (!status?.lastSubmission ? !(canSubmitIdentity && canUploadDocs) : !canUploadDocs)
                }
                variant="primary"
                size="lg"
                isLoading={submitting || uploadingDocs}
                style={{ backgroundColor: ds.colors.brand.primary }}
              />
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <OperationResultModal
        visible={resultModalVisible}
        type={resultModalType}
        title={resultModalTitle}
        message={resultModalMessage}
        onClose={() => setResultModalVisible(false)}
        doneLabel="Done"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: ds.colors.neutral.background },
  flex: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: ds.spacing.lg, paddingBottom: ds.spacing.xxl },
});
