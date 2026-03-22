/**
 * KYC Selfie Video Capture Field
 *
 * Purpose: Captures a selfie video (required for OpenCV liveness detection)
 * via the device camera and exposes it to the parent KYC document upload flow.
 *
 * Location: fintech/apps/smartpay-mobile/components/kyc/KycSelfieVideoCaptureField.tsx
 */
import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { designSystem as DS } from '@/constants/designSystem';
import { Button } from '@/components/ui/Button';
import type { KycPickedFile } from './KycDocumentPickerField';

interface KycSelfieVideoCaptureFieldProps {
  label: string;
  required?: boolean;
  value: KycPickedFile | null;
  onChange: (file: KycPickedFile | null) => void;
  disabled?: boolean;
}

export function KycSelfieVideoCaptureField({
  label,
  required = true,
  value,
  onChange,
  disabled = false,
}: KycSelfieVideoCaptureFieldProps) {
  const buttonText = useMemo(() => (value ? 'Re-record' : 'Record video'), [value]);

  const capture = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Camera permission required', 'Please allow camera access to record your selfie video.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
        allowsEditing: false,
      });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      onChange({
        uri: asset.uri,
        type: (asset.mimeType ?? 'video/mp4') as string,
        name: asset.fileName ?? 'selfie_video.mp4',
        size: asset.fileSize,
      });
    } catch (err) {
      console.error('[KycSelfieVideoCaptureField] capture failed:', err);
      Alert.alert('Capture error', 'Could not record the selfie video. Please try again.');
    }
  }, [onChange]);

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.label}>
          {label}
          {required ? ' *' : ''}
        </Text>
      </View>

      <View style={styles.right}>
        <Button
          title={buttonText}
          onPress={capture}
          disabled={disabled}
          variant="secondary"
          size="sm"
          style={{ borderRadius: DS.components.button.borderRadiusPill }}
        />
      </View>

      {value?.name ? <Text style={styles.fileName} numberOfLines={1}>{value.name}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: DS.spacing.lg,
  },
  left: { flex: 1 },
  right: { marginTop: DS.spacing.sm, marginBottom: DS.spacing.sm },
  label: {
    ...DS.typography.textStyles.bodySmall,
    fontWeight: '600',
    color: DS.colors.text,
    marginBottom: DS.spacing.xs,
  },
  fileName: {
    ...DS.typography.textStyles.caption,
    color: DS.colors.textSecondary,
    marginTop: DS.spacing.sm,
  },
});

