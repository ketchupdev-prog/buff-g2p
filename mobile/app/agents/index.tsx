/**
 * Agent Network – Buffr G2P.
 * §3.4. List of agents; link to map (nearby). Cash-out at agent uses NAMQR scan.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useUser } from '@/contexts/UserContext';
import { designSystem } from '@/constants/designSystem';
import { AppHeader } from '@/components/layout';
import * as Location from 'expo-location';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

interface Agent {
  id: string;
  name: string;
  address: string;
  phone?: string;
  hours?: string;
  distance?: number;
  latitude?: number;
  longitude?: number;
  services?: string[];
}

async function fetchNearbyAgents(latitude?: number, longitude?: number): Promise<Agent[]> {
  if (!API_BASE_URL) return [];
  
  try {
    let url = `${API_BASE_URL}/api/v1/mobile/agents/nearby`;
    if (latitude && longitude) {
      url += `?lat=${latitude}&lng=${longitude}&radius=10000`;
    }
    
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return data.agents || [];
    }
  } catch (e) {
    console.error('fetchNearbyAgents error:', e);
  }
  return [];
}

export default function AgentsIndexScreen() {
  const { profile } = useUser();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const loadAgents = useCallback(async () => {
    try {
      // Try to get user's location for proximity sorting
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        const data = await fetchNearbyAgents(loc.coords.latitude, loc.coords.longitude);
        setAgents(data);
      } else {
        const data = await fetchNearbyAgents();
        setAgents(data);
      }
    } catch (e) {
      console.error('loadAgents error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadAgents(); }, [loadAgents]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAgents();
  }, [loadAgents]);

  // Filter agents by search query
  const filteredAgents = search.trim()
    ? agents.filter(a => 
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.address.toLowerCase().includes(search.toLowerCase())
      )
    : agents;

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundFallback} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <AppHeader
          searchPlaceholder="Search area or agent..."
          searchValue={search}
          onSearchChange={setSearch}
          showSearch
          showBackButton
          onBackPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as never))}
          onNotificationPress={() => router.push('/(tabs)/profile/notifications' as never)}
          onAvatarPress={() => router.push('/(tabs)/profile' as never)}
          avatarUri={profile?.photoUri ?? null}
          notificationBadge
        />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={designSystem.colors.brand.primary} />}
        >
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Nearby agents</Text>
            <TouchableOpacity onPress={() => router.push('/agents/nearby' as never)} accessibilityLabel="View map">
              <Text style={styles.mapLink}>Map</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>Visit an agent to cash out. Show your app and scan their QR to pay.</Text>
          
          {loading ? (
            <ActivityIndicator color={designSystem.colors.brand.primary} style={{ marginTop: 40 }} />
          ) : filteredAgents.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={48} color={designSystem.colors.neutral.textTertiary} />
              <Text style={styles.emptyText}>
                {search.trim() ? 'No agents found matching your search' : 'No agents found nearby'}
              </Text>
            </View>
          ) : (
            filteredAgents.map((agent) => (
              <TouchableOpacity key={agent.id} style={styles.card} activeOpacity={0.8}>
                <View style={styles.iconWrap}>
                  <Ionicons name="storefront-outline" size={24} color={designSystem.colors.brand.primary} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardName}>{agent.name}</Text>
                  <Text style={styles.cardAddress}>{agent.address}</Text>
                  {agent.distance && (
                    <Text style={styles.distanceText}>
                      {agent.distance < 1000 
                        ? `${agent.distance}m away` 
                        : `${(agent.distance / 1000).toFixed(1)}km away`}
                    </Text>
                  )}
                  {agent.hours && (
                    <View style={styles.badgeWrap}>
                      <View style={styles.badge} />
                      <Text style={styles.badgeText}>{agent.hours}</Text>
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color={designSystem.colors.neutral.textTertiary} />
              </TouchableOpacity>
            ))
          )}
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
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sectionTitle: { ...designSystem.typography.textStyles.titleSm, color: designSystem.colors.neutral.text },
  mapLink: { ...designSystem.typography.textStyles.bodySm, fontWeight: '600', color: designSystem.colors.brand.primary },
  scroll: { flex: 1 },
  scrollContent: { padding: designSystem.spacing.g2p.horizontalPadding, paddingTop: 8 },
  hint: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.textSecondary, marginBottom: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designSystem.colors.neutral.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral.border,
    padding: 16,
    marginBottom: 12,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: designSystem.colors.brand.primaryMuted, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  cardBody: { flex: 1, minWidth: 0 },
  cardName: { ...designSystem.typography.textStyles.body, fontWeight: '600', color: designSystem.colors.neutral.text },
  cardAddress: { ...designSystem.typography.textStyles.bodySm, color: designSystem.colors.neutral.textSecondary, marginTop: 2 },
  distanceText: { ...designSystem.typography.textStyles.caption, color: designSystem.colors.brand.primary, marginTop: 4, fontWeight: '600' },
  badgeWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  badge: { width: 8, height: 8, borderRadius: 4, backgroundColor: designSystem.colors.semantic.success },
  badgeOpen: { backgroundColor: designSystem.colors.semantic.success },
  badgeClosed: { backgroundColor: designSystem.colors.neutral.textTertiary },
  badgeText: { ...designSystem.typography.textStyles.caption, color: designSystem.colors.neutral.textSecondary },
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyText: { ...designSystem.typography.textStyles.body, color: designSystem.colors.neutral.textSecondary, textAlign: 'center', marginTop: 16 },
});
