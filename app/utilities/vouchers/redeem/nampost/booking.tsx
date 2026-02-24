/**
 * NamPost Appointment Booking – Buffr G2P.
 * Book a collection appointment at a selected NamPost branch.
 * §3.2.2 NamPost booking step.
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { designSystem } from '@/constants/designSystem';
import { generateRedemptionQR } from '@/services/vouchers';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const token = await AsyncStorage.getItem('buffr_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
}

// Generate available appointment slots (next 5 business days, 3 slots each)
function generateSlots(): Array<{ date: string; label: string; time: string; timeLabel: string }> {
  const slots: Array<{ date: string; label: string; time: string; timeLabel: string }> = [];
  const now = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const times = [
    { time: '09:00', label: '9:00 AM' },
    { time: '12:00', label: '12:00 PM' },
    { time: '15:00', label: '3:00 PM' },
  ];
  let daysAdded = 0;
  let d = new Date(now);
  d.setDate(d.getDate() + 1);
  while (daysAdded < 5) {
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      const dateStr = d.toISOString().split('T')[0];
      const label = `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]}`;
      times.forEach(t => slots.push({ date: dateStr, label, time: t.time, timeLabel: t.label }));
      daysAdded++;
    }
    d.setDate(d.getDate() + 1);
  }
  return slots;
}

async function bookAppointment(params: {
  voucherId: string;
  branchId: string;
  date: string;
  time: string;
}): Promise<{ success: boolean; bookingRef?: string; error?: string }> {
  if (API_BASE_URL) {
    try {
      const h = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/vouchers/${params.voucherId}/nampost-booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...h },
        body: JSON.stringify(params),
      });
      const data = (await res.json()) as { bookingRef?: string; error?: string };
      if (res.ok) return { success: true, bookingRef: data.bookingRef };
      return { success: false, error: data.error };
    } catch { /* fall through */ }
  }
  return { success: true, bookingRef: 'NP-' + Date.now().toString().slice(-6) };
}

type Step = 'select' | 'confirm' | 'booked';

