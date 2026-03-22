/**
 * KYC Document Picker Field
 *
 * Purpose: Reusable labeled row for selecting/uploading a KYC document using
 * `expo-document-picker`. Used by the Smartpay KYC document upload flow.
 *
 * Location: fintech/apps/smartpay-mobile/components/kyc/KycDocumentPickerField.tsx
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { designSystem as DS } from '@/constants/designSystem';
import { Button } from '@/components/ui/Button';

export type KycPickedFile = {
  uri: string;
  type: string;
  name: string;
  size?: number;
};

interface KycDocumentPickerFieldProps {
  label: string;
  required?: boolean;
  allowedTypes: string[];
  value: KycPickedFile | null;
  onChange: (file: KycPickedFile | null) => void;
  disabled?: boolean;
}

export function KycDocumentPickerField({
  label,
  required = false,
  allowedTypes,
  value,
  onChange,
  disabled = false,
}: KycDocumentPickerFieldProps) {
  const buttonText = useMemo(() => (value ? 'Change' : 'Choose'), [value]);

  const pick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: allowedTypes,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      onChange({
        uri: asset.uri,
        type: (asset.mimeType ?? (asset as any).type ?? 'application/octet-stream') as string,
        name: asset.name ?? `${label}.upload`,
        size: asset.size,
      });
    } catch (err) {
      console.error('[KycDocumentPickerField] pick failed:', err);
      Alert.alert('Upload error', 'Could not open the document picker. Please try again.');
    }
  };

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
          onPress={pick}
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

