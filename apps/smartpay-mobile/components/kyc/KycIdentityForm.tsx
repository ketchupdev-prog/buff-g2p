/**
 * KycIdentityForm
 *
 * Purpose: Reusable controlled identity form section for KYC submissions
 * (full name, ID type + number, date of birth, optional address).
 *
 * Location within project: fintech/apps/smartpay-mobile/components/kyc/KycIdentityForm.tsx
 */
import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { designSystem } from '@/constants/designSystem';

const ds = designSystem;

export type KycIdType = 'national_id' | 'passport';

export function KycIdentityForm(props: {
  introText: string;
  fullName: string;
  setFullName: (v: string) => void;
  idType: KycIdType;
  setIdType: (v: KycIdType) => void;
  idNumber: string;
  setIdNumber: (v: string) => void;
  idNumberLabel: string;
  idNumberPlaceholder: string;
  dateOfBirth: string;
  setDateOfBirth: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  identityInputsDisabled: boolean;
}) {
  const {
    introText,
    fullName,
    setFullName,
    idType,
    setIdType,
    idNumber,
    setIdNumber,
    idNumberLabel,
    idNumberPlaceholder,
    dateOfBirth,
    setDateOfBirth,
    address,
    setAddress,
    identityInputsDisabled,
  } = props;

  return (
    <>
      <Text style={styles.intro}>{introText}</Text>

      <Text style={styles.label}>Full name</Text>
      <TextInput
        style={styles.input}
        value={fullName}
        onChangeText={setFullName}
        placeholder="As on ID document"
        placeholderTextColor={ds.colors.neutral.textSecondary}
        autoCapitalize="words"
        editable={!identityInputsDisabled}
      />

      <Text style={styles.label}>ID type</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.chip, idType === 'national_id' && styles.chipActive]}
          onPress={() => setIdType('national_id')}
          disabled={identityInputsDisabled}
          accessibilityRole="button"
        >
          <Text style={[styles.chipText, idType === 'national_id' && styles.chipTextActive]}>National ID</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.chip, idType === 'passport' && styles.chipActive]}
          onPress={() => setIdType('passport')}
          disabled={identityInputsDisabled}
          accessibilityRole="button"
        >
          <Text style={[styles.chipText, idType === 'passport' && styles.chipTextActive]}>Passport</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>{idNumberLabel}</Text>
      <TextInput
        style={styles.input}
        value={idNumber}
        onChangeText={setIdNumber}
        placeholder={idNumberPlaceholder}
        placeholderTextColor={ds.colors.neutral.textSecondary}
        autoCapitalize="characters"
        editable={!identityInputsDisabled}
      />

      <Text style={styles.label}>Date of birth (YYYY-MM-DD)</Text>
      <TextInput
        style={styles.input}
        value={dateOfBirth}
        onChangeText={setDateOfBirth}
        placeholder="e.g. 1990-01-15"
        placeholderTextColor={ds.colors.neutral.textSecondary}
        keyboardType="numbers-and-punctuation"
        editable={!identityInputsDisabled}
      />

      <Text style={styles.label}>Address (optional)</Text>
      <TextInput
        style={[styles.input, styles.inputMultiline]}
        value={address}
        onChangeText={setAddress}
        placeholder="Residential address"
        placeholderTextColor={ds.colors.neutral.textSecondary}
        multiline
        numberOfLines={2}
        editable={!identityInputsDisabled}
      />
    </>
  );
}

const styles = StyleSheet.create({
  intro: {
    ...ds.typography.textStyles.body,
    color: ds.colors.neutral.textSecondary,
    marginBottom: ds.spacing.lg,
  },
  label: {
    ...ds.typography.textStyles.bodySmall,
    fontWeight: '600',
    color: ds.colors.neutral.text,
    marginBottom: ds.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: ds.colors.neutral.border,
    borderRadius: ds.radius.sm,
    padding: ds.spacing.md,
    fontSize: 16,
    backgroundColor: ds.colors.neutral.surface,
    marginBottom: ds.spacing.md,
  },
  inputMultiline: { minHeight: 72 },
  row: { flexDirection: 'row', gap: ds.spacing.sm, marginBottom: ds.spacing.md },
  chip: {
    paddingVertical: ds.spacing.sm,
    paddingHorizontal: ds.spacing.md,
    borderRadius: ds.radius.full,
    borderWidth: 1,
    borderColor: ds.colors.neutral.border,
    backgroundColor: ds.colors.neutral.surface,
  },
  chipActive: { borderColor: ds.colors.brand.primary, backgroundColor: ds.colors.brand.primaryLight },
  chipText: { ...ds.typography.textStyles.bodySmall, color: ds.colors.neutral.textSecondary },
  chipTextActive: { color: ds.colors.brand.primary, fontWeight: '600' },
});