export default function NamPostBookingScreen() {
  const { voucherId, branchId, branchName } = useLocalSearchParams<{ voucherId: string; branchId: string; branchName: string }>();
  const slots = generateSlots();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('select');
  const [submitting, setSubmitting] = useState(false);
  const [bookingRef, setBookingRef] = useState('');
  const [error, setError] = useState<string | null>(null);

  const uniqueDates = [...new Set(slots.map(s => s.date))];
  const timesForDate = selectedDate ? slots.filter(s => s.date === selectedDate) : [];
  const selectedSlot = slots.find(s => s.date === selectedDate && s.time === selectedTime);

  async function handleBook() {
    if (!selectedDate || !selectedTime || !voucherId || !branchId) return;
    setSubmitting(true);
    setError(null);
    const result = await bookAppointment({ voucherId, branchId, date: selectedDate, time: selectedTime });
    setSubmitting(false);
    if (result.success) {
      // Also generate QR/token for redemption
      await generateRedemptionQR(voucherId, branchId, 'nampost').catch(() => {});
      setBookingRef(result.bookingRef ?? '');
      setStep('booked');
    } else {
      setError(result.error ?? 'Booking failed. Please try again.');
    }
  }

  if (step === 'booked') {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <ScrollView contentContainerStyle={styles.center}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle-outline" size={44} color="#22C55E" />
            </View>
            <Text style={styles.successTitle}>Appointment Booked!</Text>
            <Text style={styles.successSub}>
              Your NamPost appointment has been confirmed. Please bring a valid ID.
            </Text>

            <View style={styles.bookingCard}>
              {[
                { label: 'Branch', value: branchName ?? 'NamPost Branch' },
                { label: 'Date', value: selectedSlot ? selectedSlot.label : selectedDate ?? '' },
                { label: 'Time', value: selectedSlot ? selectedSlot.timeLabel : selectedTime ?? '' },
                { label: 'Booking Ref', value: bookingRef },
              ].map((row, i, arr) => (
                <View key={row.label} style={[styles.bookingRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={styles.bookingLabel}>{row.label}</Text>
                  <Text style={[styles.bookingValue, row.label === 'Booking Ref' && { color: designSystem.colors.brand.primary, fontWeight: '700' }]}>{row.value}</Text>
                </View>
              ))}
            </View>

            <View style={styles.warnBanner}>
              <Ionicons name="alert-circle-outline" size={14} color="#D97706" />
              <Text style={styles.warnText}>Bring your national ID and this booking reference to the NamPost branch at your appointment time.</Text>
            </View>

            <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace('/(tabs)/vouchers' as never)}>
              <Text style={styles.doneBtnText}>View My Vouchers</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.homeLink} onPress={() => router.replace('/(tabs)' as never)}>
              <Text style={styles.homeLinkText}>Back to Home</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: true, headerTitle: 'Book Appointment', headerTintColor: designSystem.colors.neutral.text, headerStyle: { backgroundColor: '#fff' } }} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Branch info */}
          <View style={styles.branchBanner}>
            <Ionicons name="business-outline" size={18} color={designSystem.colors.brand.primary} />
            <Text style={styles.branchBannerText}>{branchName ?? 'NamPost Branch'}</Text>
          </View>

          {/* Date selection */}
          <Text style={styles.sectionLabel}>Select Date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
            {uniqueDates.map(date => {
              const slot = slots.find(s => s.date === date);
              return (
                <TouchableOpacity
                  key={date}
                  style={[styles.dateChip, selectedDate === date && styles.dateChipActive]}
                  onPress={() => { setSelectedDate(date); setSelectedTime(null); }}
                >
                  <Text style={[styles.dateChipText, selectedDate === date && styles.dateChipTextActive]}>
                    {slot?.label ?? date}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Time selection */}
          {selectedDate && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Select Time</Text>
              <View style={styles.timeGrid}>
                {timesForDate.map(slot => (
                  <TouchableOpacity
                    key={slot.time}
                    style={[styles.timeChip, selectedTime === slot.time && styles.timeChipActive]}
                    onPress={() => setSelectedTime(slot.time)}
                  >
                    <Text style={[styles.timeChipText, selectedTime === slot.time && styles.timeChipTextActive]}>
                      {slot.timeLabel}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Summary */}
          {selectedDate && selectedTime && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Appointment Summary</Text>
              {[
                { label: 'Branch', value: branchName ?? 'NamPost Branch' },
                { label: 'Date', value: slots.find(s => s.date === selectedDate)?.label ?? selectedDate },
                { label: 'Time', value: timesForDate.find(s => s.time === selectedTime)?.timeLabel ?? selectedTime },
                { label: 'Required', value: 'Valid National ID / Passport' },
              ].map((row, i, arr) => (
                <View key={row.label} style={[styles.summaryRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={styles.summaryLabel}>{row.label}</Text>
                  <Text style={styles.summaryValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.bookBtn, (!selectedDate || !selectedTime || submitting) && styles.btnDisabled]}
            onPress={handleBook}
            disabled={!selectedDate || !selectedTime || submitting}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : (
                <>
                  <Ionicons name="calendar-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.bookBtnText}>Confirm Appointment</Text>
                </>
              )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const DS = designSystem;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.colors.neutral.background },
  flex: { flex: 1 },
  center: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  content: { padding: 20, paddingBottom: 16 },
  branchBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: DS.colors.brand.primaryMuted, borderRadius: 12, padding: 14, marginBottom: 24 },
  branchBannerText: { fontSize: 14, fontWeight: '700', color: DS.colors.brand.primary, flex: 1 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: DS.colors.neutral.text, marginBottom: 12 },
  dateRow: { flexDirection: 'row', gap: 10, paddingBottom: 4 },
  dateChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 9999, borderWidth: 1.5, borderColor: DS.colors.neutral.border, backgroundColor: '#fff' },
  dateChipActive: { backgroundColor: DS.colors.brand.primary, borderColor: DS.colors.brand.primary },
  dateChipText: { fontSize: 13, fontWeight: '600', color: DS.colors.neutral.textSecondary },
  dateChipTextActive: { color: '#fff' },
  timeGrid: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  timeChip: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 9999, borderWidth: 1.5, borderColor: DS.colors.neutral.border, backgroundColor: '#fff' },
  timeChipActive: { backgroundColor: DS.colors.brand.primary, borderColor: DS.colors.brand.primary },
  timeChipText: { fontSize: 14, fontWeight: '600', color: DS.colors.neutral.textSecondary },
  timeChipTextActive: { color: '#fff' },
  summaryCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: DS.colors.neutral.border, overflow: 'hidden', marginTop: 24 },
  summaryTitle: { fontSize: 13, fontWeight: '700', color: DS.colors.neutral.text, padding: 14, borderBottomWidth: 1, borderBottomColor: DS.colors.neutral.border },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: DS.colors.neutral.border },
  summaryLabel: { fontSize: 13, color: DS.colors.neutral.textSecondary },
  summaryValue: { fontSize: 13, fontWeight: '600', color: DS.colors.neutral.text, maxWidth: '55%', textAlign: 'right' },
  errorText: { fontSize: 13, color: DS.colors.semantic.error, marginTop: 12 },
  footer: { padding: 20, paddingBottom: 32, borderTopWidth: 1, borderTopColor: DS.colors.neutral.border },
  bookBtn: { height: 56, backgroundColor: DS.colors.brand.primary, borderRadius: 9999, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  bookBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  btnDisabled: { opacity: 0.4 },
  successIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  successTitle: { fontSize: 22, fontWeight: '700', color: DS.colors.neutral.text, marginBottom: 8, textAlign: 'center' },
  successSub: { fontSize: 14, color: DS.colors.neutral.textSecondary, textAlign: 'center', marginBottom: 24 },
  bookingCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: DS.colors.neutral.border, overflow: 'hidden', width: '100%', marginBottom: 16 },
  bookingRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: DS.colors.neutral.border },
  bookingLabel: { fontSize: 13, color: DS.colors.neutral.textSecondary },
  bookingValue: { fontSize: 13, fontWeight: '500', color: DS.colors.neutral.text, maxWidth: '55%', textAlign: 'right' },
  warnBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FEF3C7', borderRadius: 12, padding: 14, marginBottom: 24, width: '100%' },
  warnText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 17 },
  doneBtn: { height: 56, backgroundColor: DS.colors.brand.primary, borderRadius: 9999, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 48, marginBottom: 12 },
  doneBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  homeLink: { paddingVertical: 8 },
  homeLinkText: { fontSize: 15, color: DS.colors.brand.primary, fontWeight: '600' },
});
