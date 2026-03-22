/**
 * Cards View – Buffr G2P. §3.4 screen 34b.
 * Figma-aligned: single-card view with horizontal swipe between Buffr Card and linked bank cards.
 * Header: back, "Card" title, + (add card). Each slide: card name, card visual, CVV row, Remove/Change/Edit.
 * Pagination dots + "Swipe right to see other Cards" when multiple cards.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useUser } from '@/contexts/UserContext';
import { designSystem } from '@/constants/designSystem';
import CardFrame from '@/components/cards/CardFrame';
import { LinkedCardView } from '@/components/cards/LinkedCardView';
import { getWallets } from '@/services/wallets';
import { deleteCard } from '@/services/cards';
import { usePullToRefresh } from '@/hooks';

const DS = designSystem;
const CARD_BUTTON_HEIGHT = 52;
const CARD_BORDER_RADIUS = 16;

interface LinkedCard {
  id: string;
  label: string;
  last4: string;
  brand: string;
}

type CardItem =
  | { type: 'buffr'; id: string; userName: string; cardNumber: string; expiryDate: string }
  | { type: 'linked'; linked: LinkedCard; userName: string };

export default function CardsScreen() {
  const { profile, cardNumberMasked, expiryDate } = useUser();
  const [linkedCards, setLinkedCards] = useState<LinkedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cvvVisible, setCvvVisible] = useState<Record<string, boolean>>({});
  const [removingId, setRemovingId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList<CardItem>>(null);
  const { width: screenWidth } = Dimensions.get('window');

  const displayName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'Buffr User';

  const load = useCallback(async () => {
    try {
      const wallets = await getWallets();
      const cards: LinkedCard[] = [];
      wallets.forEach((w) => {
        w.linkedCards?.forEach((lc) => {
          if (!cards.find((c) => c.id === lc.id)) {
            cards.push({ id: lc.id, label: lc.label, last4: lc.last4, brand: lc.brand });
          }
        });
      });
      setLinkedCards(cards);
    } catch (e) {
      console.error('CardsScreen load:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const { refreshing, onRefresh } = usePullToRefresh({ onRefresh: load });
  useEffect(() => {
    load();
  }, [load]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const data: CardItem[] = [
    {
      type: 'buffr',
      id: 'buffr',
      userName: displayName,
      cardNumber: cardNumberMasked ?? '•••• •••• •••• ••••',
      expiryDate: expiryDate ?? '••/••',
    },
    ...linkedCards.map((linked) => ({
      type: 'linked' as const,
      linked,
      userName: displayName,
    })),
  ];

  const onMomentumScrollEnd = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
    setCurrentIndex(Math.min(index, data.length - 1));
  };

  const toggleCvv = (cardId: string) => {
    setCvvVisible((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  const handleRemove = async () => {
    if (!currentCard || currentCard.type === 'buffr') return;
    const id = currentCard.linked.id;
    setRemovingId(id);
    const result = await deleteCard(id);
    setRemovingId(null);
    if (result.success) {
      await load();
      if (currentIndex >= data.length - 1 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    } else {
      alert(result.error ?? 'Could not remove card');
    }
  };

  const handleChange = () => {
    router.push('/add-card' as never);
  };

  const currentCard = data[currentIndex];
  const isBuffr = currentCard?.type === 'buffr';
  const currentId = currentCard?.type === 'buffr' ? currentCard.id : currentCard?.linked?.id;
  const isRemoving = currentId != null && removingId === currentId;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header: back, Card, + */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerBtn}
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={24} color={DS.colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Card</Text>
          <TouchableOpacity
            onPress={() => router.push('/add-card' as never)}
            style={styles.headerBtn}
            accessibilityLabel="Add card"
          >
            <Ionicons name="add" size={24} color={DS.colors.neutral.text} />
          </TouchableOpacity>
        </View>

        {loading && data.length <= 1 ? (
          <View style={styles.centered}>
            <Text style={styles.hint}>Loading cards...</Text>
          </View>
        ) : data.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.hint}>No cards yet</Text>
            <TouchableOpacity
              style={styles.addCardCta}
              onPress={() => router.push('/add-card' as never)}
            >
              <Text style={styles.addCardCtaText}>+ Add card</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Card title for current slide */}
            <Text style={styles.cardTitle}>
              {currentCard?.type === 'buffr' ? 'Buffr Card' : currentCard?.linked.label}
            </Text>

            <FlatList
              ref={flatListRef}
              data={data}
              keyExtractor={(item) => (item.type === 'buffr' ? item.id : item.linked.id)}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onMomentumScrollEnd}
              snapToInterval={screenWidth}
              snapToAlignment="center"
              decelerationRate="fast"
              contentContainerStyle={styles.carouselContent}
              renderItem={({ item }) => (
                <View style={[styles.slide, { width: screenWidth }]}>
                  {item.type === 'buffr' ? (
                    <CardFrame
                      userName={item.userName}
                      cardNumber={item.cardNumber}
                      expiryDate={item.expiryDate}
                    />
                  ) : (
                    <LinkedCardView
                      label={item.linked.label}
                      userName={item.userName}
                      last4={item.linked.last4}
                      brand={item.linked.brand}
                    />
                  )}
                </View>
              )}
            />

            {/* CVV row – Buffr card has no CVV; linked cards show masked (backend may expose reveal later). */}
            <View style={styles.cvvRow}>
              <View style={styles.cvvField}>
                <Text style={styles.cvvText}>
                  {isBuffr ? '—' : (currentId && cvvVisible[currentId] ? '•••' : 'CVV •••')}
                </Text>
              </View>
              {!isBuffr && (
                <TouchableOpacity
                  style={styles.showBtn}
                  onPress={() => currentId && toggleCvv(currentId)}
                >
                  <Text style={styles.showBtnText}>
                    {currentId && cvvVisible[currentId] ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Remove (linked only), Change, Edit */}
            <View style={styles.actionsRow}>
              {!isBuffr && currentCard?.type === 'linked' && (
                <TouchableOpacity
                  style={[styles.removeBtn, isRemoving && styles.btnDisabled]}
                  onPress={handleRemove}
                  disabled={isRemoving}
                >
                  <Text style={styles.removeBtnText}>{isRemoving ? 'Removing…' : 'Remove'}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.changeBtn} onPress={handleChange}>
                <Text style={styles.changeBtnText}>Change</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => {
                  if (isBuffr) return;
                  alert('Edit card label is not available yet.');
                }}
              >
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>

            {/* Pagination + swipe hint when multiple cards */}
            {data.length > 1 && (
              <View style={styles.pagination}>
                <View style={styles.dots}>
                  {data.map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.dot,
                        i === currentIndex ? styles.dotActive : styles.dotInactive,
                      ]}
                    />
                  ))}
                </View>
                <Text style={styles.swipeHint}>Swipe right to see other Cards</Text>
              </View>
            )}
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: DS.colors.neutral.background,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: DS.colors.neutral.border,
    backgroundColor: DS.colors.neutral.surface,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DS.colors.neutral.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...DS.typography.textStyles.title,
    color: DS.colors.neutral.text,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  hint: {
    ...DS.typography.textStyles.body,
    color: DS.colors.neutral.textSecondary,
    marginBottom: 16,
  },
  addCardCta: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: DS.colors.brand.primary,
    borderRadius: CARD_BORDER_RADIUS,
  },
  addCardCtaText: {
    ...DS.typography.textStyles.body,
    fontWeight: '600',
    color: DS.colors.neutral.surface,
  },
  cardTitle: {
    ...DS.typography.textStyles.titleLg,
    color: DS.colors.neutral.text,
    marginTop: 20,
    marginBottom: 16,
    marginHorizontal: 20,
  },
  carouselContent: {
    paddingHorizontal: 0,
  },
  slide: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 26,
  },
  cvvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 24,
    gap: 12,
  },
  cvvField: {
    flex: 1,
    height: 52,
    borderRadius: CARD_BORDER_RADIUS,
    backgroundColor: DS.colors.neutral.border,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  cvvText: {
    ...DS.typography.textStyles.body,
    color: DS.colors.neutral.textSecondary,
  },
  showBtn: {
    height: 52,
    paddingHorizontal: 20,
    borderRadius: CARD_BORDER_RADIUS,
    backgroundColor: DS.colors.neutral.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  showBtnText: {
    ...DS.typography.textStyles.body,
    fontWeight: '600',
    color: DS.colors.neutral.text,
  },
  actionsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },
  removeBtn: {
    flex: 1,
    height: CARD_BUTTON_HEIGHT,
    borderRadius: CARD_BORDER_RADIUS,
    backgroundColor: DS.colors.feedback?.red100 ?? '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  removeBtnText: {
    ...DS.typography.textStyles.body,
    fontWeight: '600',
    color: DS.colors.semantic.error,
  },
  changeBtn: {
    flex: 1,
    height: CARD_BUTTON_HEIGHT,
    borderRadius: CARD_BORDER_RADIUS,
    backgroundColor: DS.colors.neutral.surface,
    borderWidth: 1,
    borderColor: DS.colors.neutral.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeBtnText: {
    ...DS.typography.textStyles.body,
    fontWeight: '600',
    color: DS.colors.neutral.text,
  },
  editBtn: {
    flex: 1,
    height: CARD_BUTTON_HEIGHT,
    borderRadius: CARD_BORDER_RADIUS,
    backgroundColor: DS.colors.neutral.text,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtnText: {
    ...DS.typography.textStyles.body,
    fontWeight: '600',
    color: DS.colors.neutral.surface,
  },
  pagination: {
    marginTop: 28,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: DS.colors.neutral.text,
  },
  dotInactive: {
    backgroundColor: DS.colors.neutral.border,
  },
  swipeHint: {
    ...DS.typography.textStyles.caption,
    color: DS.colors.neutral.textSecondary,
  },
});
