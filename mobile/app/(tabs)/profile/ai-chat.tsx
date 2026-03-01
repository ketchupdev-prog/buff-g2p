/**
 * AI Assistant – Buffr G2P. §3.6.
 * Offline FAQ bot that matches user queries to known Buffr topics.
 * When backend is available, routes to /api/v1/mobile/ai-chat.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
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
import { designSystem } from '@/constants/designSystem';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  loading?: boolean;
}

// ─── Offline FAQ knowledge base ──────────────────────────────────────────────

interface FAQ { keywords: string[]; answer: string }

const FAQ_DB: FAQ[] = [
  {
    keywords: ['voucher', 'grant', 'redeem', 'collect', 'cash voucher'],
    answer: 'Your voucher can be redeemed in three ways:\n\n1. **Instant to wallet** — tap Vouchers → Redeem and it goes to your Buffr wallet immediately.\n2. **NamPost branch** — Book an appointment at any NamPost office and collect cash with your national ID.\n3. **SmartPay agent** — Get a redemption code in the app and show it at any SmartPay agent.\n\nVouchers expire after 90 days if not redeemed.',
  },
  {
    keywords: ['balance', 'how much', 'wallet balance', 'check balance'],
    answer: 'Your wallet balance is shown on the Home screen. Tap any wallet card to see its full balance and transaction history. Pull down to refresh your balance.',
  },
  {
    keywords: ['cash out', 'cash-out', 'withdraw', 'atm', 'withdraw cash'],
    answer: 'You can cash out from a wallet in 5 ways:\n\n• **Bank transfer** — N$5 fee, 1–2 business days\n• **At a till** — Free, instant at participating retailers\n• **Buffr Agent** — N$5 fee, show QR code\n• **Merchant** — N$3 fee at partnered shops\n• **ATM** — N$8 fee, cardless QR withdrawal\n\nOpen a wallet and tap "Cash Out" to get started.',
  },
  {
    keywords: ['send money', 'transfer', 'send funds', 'pay someone'],
    answer: 'To send money: tap "Send" on the Home screen, choose a contact or enter a phone number, enter the amount, and confirm with your PIN. The recipient will get the money instantly in their Buffr wallet.',
  },
  {
    keywords: ['pin', 'forgot pin', 'change pin', 'reset pin'],
    answer: 'To change your PIN, go to Profile → Settings → Security → Change PIN. You\'ll need to enter your current PIN first. If you\'ve forgotten your PIN, contact Buffr support through Profile → Help & Support.',
  },
  {
    keywords: ['proof of life', 'identity', 'verify', 'verification', 'frozen', 'account frozen'],
    answer: 'Proof of life is a quarterly face verification required to keep your account active. You\'ll get a reminder 14 days before it\'s due. If your account is frozen, go to the notification or tap "Verify Now" on the home screen to complete it — the process takes under a minute.',
  },
  {
    keywords: ['loan', 'borrow', 'advance', 'emergency', 'cash advance'],
    answer: 'Buffr offers micro-loans of up to ⅓ of your last voucher value. To apply, go to Home → Loans → Apply. Loans carry 15% interest and are repaid automatically on your next voucher redemption. Check your eligibility in the Loans section.',
  },
  {
    keywords: ['bill', 'electricity', 'water', 'airtime', 'pay bill', 'nampower', 'namwater', 'mtc'],
    answer: 'To pay bills, tap "Bills" on the Home screen. You can pay:\n• Electricity (NamPower, City of Windhoek, Erongo RED)\n• Water (NamWater, municipal)\n• Airtime & data (MTC, Telecom, TN Mobile)\n• TV subscriptions (DStv, GOtv, Showmax)\n• Internet, insurance, government fees, and more.',
  },
  {
    keywords: ['agent', 'find agent', 'nearby', 'location', 'nampost', 'atm', 'where'],
    answer: 'To find a Buffr Agent, NamPost branch, or ATM near you, go to Home → Agents. You\'ll see a map and list of nearby locations with distance, hours, and available services. Tap "Directions" to open navigation.',
  },
  {
    keywords: ['security', 'scam', 'fraud', 'safe', 'protect', 'suspicious'],
    answer: 'Buffr will NEVER ask for your PIN, password, or OTP via phone, SMS, or email. Always verify you\'re on the official Buffr app. If you receive suspicious messages, do not share any codes. Report fraud through Profile → Help & Support.',
  },
  {
    keywords: ['group', 'savings group', 'stokvel', 'family', 'community'],
    answer: 'Groups let you pool money with family or a savings circle. Go to Home → Groups → Create to start a group. You can set a contribution schedule, invite members, and track the group balance together.',
  },
  {
    keywords: ['add money', 'top up', 'deposit', 'fund wallet'],
    answer: 'To add money to your wallet, open the wallet from the Home screen and tap "Add Money". You can add via:\n• Bank transfer (EFT)\n• Another Buffr wallet\n• Merchant payment\n\nMoney appears instantly for Buffr-to-Buffr transfers.',
  },
  {
    keywords: ['notification', 'alert', 'push notification', 'sms'],
    answer: 'Buffr sends push notifications for voucher arrivals, payments received, and security alerts. Manage notification preferences in Profile → Settings → Notifications. Make sure notifications are enabled in your phone settings.',
  },
  {
    keywords: ['contact', 'support', 'help', 'customer service', 'problem', 'issue'],
    answer: 'Need help? Go to Profile → Help & Support or call Buffr support at +264 81 437 6202 (Mon–Fri, 08:00–17:00). You can also email ichigo@ketchup.cc or chat with us here anytime.',
  },
];

const WELCOME = 'Hi! I\'m the Buffr assistant. Ask me about:\n• Vouchers & grants\n• Cash out & withdrawals\n• Bills & airtime\n• Loans\n• Security & PIN\n• Finding agents & ATMs\n\nHow can I help?';

const FALLBACK = 'I\'m not sure about that yet. For specific account issues, contact Buffr support at +264 81 437 6202 or email ichigo@ketchup.cc.\n\nYou can also try asking about: vouchers, cash out, bills, loans, agents, or security.';

function findAnswer(query: string): string {
  const q = query.toLowerCase();
  for (const faq of FAQ_DB) {
    if (faq.keywords.some(k => q.includes(k))) return faq.answer;
  }
  return FALLBACK;
}

async function getAIResponse(query: string): Promise<string> {
  if (API_BASE_URL) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/ai-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query }),
      });
      if (res.ok) {
        const data = (await res.json()) as { reply?: string };
        if (data.reply) return data.reply;
      }
    } catch { /* fall through */ }
  }
  // Simulate a short delay to feel natural
  await new Promise(r => setTimeout(r, 700 + Math.random() * 600));
  return findAnswer(query);
}

