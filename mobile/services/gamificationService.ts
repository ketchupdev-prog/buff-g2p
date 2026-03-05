/**
 * Gamification Service
 * 
 * Purpose: Handle user achievements, points, levels, and streaks
 * Location: mobile/services/gamificationService.ts
 * 
 * Features:
 * - Track user points and levels
 * - Award achievements
 * - Calculate streaks
 * - Display progress
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
const GAMIFICATION_CACHE_KEY = '@gamification_cache';

export interface Achievement {
  id: string;
  achievedAt: string;
  progress: number;
  metadata?: any;
}

export interface GamificationStats {
  totalPoints: number;
  currentLevel: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate?: string;
  achievements: Achievement[];
}

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  category: 'transaction' | 'social' | 'milestone' | 'streak';
}

/**
 * Available achievements
 */
export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'first_voucher_redeemed',
    name: 'First Voucher',
    description: 'Redeemed your first voucher',
    icon: '🎟️',
    points: 50,
    category: 'milestone'
  },
  {
    id: 'first_send',
    name: 'First Send',
    description: 'Sent money for the first time',
    icon: '💸',
    points: 25,
    category: 'transaction'
  },
  {
    id: 'first_cashout',
    name: 'First Cash-Out',
    description: 'Withdrew cash for the first time',
    icon: '💵',
    points: 25,
    category: 'transaction'
  },
  {
    id: 'daily_login',
    name: 'Daily Check-In',
    description: 'Logged in today',
    icon: '✅',
    points: 5,
    category: 'streak'
  },
  {
    id: 'transaction_completed',
    name: 'Transaction Complete',
    description: 'Completed a transaction',
    icon: '✨',
    points: 10,
    category: 'transaction'
  },
  {
    id: 'profile_completed',
    name: 'Profile Master',
    description: 'Completed your profile',
    icon: '👤',
    points: 100,
    category: 'milestone'
  },
  {
    id: 'streak_7_days',
    name: '7-Day Streak',
    description: 'Active for 7 days in a row',
    icon: '🔥',
    points: 150,
    category: 'streak'
  },
  {
    id: 'streak_30_days',
    name: '30-Day Streak',
    description: 'Active for 30 days in a row',
    icon: '🏆',
    points: 500,
    category: 'streak'
  }
];

/**
 * Fetch gamification stats from backend
 */
export async function getGamificationStats(userId: string): Promise<GamificationStats | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/mobile/gamification/${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch stats: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Cache locally
    await AsyncStorage.setItem(GAMIFICATION_CACHE_KEY, JSON.stringify(data));
    
    return data;
  } catch (error) {
    console.error('Error fetching gamification stats:', error);
    
    // Try to return cached data
    try {
      const cached = await AsyncStorage.getItem(GAMIFICATION_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {}
    
    return null;
  }
}

/**
 * Record a gamification event (awards points, achievements)
 */
export async function recordGamificationEvent(
  userId: string,
  eventType: string,
  metadata?: any
): Promise<{ success: boolean; pointsAwarded?: number; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/mobile/gamification/${userId}/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, metadata })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to record event: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Invalidate cache
    await AsyncStorage.removeItem(GAMIFICATION_CACHE_KEY);
    
    return {
      success: true,
      pointsAwarded: data.pointsAwarded
    };
  } catch (error) {
    console.error('Error recording gamification event:', error);
    return {
      success: false,
      error: 'Failed to record event'
    };
  }
}

/**
 * Calculate level from total points
 * Formula: level = floor(sqrt(points / 100)) + 1
 */
export function calculateLevel(totalPoints: number): number {
  return Math.floor(Math.sqrt(totalPoints / 100)) + 1;
}

/**
 * Calculate points needed for next level
 */
export function pointsForNextLevel(currentLevel: number): number {
  return Math.pow(currentLevel, 2) * 100;
}

/**
 * Calculate progress to next level (0-100%)
 */
export function progressToNextLevel(totalPoints: number, currentLevel: number): number {
  const currentLevelPoints = Math.pow(currentLevel - 1, 2) * 100;
  const nextLevelPoints = Math.pow(currentLevel, 2) * 100;
  const pointsInLevel = totalPoints - currentLevelPoints;
  const pointsNeeded = nextLevelPoints - currentLevelPoints;
  
  return Math.min(Math.round((pointsInLevel / pointsNeeded) * 100), 100);
}

/**
 * Get achievement definition by ID
 */
export function getAchievementDefinition(achievementId: string): AchievementDefinition | undefined {
  return ACHIEVEMENT_DEFINITIONS.find(a => a.id === achievementId);
}

/**
 * Check if user has unlocked achievement
 */
export function hasAchievement(stats: GamificationStats | null, achievementId: string): boolean {
  if (!stats) return false;
  return stats.achievements.some(a => a.id === achievementId);
}

/**
 * Get locked achievements (not yet earned)
 */
export function getLockedAchievements(stats: GamificationStats | null): AchievementDefinition[] {
  const earned = stats?.achievements.map(a => a.id) || [];
  return ACHIEVEMENT_DEFINITIONS.filter(a => !earned.includes(a.id));
}

/**
 * Format level display (e.g., "Level 5 - Novice")
 */
export function formatLevelName(level: number): string {
  if (level >= 20) return `Level ${level} - Master`;
  if (level >= 15) return `Level ${level} - Expert`;
  if (level >= 10) return `Level ${level} - Advanced`;
  if (level >= 5) return `Level ${level} - Intermediate`;
  return `Level ${level} - Novice`;
}
