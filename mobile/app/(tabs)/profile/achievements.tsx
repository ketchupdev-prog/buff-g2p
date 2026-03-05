/**
 * Achievements & Gamification Screen
 * 
 * Purpose: Display user points, level, achievements, and streaks
 * Location: mobile/app/(tabs)/profile/achievements.tsx
 * 
 * Features:
 * - Show total points and current level
 * - Display progress to next level
 * - Show earned achievements
 * - Show locked achievements
 * - Display current/longest streaks
 */

import { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { useUser } from '@/contexts/UserContext';
import {
  getGamificationStats,
  GamificationStats,
  ACHIEVEMENT_DEFINITIONS,
  AchievementDefinition,
  calculateLevel,
  progressToNextLevel,
  formatLevelName,
  getAchievementDefinition,
  hasAchievement,
  getLockedAchievements
} from '@/services/gamificationService';

export default function AchievementsScreen() {
  const { profile } = useUser();
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      loadStats();
    }
  }, [profile?.id]);

  const loadStats = async () => {
    if (!profile?.id) return;
    
    try {
      setLoading(true);
      const data = await getGamificationStats(profile.id);
      setStats(data);
    } catch (error) {
      console.error('Error loading gamification stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const renderAchievementCard = (achievement: AchievementDefinition, isLocked: boolean) => {
    const earned = stats?.achievements.find(a => a.id === achievement.id);
    
    return (
      <View
        key={achievement.id}
        className={`
          p-4 mb-3 rounded-xl border-2
          ${!isLocked ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 bg-gray-50'}
        `}
      >
        <View className="flex-row items-start">
          <Text className={`text-4xl mr-3 ${isLocked ? 'opacity-30' : ''}`}>
            {achievement.icon}
          </Text>
          
          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-1">
              <Text className={`text-base font-semibold ${isLocked ? 'text-gray-400' : 'text-gray-900'}`}>
                {achievement.name}
              </Text>
              <View className={`px-2 py-1 rounded ${isLocked ? 'bg-gray-200' : 'bg-yellow-200'}`}>
                <Text className={`text-xs font-bold ${isLocked ? 'text-gray-500' : 'text-yellow-700'}`}>
                  +{achievement.points} pts
                </Text>
              </View>
            </View>
            
            <Text className={`text-sm ${isLocked ? 'text-gray-400' : 'text-gray-600'}`}>
              {achievement.description}
            </Text>
            
            {!isLocked && earned && (
              <Text className="text-xs text-green-600 mt-2">
                ✓ Unlocked {new Date(earned.achievedAt).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-600">Loading achievements...</Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-6">
        <Text className="text-6xl mb-4">🏆</Text>
        <Text className="text-lg font-semibold text-gray-900 mb-2">No Stats Yet</Text>
        <Text className="text-sm text-gray-500 text-center">
          Start using Buffr to earn points and unlock achievements!
        </Text>
      </View>
    );
  }

  const progress = progressToNextLevel(stats.totalPoints, stats.currentLevel);
  const locked = getLockedAchievements(stats);

  return (
    <View className="flex-1 bg-gray-50">
      <Stack.Screen options={{ title: 'Achievements' }} />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="px-5 pt-6 pb-6">
          {/* Level Card */}
          <View className="bg-gradient-to-br from-blue-500 to-purple-600 p-6 rounded-2xl mb-6">
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-white/80 text-sm mb-1">Current Level</Text>
                <Text className="text-white text-3xl font-bold">
                  {formatLevelName(stats.currentLevel)}
                </Text>
              </View>
              
              <View className="bg-white/20 px-4 py-2 rounded-xl">
                <Text className="text-white text-2xl font-bold">
                  {stats.totalPoints}
                </Text>
                <Text className="text-white/80 text-xs">points</Text>
              </View>
            </View>
            
            {/* Progress Bar */}
            <View className="mb-2">
              <View className="flex-row justify-between mb-1">
                <Text className="text-white/80 text-xs">Progress to Level {stats.currentLevel + 1}</Text>
                <Text className="text-white text-xs font-semibold">{progress}%</Text>
              </View>
              
              <View className="h-2 bg-white/20 rounded-full overflow-hidden">
                <View 
                  className="h-full bg-white rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </View>
            </View>
          </View>
          
          {/* Streaks */}
          {(stats.currentStreak > 0 || stats.longestStreak > 0) && (
            <View className="bg-white p-4 rounded-xl mb-6 border border-gray-200">
              <Text className="text-lg font-semibold text-gray-900 mb-3">🔥 Streaks</Text>
              
              <View className="flex-row justify-around">
                <View className="items-center">
                  <Text className="text-2xl font-bold text-orange-500">{stats.currentStreak}</Text>
                  <Text className="text-xs text-gray-500">Current Streak</Text>
                </View>
                
                <View className="w-px bg-gray-200" />
                
                <View className="items-center">
                  <Text className="text-2xl font-bold text-purple-500">{stats.longestStreak}</Text>
                  <Text className="text-xs text-gray-500">Longest Streak</Text>
                </View>
              </View>
            </View>
          )}
          
          {/* Earned Achievements */}
          {stats.achievements.length > 0 && (
            <View className="mb-6">
              <Text className="text-xl font-bold text-gray-900 mb-3">
                🏆 Unlocked ({stats.achievements.length})
              </Text>
              
              {stats.achievements.map(earned => {
                const def = getAchievementDefinition(earned.id);
                return def ? renderAchievementCard(def, false) : null;
              })}
            </View>
          )}
          
          {/* Locked Achievements */}
          {locked.length > 0 && (
            <View>
              <Text className="text-xl font-bold text-gray-900 mb-3">
                🔒 Locked ({locked.length})
              </Text>
              
              {locked.map(def => renderAchievementCard(def, true))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