// ─── Component ────────────────────────────────────────────────────────────────

const QUICK_QUESTIONS = [
  'How do I redeem a voucher?',
  'How do I cash out?',
  'How do I pay a bill?',
  'Where can I find an agent?',
];

export default function ProfileAiChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'bot', text: WELCOME },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const send = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setInput('');
    setBusy(true);

    const userMsg: ChatMessage = { id: `u${Date.now()}`, role: 'user', text: q };
    const loadingMsg: ChatMessage = { id: `l${Date.now()}`, role: 'bot', text: '...', loading: true };
    setMessages(prev => [...prev, userMsg, loadingMsg]);

    const answer = await getAIResponse(q);

    setMessages(prev => [
      ...prev.filter(m => !m.loading),
      { id: `b${Date.now()}`, role: 'bot', text: answer },
    ]);
    setBusy(false);
  }, [busy]);

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundFallback} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={designSystem.colors.neutral.text} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <View style={styles.botDot} />
            <View>
              <Text style={styles.headerTitle}>Buffr Assistant</Text>
              <Text style={styles.headerSub}>Always available · Replies instantly</Text>
            </View>
          </View>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.messages}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((m) => (
              <View key={m.id} style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleBot]}>
                {m.loading ? (
                  <View style={styles.typingDots}>
                    <View style={styles.typingDot} />
                    <View style={[styles.typingDot, { opacity: 0.6 }]} />
                    <View style={[styles.typingDot, { opacity: 0.3 }]} />
                  </View>
                ) : (
                  <Text style={[styles.bubbleText, m.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextBot]}>
                    {m.text}
                  </Text>
                )}
              </View>
            ))}

            {/* Quick questions shown when only welcome is visible */}
            {messages.length === 1 && (
              <View style={styles.quickWrap}>
                {QUICK_QUESTIONS.map((q) => (
                  <TouchableOpacity
                    key={q}
                    style={styles.quickChip}
                    onPress={() => send(q)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.quickChipText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={{ height: 8 }} />
          </ScrollView>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Ask anything about Buffr..."
              placeholderTextColor={designSystem.colors.neutral.textTertiary}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
              editable={!busy}
              returnKeyType="send"
              onSubmitEditing={() => send(input)}
              blurOnSubmit
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || busy) && styles.sendBtnDisabled]}
              onPress={() => send(input)}
              disabled={!input.trim() || busy}
              activeOpacity={0.8}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  backgroundFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: designSystem.colors.neutral.background },
  safe: { flex: 1 },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: designSystem.spacing.g2p.horizontalPadding,
    paddingVertical: designSystem.spacing.g2p.verticalPadding,
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.neutral.border,
    backgroundColor: designSystem.colors.neutral.surface,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  botDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: designSystem.colors.brand.primary, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...designSystem.typography.textStyles.body, fontWeight: '700', color: designSystem.colors.neutral.text },
  headerSub: { ...designSystem.typography.textStyles.caption, color: designSystem.colors.semantic.success, marginTop: 1 },

  messages: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 8 },

  bubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: designSystem.colors.brand.primary,
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    alignSelf: 'flex-start',
    backgroundColor: designSystem.colors.neutral.surface,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { color: '#fff' },
  bubbleTextBot: { color: designSystem.colors.neutral.text },

  typingDots: { flexDirection: 'row', gap: 5, alignItems: 'center', paddingVertical: 4 },
  typingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: designSystem.colors.neutral.textTertiary },

  quickWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  quickChip: {
    backgroundColor: designSystem.colors.brand.primaryMuted,
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: designSystem.colors.brand.primary + '40',
  },
  quickChipText: { fontSize: 13, fontWeight: '600', color: designSystem.colors.brand.primary },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: 24,
    backgroundColor: designSystem.colors.neutral.surface,
    borderTopWidth: 1,
    borderTopColor: designSystem.colors.neutral.border,
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: designSystem.colors.neutral.background,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: designSystem.colors.neutral.text,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: designSystem.colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.45 },
});
