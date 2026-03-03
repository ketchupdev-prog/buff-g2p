/**
 * AI tab – Buffr AI Companion. API and backend only; no mocks or hardcoded fallbacks.
 * Uses knowledge base and backend state; supports HITL (approve/deny). Streaming when backend exposes /chat/stream.
 * Location: mobile/app/(tabs)/ai/index.tsx
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  COMPANION_NOT_CONFIGURED,
  sendCompanionMessage,
  lastAssistantReply,
  type ChatResponseInterrupt,
  type CompanionError,
} from '@/services/companionApi';
import { designSystem } from '@/constants/designSystem';

const THREAD_STORAGE_KEY = 'buffr_companion_thread_id';

interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  loading?: boolean;
}

const WELCOME =
  "Hi! I'm the Buffr AI Companion. I use the backend and knowledge base to help with vouchers, cash out, bills, loans, and more. How can I help?";

async function getOrCreateThreadId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(THREAD_STORAGE_KEY);
    if (existing) return existing;
    const id = `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    await AsyncStorage.setItem(THREAD_STORAGE_KEY, id);
    return id;
  } catch {
    return `mobile-${Date.now()}`;
  }
}

function errorMessage(err: CompanionError): string {
  switch (err.code) {
    case 'NOT_CONFIGURED':
      return err.message;
    case 'NETWORK':
      return 'Connection failed. Check your network and try again.';
    case 'SERVER':
      return err.status === 503
        ? 'Companion service is starting. Please try again in a moment.'
        : err.message;
    case 'CLIENT':
      return err.message;
    default:
      return 'Something went wrong. Please try again.';
  }
}

export default function AiTabScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'bot', text: WELCOME },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState<ChatResponseInterrupt['approval_payload'] | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(
    async (text: string, isResume?: boolean) => {
      const q = text.trim();
      if (!isResume && !q) return;
      if (busy) return;

      setError(null);
      setPendingApproval(null);
      setBusy(true);

      const tid = threadId ?? (await getOrCreateThreadId());
      if (!threadId) setThreadId(tid);

      if (!isResume) {
        setInput('');
        const userMsg: ChatMessage = { id: `u${Date.now()}`, role: 'user', text: q };
        const loadingMsg: ChatMessage = { id: `l${Date.now()}`, role: 'bot', text: '...', loading: true };
        setMessages((prev) => [...prev, userMsg, loadingMsg]);
      }

      const result = await sendCompanionMessage(isResume ? null : q, tid, isResume);

      if ('error' in result) {
        setError(errorMessage(result.error));
        if (!isResume) {
          setMessages((prev) => prev.filter((m) => !m.loading));
        }
        setBusy(false);
        return;
      }

      const { data } = result;

      if (data.status === 'interrupt') {
        setPendingApproval(data.approval_payload ?? null);
        setMessages((prev) => [
          ...prev.filter((m) => !m.loading),
          {
            id: `b${Date.now()}`,
            role: 'bot',
            text: data.approval_payload?.summary_for_user ?? 'Please approve or deny this action.',
          },
        ]);
        setBusy(false);
        return;
      }

      const reply = lastAssistantReply(data);
      setMessages((prev) => [
        ...prev.filter((m) => !m.loading),
        { id: `b${Date.now()}`, role: 'bot', text: reply },
      ]);
      setBusy(false);
    },
    [busy, threadId]
  );

  const handleApprove = useCallback(() => {
    setPendingApproval(null);
    sendMessage('', true);
  }, [sendMessage]);

  const handleDeny = useCallback(() => {
    setPendingApproval(null);
    setBusy(true);
    const tid = threadId ?? '';
    if (!tid) {
      setBusy(false);
      return;
    }
    sendCompanionMessage(null, tid, false).then((res) => {
      setBusy(false);
      if ('error' in res) {
        setError(errorMessage(res.error));
        return;
      }
      if (res.data.status === 'ok') {
        const reply = lastAssistantReply(res.data);
        setMessages((prev) => [...prev, { id: `b${Date.now()}`, role: 'bot', text: reply }]);
      }
    });
  }, [threadId]);

  if (COMPANION_NOT_CONFIGURED) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Buffr AI Companion</Text>
            <Text style={styles.headerSub}>Not configured</Text>
          </View>
          <View style={styles.errorBlock}>
            <Ionicons name="warning-outline" size={48} color={designSystem.colors.semantic.error} />
            <Text style={styles.errorTitle}>Companion unavailable</Text>
            <Text style={styles.errorText}>
              Set EXPO_PUBLIC_BUFFR_AI_URL to your Buffr AI backend. No fallback or mocks are used.
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundFallback} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <View style={styles.botDot} />
            <View>
              <Text style={styles.headerTitle}>Buffr AI Companion</Text>
              <Text style={styles.headerSub}>Backend · Knowledge base · State</Text>
            </View>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
            <TouchableOpacity onPress={() => setError(null)} style={styles.errorBannerDismiss}>
              <Ionicons name="close" size={20} color={designSystem.colors.neutral.text} />
            </TouchableOpacity>
          </View>
        ) : null}

        {pendingApproval ? (
          <View style={styles.approvalBar}>
            <Text style={styles.approvalTitle}>Action requires your approval</Text>
            <Text style={styles.approvalSummary} numberOfLines={2}>
              {pendingApproval.summary_for_user ?? pendingApproval.action_type}
            </Text>
            <View style={styles.approvalActions}>
              <TouchableOpacity style={styles.approvalDeny} onPress={handleDeny} disabled={busy}>
                <Text style={styles.approvalDenyText}>Deny</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.approvalApprove} onPress={handleApprove} disabled={busy}>
                {busy ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.approvalApproveText}>Approve</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

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
              <View
                key={m.id}
                style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleBot]}
              >
                {m.loading ? (
                  <View style={styles.typingDots}>
                    <View style={styles.typingDot} />
                    <View style={[styles.typingDot, { opacity: 0.6 }]} />
                    <View style={[styles.typingDot, { opacity: 0.3 }]} />
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.bubbleText,
                      m.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextBot,
                    ]}
                  >
                    {m.text}
                  </Text>
                )}
              </View>
            ))}
            <View style={{ height: 8 }} />
          </ScrollView>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Ask about vouchers, cash out, bills, loans..."
              placeholderTextColor={designSystem.colors.neutral.textTertiary}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
              editable={!busy}
              returnKeyType="send"
              onSubmitEditing={() => sendMessage(input)}
              blurOnSubmit
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || busy) && styles.sendBtnDisabled]}
              onPress={() => sendMessage(input)}
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
  backgroundFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: designSystem.colors.neutral.background,
  },
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
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: {
    ...designSystem.typography.textStyles.body,
    fontWeight: '700',
    color: designSystem.colors.neutral.text,
  },
  headerSub: {
    ...designSystem.typography.textStyles.caption,
    color: designSystem.colors.semantic.success,
    marginTop: 1,
  },
  botDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: designSystem.colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  errorBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    ...designSystem.typography.textStyles.body,
    fontWeight: '700',
    color: designSystem.colors.neutral.text,
    marginTop: 16,
  },
  errorText: {
    ...designSystem.typography.textStyles.caption,
    color: designSystem.colors.neutral.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: designSystem.colors.semantic.error + '18',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: designSystem.colors.semantic.error + '40',
  },
  errorBannerText: { flex: 1, fontSize: 13, color: designSystem.colors.neutral.text },
  errorBannerDismiss: { padding: 4 },

  approvalBar: {
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: designSystem.colors.brand.primaryMuted,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: designSystem.colors.brand.primary + '40',
  },
  approvalTitle: { fontSize: 12, fontWeight: '700', color: designSystem.colors.brand.primary, marginBottom: 4 },
  approvalSummary: { fontSize: 14, color: designSystem.colors.neutral.text, marginBottom: 12 },
  approvalActions: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end' },
  approvalDeny: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
  },
  approvalDenyText: { fontSize: 14, fontWeight: '600', color: designSystem.colors.neutral.text },
  approvalApprove: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: designSystem.colors.brand.primary,
  },
  approvalApproveText: { fontSize: 14, fontWeight: '600', color: '#fff' },

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

  typingDots: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    paddingVertical: 4,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: designSystem.colors.neutral.textTertiary,
  },

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
