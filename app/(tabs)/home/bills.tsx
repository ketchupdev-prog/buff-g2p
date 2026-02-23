/**
 * Pay Bills – Buffr G2P. §3.4. Bill categories.
 */
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import { designSystem } from '@/constants/designSystem';

const BILL_CATEGORIES = [
  { id: 'electricity', label: 'Electricity', icon: 'flash-outline' },
  { id: 'water', label: 'Water', icon: 'water-outline' },
  { id: 'airtime', label: 'Airtime', icon: 'phone-portrait-outline' },
  { id: 'other', label: 'Other bills', icon: 'document-text-outline' },
];

export default function BillsIndexScreen() {
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => { setRefreshing(true); setRefreshing(false); }, []);

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundFallback} />
      <LinearGradient colors={['#F3F4F6', '#fff', '#F9FAFB']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Pay Bills</Text>
        </View>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={designSystem.colors.neutral.textTertiary} style={styles.searchIcon} />
          <TextInput style={styles.searchInput} placeholder="Search billers..." placeholderTextColor={designSystem.colors.neutral.textTertiary} value={search} onChangeText={setSearch} />
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={designSystem.colors.brand.primary} />}>
          <Text style={styles.sectionTitle}>Categories</Text>
          {BILL_CATEGORIES.map((cat) => (
            <TouchableOpacity key={cat.id} style={styles.card} activeOpacity={0.8}>
              <View style={styles.iconWrap}><Ionicons name={cat.icon as never} size={24} color={designSystem.colors.brand.primary} /></View>
              <Text style={styles.cardLabel}>{cat.label}</Text>
              <Ionicons name="chevron-forward" size={20} color={designSystem.colors.neutral.textTertiary} />
            </TouchableOpacity>
          ))}
          <View style={{ height: 32 }} />
        </ScrollView>
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
  searchWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: designSystem.spacing.g2p.horizontalPadding, marginVertical: 12, paddingHorizontal: 16, height: 48, backgroundColor: designSystem.colors.neutral.surface, borderRadius: 9999, borderWidth: 1, borderColor: designSystem.colors.neutral.border },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, color: designSystem.colors.neutral.text },
  scroll: { flex: 1 },
  scrollContent: { padding: designSystem.spacing.g2p.horizontalPadding, paddingTop: 8 },
  sectionTitle: { ...designSystem.typography.textStyles.titleSm, color: designSystem.colors.neutral.text, marginBottom: 12 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: designSystem.colors.neutral.surface, borderRadius: 16, borderWidth: 1, borderColor: designSystem.colors.neutral.border, padding: 16, marginBottom: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: designSystem.colors.brand.primaryMuted, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  cardLabel: { flex: 1, ...designSystem.typography.textStyles.body, fontWeight: '600', color: designSystem.colors.neutral.text },
});
