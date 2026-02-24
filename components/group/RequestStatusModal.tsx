/**
 * RequestStatusModal – Buffr G2P.
 * Per-member Paid/Pending status for a group request. Matches Figma Request Status overlay.
 */
import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui';
import { designSystem } from '@/constants/designSystem';

export interface RequestContribution {
  memberId: string;
  name: string;
  status: 'Pending' | 'Paid';
  paidAt?: string;
}

export interface GroupRequestStatus {
  id: string;
  amount: number;
  note?: string;
  perMemberAmount: number;
  paidCount: number;
  totalMembers: number;
  contributions: RequestContribution[];
  date: string;
}

interface RequestStatusModalProps {
  visible: boolean;
  onClose: () => void;
  request: GroupRequestStatus | null;
}

const DS = designSystem;

function formatPaidAt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-NA', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ' • ' + d.toLocaleTimeString('en-NA', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch { return ''; }
}

export function RequestStatusModal({ visible, onClose, request }: RequestStatusModalProps) {
  if (!request) return null;

  const progress = request.totalMembers > 0 ? request.paidCount / request.totalMembers : 0;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <Text style={styles.title}>Request Status</Text>

          <View style={styles.amountRow}>
            <Ionicons name="people" size={18} color={DS.colors.brand.primary} />
            <Text style={styles.perMember}>
              N$ {request.perMemberAmount.toLocaleString('en-NA', { minimumFractionDigits: 0 })} / member
            </Text>
          </View>

          {/* Progress bar – Figma: primary fill, X/Y paid count */}
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { flex: progress }]} />
              <View style={{ flex: 1 - progress }} />
            </View>
            <Text style={styles.progressCount}>{request.paidCount}/{request.totalMembers} paid</Text>
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {request.contributions.map((c) => (
              <View key={c.memberId} style={styles.row}>
                <Avatar name={c.name} size={44} />
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName}>{c.name}</Text>
                  {c.status === 'Paid' && c.paidAt ? (
                    <Text style={styles.paidAt}>{formatPaidAt(c.paidAt)}</Text>
                  ) : null}
                </View>
                <View style={[styles.badge, c.status === 'Paid' ? styles.badgePaid : styles.badgePending]}>
                  <Text style={[styles.badgeText, c.status === 'Paid' ? styles.badgeTextPaid : styles.badgeTextPending]}>
                    {c.status}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.backBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  handle: { width: 36, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', color: DS.colors.neutral.text, textAlign: 'center', marginBottom: 12 },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16 },
  perMember: { fontSize: 16, fontWeight: '600', color: DS.colors.neutral.text },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  progressTrack: { flex: 1, height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, flexDirection: 'row', overflow: 'hidden' },
  progressFill: { backgroundColor: DS.colors.brand.primary, borderRadius: 3 },
  progressCount: { fontSize: 13, fontWeight: '600', color: DS.colors.neutral.textSecondary, minWidth: 44, textAlign: 'right' },
  list: { marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 12 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600', color: DS.colors.neutral.text },
  paidAt: { fontSize: 12, color: DS.colors.neutral.textTertiary, marginTop: 2 },
  badge: { borderRadius: 9999, paddingHorizontal: 14, paddingVertical: 5 },
  badgePaid: { backgroundColor: '#DCFCE7' },
  badgePending: { backgroundColor: '#F1F5F9' },
  badgeText: { fontSize: 13, fontWeight: '600' },
  badgeTextPaid: { color: '#15803D' },
  badgeTextPending: { color: DS.colors.neutral.textSecondary },
  backBtn: { height: 52, backgroundColor: '#F8FAFC', borderRadius: 9999, justifyContent: 'center', alignItems: 'center' },
  backBtnText: { fontSize: 16, fontWeight: '600', color: DS.colors.neutral.text },
});
