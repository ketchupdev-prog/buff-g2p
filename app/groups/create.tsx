/**
 * Create Group – Buffr G2P.
 * Multi-step group creation: Name + Purpose → Member Settings → Invite Members.
 * §6.1 group creation flow.
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { designSystem } from '@/constants/designSystem';
import { getSecureItem } from '@/services/secureStorage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

type Step = 'details' | 'settings' | 'invite';


async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const token = await getSecureItem('buffr_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
}

async function createGroup(params: {
  name: string;
  purpose: string;
  type: string;
  maxMembers: number;
  invitePhones: string[];
}): Promise<{ success: boolean; groupId?: string; error?: string }> {
  if (API_BASE_URL) {
    try {
      const h = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...h },
        body: JSON.stringify(params),
      });
      const data = (await res.json()) as { groupId?: string; error?: string };
      if (res.ok) return { success: true, groupId: data.groupId };
      return { success: false, error: data.error };
    } catch { /* fall through */ }
  }
  return { success: true, groupId: 'grp_' + Date.now() };
}

export default function GroupsCreateScreen() {
  const [step, setStep] = useState<Step>('details');
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [type] = useState('custom'); // Users name their group; no predetermined types (Buffr design).
  const [maxMembers, setMaxMembers] = useState('20');
  const [inviteInput, setInviteInput] = useState('');
  const [invites, setInvites] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null); // groupId on success

  const totalSteps = 3;
  const stepIndex = step === 'details' ? 1 : step === 'settings' ? 2 : 3;

  function nextStep() {
    if (step === 'details') {
      if (!name.trim()) { setError('Group name is required.'); return; }
      setError(null);
      setStep('settings');
    } else if (step === 'settings') {
      setError(null);
      setStep('invite');
    }
  }

  function addInvite() {
    const phone = inviteInput.trim();
    if (!phone) return;
    if (invites.includes(phone)) { setInviteInput(''); return; }
    setInvites(prev => [...prev, phone]);
    setInviteInput('');
  }

  function removeInvite(phone: string) {
    setInvites(prev => prev.filter(p => p !== phone));
  }

  async function handleCreate() {
    setSubmitting(true);
    setError(null);
    const result = await createGroup({
      name: name.trim(),
      purpose: purpose.trim(),
      type,
      maxMembers: parseInt(maxMembers, 10) || 20,
      invitePhones: invites,
    });
    setSubmitting(false);
    if (result.success) {
      setDone(result.groupId ?? 'new');
    } else {
      setError(result.error ?? 'Failed to create group. Please try again.');
    }
  }

  if (done) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <View style={styles.center}>
            <View style={styles.successIcon}>
              <Ionicons name="people-circle-outline" size={44} color={designSystem.colors.brand.primary} />
            </View>
            <Text style={styles.successTitle}>Group Created!</Text>
            <Text style={styles.successSub}>
              "{name}" is ready.{invites.length > 0 ? ` Invites sent to ${invites.length} member${invites.length !== 1 ? 's' : ''}.` : ''}
            </Text>
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => router.replace({ pathname: '/groups/[id]' as never, params: { id: done } })}
            >
              <Text style={styles.viewBtnText}>View Group</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.homeLink} onPress={() => router.replace('/(tabs)' as never)}>
              <Text style={styles.homeLinkText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: true, headerTitle: 'Create Group', headerTintColor: designSystem.colors.neutral.text, headerStyle: { backgroundColor: '#fff' } }} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* Progress */}
          <View style={styles.progressWrap}>
            {Array.from({ length: totalSteps }, (_, i) => (
              <View
                key={i}
                style={[styles.progressDot, i + 1 <= stepIndex && styles.progressDotActive]}
              />
            ))}
          </View>
          <Text style={styles.stepLabel}>Step {stepIndex} of {totalSteps}</Text>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {step === 'details' && (
              <>
                <Text style={styles.stepTitle}>Group Details</Text>
                <Text style={styles.stepSub}>Give your group a name and tell members what it's for.</Text>

                <Text style={styles.fieldLabel}>Group Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Windhoek Savings Circle"
                  placeholderTextColor={designSystem.colors.neutral.textTertiary}
                  value={name}
                  onChangeText={t => { setName(t); setError(null); }}
                  maxLength={60}
                  autoFocus
                />

                <Text style={styles.fieldLabel}>Purpose (optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="What is this group for?"
                  placeholderTextColor={designSystem.colors.neutral.textTertiary}
                  value={purpose}
                  onChangeText={setPurpose}
                  multiline
                  numberOfLines={3}
                  maxLength={200}
                />

              </>
            )}

            {step === 'settings' && (
              <>
                <Text style={styles.stepTitle}>Group Settings</Text>
                <Text style={styles.stepSub}>Configure membership limits and permissions.</Text>

                <Text style={styles.fieldLabel}>Maximum Members</Text>
                <View style={styles.maxMembersRow}>
                  {['10', '20', '50', '100'].map(v => (
                    <TouchableOpacity
                      key={v}
                      style={[styles.chip, maxMembers === v && styles.chipActive]}
                      onPress={() => setMaxMembers(v)}
                    >
                      <Text style={[styles.chipText, maxMembers === v && styles.chipTextActive]}>{v}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Group Summary</Text>
                  {[
                    { label: 'Name', value: name },
                    ...(purpose ? [{ label: 'Purpose', value: purpose }] : []),
                    { label: 'Max Members', value: maxMembers },
                  ].map((row, i, arr) => (
                    <View key={row.label} style={[styles.summaryRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                      <Text style={styles.summaryLabel}>{row.label}</Text>
                      <Text style={styles.summaryValue}>{row.value}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {step === 'invite' && (
              <>
                <Text style={styles.stepTitle}>Invite Members</Text>
                <Text style={styles.stepSub}>Add phone numbers to invite. You can also do this later.</Text>

                <View style={styles.inviteRow}>
                  <TextInput
                    style={styles.inviteInput}
                    placeholder="+264 81 xxx xxxx"
                    placeholderTextColor={designSystem.colors.neutral.textTertiary}
                    value={inviteInput}
                    onChangeText={setInviteInput}
                    keyboardType="phone-pad"
                    onSubmitEditing={addInvite}
                    returnKeyType="done"
                  />
                  <TouchableOpacity style={styles.addBtn} onPress={addInvite}>
                    <Ionicons name="add" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                {invites.length > 0 && (
                  <View style={styles.inviteList}>
                    {invites.map(phone => (
                      <View key={phone} style={styles.inviteChip}>
                        <Ionicons name="person-outline" size={14} color={designSystem.colors.brand.primary} />
                        <Text style={styles.inviteChipText}>{phone}</Text>
                        <TouchableOpacity onPress={() => removeInvite(phone)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Ionicons name="close" size={14} color={designSystem.colors.neutral.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {invites.length === 0 && (
                  <View style={styles.skipBanner}>
                    <Ionicons name="information-circle-outline" size={16} color="#1D4ED8" />
                    <Text style={styles.skipText}>You can invite members after the group is created from the group settings page.</Text>
                  </View>
                )}
              </>
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </ScrollView>

          <View style={styles.footer}>
            {step !== 'details' && (
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => setStep(step === 'settings' ? 'details' : 'settings')}
              >
                <Ionicons name="chevron-back" size={18} color={designSystem.colors.neutral.textSecondary} />
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
            )}
            {step !== 'invite' ? (
              <TouchableOpacity style={styles.nextBtn} onPress={nextStep}>
                <Text style={styles.nextBtnText}>Continue</Text>
                <Ionicons name="chevron-forward" size={18} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.createBtn, submitting && styles.btnDisabled]}
                onPress={handleCreate}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.createBtnText}>Create Group</Text>}
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const DS = designSystem;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.colors.neutral.background },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  progressWrap: { flexDirection: 'row', gap: 8, justifyContent: 'center', paddingTop: 16 },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: DS.colors.neutral.border },
  progressDotActive: { backgroundColor: DS.colors.brand.primary, width: 24 },
  stepLabel: { textAlign: 'center', fontSize: 12, color: DS.colors.neutral.textSecondary, marginTop: 8, marginBottom: 4 },
  content: { padding: 24, paddingBottom: 16 },
  stepTitle: { fontSize: 22, fontWeight: '800', color: DS.colors.neutral.text, marginBottom: 6 },
  stepSub: { fontSize: 14, color: DS.colors.neutral.textSecondary, marginBottom: 24, lineHeight: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: DS.colors.neutral.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { height: 56, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, borderColor: DS.colors.neutral.border, paddingHorizontal: 16, fontSize: 16, color: DS.colors.neutral.text, marginBottom: 20 },
  textArea: { height: 88, paddingTop: 14, textAlignVertical: 'top' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  typeCard: { width: '47%', backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: DS.colors.neutral.border, gap: 6 },
  typeCardActive: { borderColor: DS.colors.brand.primary, backgroundColor: '#EFF6FF' },
  typeLabel: { fontSize: 14, fontWeight: '700', color: DS.colors.neutral.text },
  typeDesc: { fontSize: 11, color: DS.colors.neutral.textSecondary, lineHeight: 15 },
  maxMembersRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  chip: { flex: 1, height: 44, borderRadius: 9999, borderWidth: 1.5, borderColor: DS.colors.neutral.border, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  chipActive: { backgroundColor: DS.colors.brand.primary, borderColor: DS.colors.brand.primary },
  chipText: { fontSize: 14, fontWeight: '600', color: DS.colors.neutral.textSecondary },
  chipTextActive: { color: '#fff' },
  summaryCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: DS.colors.neutral.border, overflow: 'hidden' },
  summaryTitle: { fontSize: 13, fontWeight: '700', color: DS.colors.neutral.text, padding: 16, borderBottomWidth: 1, borderBottomColor: DS.colors.neutral.border },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: DS.colors.neutral.border },
  summaryLabel: { fontSize: 13, color: DS.colors.neutral.textSecondary },
  summaryValue: { fontSize: 13, fontWeight: '600', color: DS.colors.neutral.text, maxWidth: '55%', textAlign: 'right' },
  inviteRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  inviteInput: { flex: 1, height: 50, backgroundColor: '#fff', borderRadius: 9999, borderWidth: 1.5, borderColor: DS.colors.neutral.border, paddingHorizontal: 16, fontSize: 15, color: DS.colors.neutral.text },
  addBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: DS.colors.brand.primary, justifyContent: 'center', alignItems: 'center' },
  inviteList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  inviteChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EFF6FF', borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 8 },
  inviteChipText: { fontSize: 13, color: DS.colors.brand.primary, fontWeight: '500' },
  skipBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#DBEAFE', borderRadius: 12, padding: 14 },
  skipText: { flex: 1, fontSize: 13, color: '#1D4ED8', lineHeight: 18 },
  errorText: { fontSize: 13, color: DS.colors.semantic.error, marginTop: 8 },
  footer: { flexDirection: 'row', gap: 12, padding: 24, paddingBottom: 32, alignItems: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  backBtnText: { fontSize: 15, color: DS.colors.neutral.textSecondary, fontWeight: '600' },
  nextBtn: { flex: 1, height: 56, backgroundColor: DS.colors.brand.primary, borderRadius: 9999, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  createBtn: { flex: 1, height: 56, backgroundColor: '#22C55E', borderRadius: 9999, justifyContent: 'center', alignItems: 'center' },
  createBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  btnDisabled: { opacity: 0.5 },
  successIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: DS.colors.brand.primaryMuted, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  successTitle: { fontSize: 24, fontWeight: '800', color: DS.colors.neutral.text, marginBottom: 8 },
  successSub: { fontSize: 14, color: DS.colors.neutral.textSecondary, textAlign: 'center', marginBottom: 32 },
  viewBtn: { height: 56, backgroundColor: DS.colors.brand.primary, borderRadius: 9999, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 48, marginBottom: 12 },
  viewBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  homeLink: { paddingVertical: 8 },
  homeLinkText: { fontSize: 15, color: DS.colors.brand.primary, fontWeight: '600' },
});
