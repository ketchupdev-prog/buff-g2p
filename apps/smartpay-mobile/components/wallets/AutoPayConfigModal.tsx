/**
 * AutoPayConfigModal - Guided Auto Pay setup flow.
 *
 * Purpose:
 * - Implements the step-by-step sequence from wallet SVG designs:
 *   Select Method -> Select Pay From -> Select Number Of Payments -> Set Date -> Set Time.
 * - Provides a single normalized payload for save actions.
 *
 * Location: components/wallets/AutoPayConfigModal.tsx
 */
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { designSystem as DS } from '@/constants/designSystem';
import type { LinkedBankAccount } from '@/contexts/WalletsContext';

export type AutoPayMethod = 'monthly' | 'biweekly' | 'weekly';

export interface AutoPayConfig {
  method: AutoPayMethod;
  payFromId: string;
  payFromLabel: string;
  numberOfPayments: number;
  debitDate: string; // YYYY-MM-DD
  debitTime: string; // HH:mm
}

interface AutoPayConfigModalProps {
  visible: boolean;
  linkedAccounts: LinkedBankAccount[];
  initialConfig?: AutoPayConfig;
  onClose: () => void;
  onSave: (config: AutoPayConfig) => void;
}

type SetupStep = 'method' | 'payFrom' | 'payments' | 'date' | 'time' | 'review';

