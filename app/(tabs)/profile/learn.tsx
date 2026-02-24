/**
 * Financial Literacy – Buffr G2P.
 * §3.6 Learn. Expandable in-app articles for saving, vouchers, cash-out, security.
 */
import React, { useState } from 'react';
import { Animated, LayoutAnimation, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

interface Article {
  id: string;
  title: string;
  desc: string;
  icon: string;
  readMin: number;
  sections: Array<{ heading: string; body: string }>;
}

const ARTICLES: Article[] = [
  {
    id: 'vouchers',
    title: 'Understanding your vouchers',
    desc: 'How grants work and when they arrive',
    icon: 'gift-outline',
    readMin: 3,
    sections: [
      {
        heading: 'What is a Buffr voucher?',
        body: 'A Buffr voucher is a digital representation of your government grant (e.g. Child Support Grant, Old Age Pension, Disability Grant). Instead of queuing at a pay point, your grant arrives directly in the Buffr app as a voucher you can redeem anytime within 90 days.',
      },
      {
        heading: 'When do vouchers arrive?',
        body: 'Vouchers are issued by the Social Security Commission (SSC) on your scheduled payment date. You\'ll receive a push notification as soon as your voucher is ready. Most grants are paid on the 1st–5th of each month.',
      },
      {
        heading: 'How to redeem your voucher',
        body: '1. Tap "Vouchers" on the home screen.\n2. Select the voucher you want to redeem.\n3. Choose a redemption method:\n   • Wallet – instant, no fees\n   • NamPost branch – book an appointment, collect cash\n   • SmartPay agent – get a code, present at agent\n\nAlways bring your national ID when collecting cash.',
      },
      {
        heading: 'What happens if it expires?',
        body: 'Unused vouchers expire after 90 days. Once expired, contact the SSC or your social worker to have the grant reissued. Buffr cannot extend expiry dates – always redeem on time.',
      },
    ],
  },
  {
    id: 'wallet',
    title: 'Your Buffr wallet',
    desc: 'Balance, add money, and cash-out options',
    icon: 'wallet-outline',
    readMin: 2,
    sections: [
      {
        heading: 'What is the Buffr wallet?',
        body: 'Your Buffr wallet is a secure digital account that holds your money after you redeem a voucher or receive a payment. You can have multiple wallets for different purposes (e.g. household, savings, school fees).',
      },
      {
        heading: 'Checking your balance',
        body: 'Open the Buffr app and look at the Home screen. Each wallet card shows its current balance. Tap a wallet to see a full transaction history. Pull down on the home screen to refresh your balance.',
      },
      {
        heading: 'Adding money',
        body: 'You can add money to your wallet by:\n• Redeeming a voucher\n• Receiving a payment from another Buffr user\n• Bank transfer (EFT from any Namibian bank)\n\nBank transfers may take 1–2 business days to reflect.',
      },
      {
        heading: 'Keeping it safe',
        body: 'Your wallet is protected by your 6-digit PIN and biometric verification. Never share your PIN with anyone, including Buffr staff. Enable Face ID or fingerprint login for extra security.',
      },
    ],
  },
  {
    id: 'cashout',
    title: 'Cashing out safely',
    desc: 'Agents, NamPost, ATMs, and mobile units',
    icon: 'cash-outline',
    readMin: 4,
    sections: [
      {
        heading: 'Your cash-out options',
        body: 'Buffr gives you 5 ways to turn your digital balance into cash:\n\n• Bank transfer – N$5 fee, 1–2 days\n• Retailer till – Free, instant\n• Buffr Agent – N$5 fee, instant\n• Merchant – N$3 fee, instant\n• ATM (cardless) – N$8 fee, instant\n\nChoose the method that suits your situation and location.',
      },
      {
        heading: 'At a Buffr Agent',
        body: '1. Tap "Cash Out" in your wallet.\n2. Select "Buffr Agent".\n3. Enter the amount and confirm with your PIN.\n4. A QR code appears on your screen.\n5. Show it to the agent – they scan it and give you cash.\n\nAlways count your cash before leaving the agent.',
      },
      {
        heading: 'Cardless ATM withdrawal',
        body: '1. Tap "Cash Out" → "ATM".\n2. Enter amount and confirm PIN.\n3. At the ATM, select "Cardless" or "QR withdrawal".\n4. Scan the QR code shown in your app.\n5. The ATM dispenses cash.\n\nThe QR code expires in 5 minutes – only generate it when you\'re at the machine.',
      },
      {
        heading: 'Staying safe when cashing out',
        body: '• Only cash out in safe, well-lit locations.\n• Shield your phone screen from others.\n• Count your cash discreetly.\n• Never let anyone help you operate the ATM.\n• If pressured or threatened, walk away and call 10111.',
      },
    ],
  },
  {
    id: 'saving',
    title: 'Saving tips',
    desc: 'Simple ways to set money aside',
    icon: 'trending-up-outline',
    readMin: 3,
    sections: [
      {
        heading: 'Why saving matters',
        body: 'Even small amounts saved regularly can protect you from emergencies and help you reach goals. With Buffr, you can create a dedicated savings wallet so your saved money stays separate from your spending money.',
      },
      {
        heading: 'The 50/30/20 rule',
        body: 'A simple budgeting guide:\n• 50% – Needs (food, rent, electricity, transport)\n• 30% – Wants (airtime, entertainment)\n• 20% – Save\n\nFor a N$750 grant: save at least N$150 each month.',
      },
      {
        heading: 'Using Auto Pay to save automatically',
        body: 'When you create a savings wallet, turn on "Auto Pay" to automatically move a set amount from your main wallet to your savings wallet each month. Set it and forget it – your savings grow without effort.',
      },
      {
        heading: 'Group savings (stokvel)',
        body: 'Join or create a savings group in Buffr. Each member contributes a fixed amount, and members take turns receiving the full pot. Go to Home → Groups to start or join one. Digital groups reduce the risk of cash mishandling.',
      },
    ],
  },
  {
    id: 'security',
    title: 'Keeping your account safe',
    desc: 'PIN, proof of life, and avoiding scams',
    icon: 'shield-checkmark-outline',
    readMin: 4,
    sections: [
      {
        heading: 'Your PIN is your key',
        body: 'Your 6-digit PIN authorises all transactions. Choose a PIN that\'s not obvious (avoid 123456, birth year, etc.).\n\n• Never share your PIN – not even with Buffr staff\n• Change it immediately if you think it\'s been seen\n• To change: Profile → Settings → Change PIN',
      },
      {
        heading: 'Proof of life',
        body: 'Every 90 days, Buffr requires a quick face scan to confirm you\'re still the account holder. This prevents fraud and protects your grant. You\'ll get a reminder 14 days before it\'s due. Missing it for 120 days will temporarily freeze your wallet.',
      },
      {
        heading: 'Recognising scams',
        body: 'Common scams targeting grant recipients:\n\n• "Your grant is on hold, send me your PIN" – SCAM\n• Fake SMS with a link asking for your details – SCAM\n• Someone offering to help you collect your grant for a fee – SCAM\n\nBuffr will NEVER ask for your PIN, OTP, or password. Report scams to 061-000-0000.',
      },
      {
        heading: 'If your phone is lost or stolen',
        body: '1. Log into another device using your phone number and OTP.\n2. Go to Profile → Settings → Security → Lock Account.\n3. Contact Buffr support immediately at 061-000-0000.\n\nYour money is safe in your account – a thief cannot access it without your PIN and face verification.',
      },
    ],
  },
];

export default function LearnScreen() {
  const [openId, setOpenId] = useState<string | null>(null);

  function toggle(id: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenId(prev => prev === id ? null : id);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundFallback} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={designSystem.colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Financial Literacy</Text>
        </View>

        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.intro}>
            Short guides to help you get the most from Buffr. Tap any topic to read.
          </Text>

          {ARTICLES.map((article) => {
            const isOpen = openId === article.id;
            return (
              <View key={article.id} style={[styles.card, isOpen && styles.cardOpen]}>
                {/* Header row */}
                <TouchableOpacity
                  style={styles.cardHeader}
                  activeOpacity={0.8}
                  onPress={() => toggle(article.id)}
                >
                  <View style={[styles.iconWrap, isOpen && styles.iconWrapOpen]}>
                    <Ionicons
                      name={article.icon as never}
                      size={22}
                      color={isOpen ? '#fff' : designSystem.colors.brand.primary}
                    />
                  </View>
                  <View style={styles.cardMeta}>
                    <Text style={styles.cardTitle}>{article.title}</Text>
                    <Text style={styles.cardDesc}>{article.desc}</Text>
                    <Text style={styles.readTime}>{article.readMin} min read</Text>
                  </View>
                  <Ionicons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={designSystem.colors.neutral.textTertiary}
                  />
                </TouchableOpacity>

                {/* Expanded content */}
                {isOpen && (
                  <View style={styles.articleContent}>
                    <View style={styles.articleDivider} />
                    {article.sections.map((s, i) => (
                      <View key={i} style={styles.section}>
                        <Text style={styles.sectionHeading}>{s.heading}</Text>
                        <Text style={styles.sectionBody}>{s.body}</Text>
                      </View>
                    ))}
                    <TouchableOpacity style={styles.doneBtn} onPress={() => toggle(article.id)} activeOpacity={0.8}>
                      <Ionicons name="checkmark-circle" size={18} color={designSystem.colors.brand.primary} />
                      <Text style={styles.doneBtnText}>Got it – Close</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  backgroundFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: designSystem.colors.neutral.background },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: designSystem.spacing.g2p.horizontalPadding,
    paddingVertical: designSystem.spacing.g2p.verticalPadding,
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.neutral.border,
    backgroundColor: designSystem.colors.neutral.surface,
  },
  backBtn: { padding: 4, marginRight: 12 },
  headerTitle: { ...designSystem.typography.textStyles.title, color: designSystem.colors.neutral.text },
  scroll: { flex: 1 },
  scrollContent: { padding: designSystem.spacing.g2p.horizontalPadding, paddingTop: 16 },
  intro: {
    ...designSystem.typography.textStyles.bodySm,
    color: designSystem.colors.neutral.textSecondary,
    marginBottom: 20,
  },

  card: {
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardOpen: {
    borderColor: designSystem.colors.brand.primary,
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: designSystem.colors.brand.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  iconWrapOpen: { backgroundColor: designSystem.colors.brand.primary },
  cardMeta: { flex: 1, minWidth: 0 },
  cardTitle: { ...designSystem.typography.textStyles.body, fontWeight: '700', color: designSystem.colors.neutral.text },
  cardDesc: { ...designSystem.typography.textStyles.caption, color: designSystem.colors.neutral.textSecondary, marginTop: 2 },
  readTime: { fontSize: 11, color: designSystem.colors.brand.primary, fontWeight: '600', marginTop: 4 },

  articleContent: { paddingHorizontal: 16, paddingBottom: 16 },
  articleDivider: { height: 1, backgroundColor: designSystem.colors.neutral.border, marginBottom: 16 },

  section: { marginBottom: 20 },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: designSystem.colors.neutral.text,
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 22,
    color: designSystem.colors.neutral.textSecondary,
  },

  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: designSystem.colors.brand.primaryMuted,
    marginTop: 4,
  },
  doneBtnText: { fontSize: 14, fontWeight: '700', color: designSystem.colors.brand.primary },
});
