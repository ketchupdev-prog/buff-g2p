/**
 * AI Assistant – Buffr G2P. §3.6. Chat UI for beneficiary support.
 */
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';

export default function ProfileAiChatScreen() {
  const [message, setMessage] = useState('');

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundFallback} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <Text style={styles.headerSub}>Ask about vouchers, cash-out, or your account</Text>
        </View>
        <KeyboardAvoidingView style={styles.chatWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
          <ScrollView style={styles.messages} contentContainerStyle={styles.messagesContent} showsVerticalScrollIndicator={false}>
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-ellipses-outline" size={56} color={designSystem.colors.neutral.textTertiary} />
              <Text style={styles.emptyTitle}>Start a conversation</Text>
              <Text style={styles.emptyDesc}>Ask how to redeem a voucher, find an agent, or check your balance.</Text>
            </View>
          </ScrollView>
          <View style={styles.inputRow}>
            <TextInput style={styles.input} placeholder="Type your question..." placeholderTextColor={designSystem.colors.neutral.textTertiary} value={message} onChangeText={setMessage} multiline maxLength={500} />
            <TouchableOpacity style={styles.sendBtn} onPress={() => setMessage('')} accessibilityLabel="Send">
              <Ionicons name="send" size={22} color="#fff" />
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
  header: { paddingHorizontal: designSystem.spacing.g2p.horizontalPadding, paddingVertical: designSystem.spacing.g2p.verticalPadding, borderBottomWidth: 1, borderBottomColor: designSystem.colors.neutral.border, backgroundColor: designSystem.colors.neutral.surface },
  headerTitle: { ...designSystem.typography.textStyles.title, color: designSystem.colors.neutral.text },
  headerSub: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.textSecondary, marginTop: 4 },
  chatWrap: { flex: 1 },
  messages: { flex: 1 },
  messagesContent: { flexGrow: 1, padding: 16, justifyContent: 'center' },
  emptyState: { alignItems: 'center' },
  emptyTitle: { ...designSystem.typography.textStyles.titleSm, color: designSystem.colors.neutral.text, marginTop: 16 },
  emptyDesc: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 24 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 16, paddingBottom: 24, backgroundColor: designSystem.colors.neutral.surface, borderTopWidth: 1, borderTopColor: designSystem.colors.neutral.border },
  input: { flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: designSystem.colors.neutral.background, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 12, ...designSystem.typography.textStyles.body, color: designSystem.colors.neutral.text, marginRight: 12 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: designSystem.colors.brand.primary, justifyContent: 'center', alignItems: 'center' },
});