export function AutoPayConfigModal({
  visible,
  linkedAccounts,
  initialConfig,
  onClose,
  onSave,
}: AutoPayConfigModalProps) {
  const today = useMemo(() => new Date(), []);
  const defaultDate = today.toISOString().slice(0, 10);
  const [method, setMethod] = useState<AutoPayMethod>(initialConfig?.method ?? 'monthly');
  const [payFromId, setPayFromId] = useState<string>(initialConfig?.payFromId ?? linkedAccounts[0]?.id ?? '');
  const [numberOfPayments, setNumberOfPayments] = useState<number>(initialConfig?.numberOfPayments ?? 12);
  const [debitDate, setDebitDate] = useState<string>(initialConfig?.debitDate ?? defaultDate);
  const [debitTime, setDebitTime] = useState<string>(initialConfig?.debitTime ?? '09:00');
  const [step, setStep] = useState<SetupStep>('method');

  const selectedAccount = linkedAccounts.find((acc) => acc.id === payFromId);
  const canSave = Boolean(selectedAccount && numberOfPayments >= 1 && debitDate && debitTime);

  const handleSave = () => {
    if (!selectedAccount) return;
    onSave({
      method,
      payFromId: selectedAccount.id,
      payFromLabel: `${selectedAccount.bankName} ${selectedAccount.accountNumber}`,
      numberOfPayments,
      debitDate,
      debitTime,
    });
  };

  const goBack = () => {
    const order: SetupStep[] = ['method', 'payFrom', 'payments', 'date', 'time', 'review'];
    const idx = order.indexOf(step);
    if (idx <= 0) {
      onClose();
      return;
    }
    setStep(order[idx - 1]);
  };

  const goNext = () => {
    const order: SetupStep[] = ['method', 'payFrom', 'payments', 'date', 'time', 'review'];
    const idx = order.indexOf(step);
    if (idx >= order.length - 1) return;
    setStep(order[idx + 1]);
  };

  const getTitle = (): string => {
    switch (step) {
      case 'method':
        return 'Select Method';
      case 'payFrom':
        return 'Select Pay From';
      case 'payments':
        return 'Select Number Of Payments';
      case 'date':
        return 'Set Date';
      case 'time':
        return 'Set Time';
      case 'review':
        return 'Auto Pay Setup';
      default:
        return 'Auto Pay';
    }
  };

  const canProceed =
    step === 'payFrom'
      ? Boolean(selectedAccount)
      : true;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => null}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={goBack} activeOpacity={0.8} accessibilityRole="button">
              <Text style={styles.headerAction}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{getTitle()}</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.8} accessibilityRole="button">
              <Text style={styles.headerAction}>Close</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>Set recurring funding for this wallet.</Text>

          {step === 'method' && (
            <View style={styles.section}>
              <View style={styles.row}>
                {(['monthly', 'biweekly', 'weekly'] as const).map((item) => (
                  <OptionPill
                    key={item}
                    label={item === 'biweekly' ? 'Bi-Weekly' : item.charAt(0).toUpperCase() + item.slice(1)}
                    active={method === item}
                    onPress={() => setMethod(item)}
                  />
                ))}
              </View>
            </View>
          )}

          {step === 'payFrom' && (
            <View style={styles.section}>
              {linkedAccounts.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No linked bank accounts yet.</Text>
                </View>
              ) : (
                <View style={styles.column}>
                  {linkedAccounts.map((acc) => (
                    <OptionRow
                      key={acc.id}
                      label={`${acc.bankName} ${acc.accountNumber}`}
                      active={payFromId === acc.id}
                      onPress={() => setPayFromId(acc.id)}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {step === 'payments' && (
            <View style={styles.section}>
              <View style={styles.row}>
                {[3, 6, 12, 24].map((count) => (
                  <OptionPill
                    key={count}
                    label={`${count}`}
                    active={numberOfPayments === count}
                    onPress={() => setNumberOfPayments(count)}
                  />
                ))}
              </View>
            </View>
          )}

          {step === 'date' && (
            <View style={styles.section}>
              <View style={styles.row}>
                <OptionPill label={defaultDate} active={debitDate === defaultDate} onPress={() => setDebitDate(defaultDate)} />
                <OptionPill
                  label="Tomorrow"
                  active={debitDate !== defaultDate}
                  onPress={() => {
                    const tomorrow = new Date(today);
                    tomorrow.setDate(today.getDate() + 1);
                    setDebitDate(tomorrow.toISOString().slice(0, 10));
                  }}
                />
              </View>
            </View>
          )}

          {step === 'time' && (
            <View style={styles.section}>
              <View style={styles.row}>
                {['08:00', '09:00', '12:00', '18:00'].map((time) => (
                  <OptionPill key={time} label={time} active={debitTime === time} onPress={() => setDebitTime(time)} />
                ))}
              </View>
            </View>
          )}

          {step === 'review' && (
            <View style={styles.section}>
              <View style={styles.reviewCard}>
                <Text style={styles.reviewLine}>Method: {method}</Text>
                <Text style={styles.reviewLine}>Pay From: {selectedAccount ? `${selectedAccount.bankName} ${selectedAccount.accountNumber}` : 'Not selected'}</Text>
                <Text style={styles.reviewLine}>Payments: {numberOfPayments}</Text>
                <Text style={styles.reviewLine}>Date: {debitDate}</Text>
                <Text style={styles.reviewLine}>Time: {debitTime}</Text>
              </View>
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            {step === 'review' ? (
              <TouchableOpacity
                style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={!canSave}
                activeOpacity={0.8}
              >
                <Text style={styles.saveText}>Save Auto Pay</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.saveButton, !canProceed && styles.saveButtonDisabled]}
                onPress={goNext}
                disabled={!canProceed}
                activeOpacity={0.8}
              >
                <Text style={styles.saveText}>Continue</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function OptionPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.pill, active && styles.pillActive]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function OptionRow({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.optionRow, active && styles.optionRowActive]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.optionRowText, active && styles.optionRowTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: DS.colors.background,
    borderTopLeftRadius: DS.radius['2xl'],
    borderTopRightRadius: DS.radius['2xl'],
    padding: DS.spacing.lg,
    gap: DS.spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerAction: {
    fontSize: DS.typography.fontSize.sm,
    color: DS.colors.brand.primary,
    fontWeight: DS.typography.fontWeight.medium,
    minWidth: 44,
  },
  title: {
    fontSize: DS.typography.fontSize.lg,
    fontWeight: DS.typography.fontWeight.semibold,
    color: DS.colors.text,
  },
  subtitle: {
    fontSize: DS.typography.fontSize.sm,
    color: DS.colors.textSecondary,
    marginBottom: DS.spacing.xs,
  },
  section: {
    gap: DS.spacing.sm,
    marginTop: DS.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: DS.spacing.sm,
  },
  column: {
    gap: DS.spacing.xs,
  },
  pill: {
    borderWidth: 1,
    borderColor: DS.colors.border,
    borderRadius: DS.radius.full,
    paddingHorizontal: DS.spacing.md,
    minHeight: 40,
    justifyContent: 'center',
    backgroundColor: DS.colors.surface,
  },
  pillActive: {
    borderColor: DS.colors.brand.primary,
    backgroundColor: DS.colors.brand.primaryLight,
  },
  pillText: {
    fontSize: DS.typography.fontSize.sm,
    color: DS.colors.text,
    fontWeight: DS.typography.fontWeight.medium,
  },
  pillTextActive: {
    color: DS.colors.brand.primary,
  },
  optionRow: {
    borderWidth: 1,
    borderColor: DS.colors.border,
    borderRadius: DS.radius.lg,
    minHeight: 48,
    paddingHorizontal: DS.spacing.md,
    justifyContent: 'center',
    backgroundColor: DS.colors.surface,
  },
  optionRowActive: {
    borderColor: DS.colors.brand.primary,
    backgroundColor: DS.colors.brand.primaryLight,
  },
  optionRowText: {
    fontSize: DS.typography.fontSize.base,
    color: DS.colors.text,
  },
  optionRowTextActive: {
    color: DS.colors.brand.primary,
    fontWeight: DS.typography.fontWeight.semibold,
  },
  emptyBox: {
    borderWidth: 1,
    borderColor: DS.colors.border,
    borderRadius: DS.radius.lg,
    padding: DS.spacing.md,
    backgroundColor: DS.colors.surface,
  },
  emptyText: {
    color: DS.colors.textSecondary,
    fontSize: DS.typography.fontSize.sm,
  },
  reviewCard: {
    borderWidth: 1,
    borderColor: DS.colors.border,
    borderRadius: DS.radius.lg,
    backgroundColor: DS.colors.surface,
    padding: DS.spacing.md,
    gap: DS.spacing.xs,
  },
  reviewLine: {
    fontSize: DS.typography.fontSize.base,
    color: DS.colors.text,
  },
  actions: {
    flexDirection: 'row',
    gap: DS.spacing.sm,
    marginTop: DS.spacing.md,
    paddingBottom: DS.spacing.sm,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: DS.colors.border,
    borderRadius: DS.radius.lg,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: DS.colors.text,
    fontWeight: DS.typography.fontWeight.medium,
    fontSize: DS.typography.fontSize.base,
  },
  saveButton: {
    flex: 1,
    borderRadius: DS.radius.lg,
    backgroundColor: DS.colors.brand.primary,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveText: {
    color: '#fff',
    fontWeight: DS.typography.fontWeight.semibold,
    fontSize: DS.typography.fontSize.base,
  },
});
