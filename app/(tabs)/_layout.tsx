import React from 'react';
import { Tabs } from 'expo-router';
import { TabBarIcon } from '@/components/navigation/TabBarIcon';
import { designSystem } from '@/constants/designSystem';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: designSystem.colors.brand.primary, // Active tab color
        headerShown: false, // Hide header for tabs, individual screens can show their own
        tabBarStyle: {
          height: designSystem.layout.screenZones.tabBarTotal, // Use total height for tab bar
          backgroundColor: designSystem.colors.neutral.surface,
          borderTopWidth: 0, // Remove default border
          // Apply glass effect from PRD section 5.3 if possible with React Native styles
          // For now, just background color
        },
        tabBarLabelStyle: {
          ...designSystem.typography.textStyles.tabLabel, // Apply tab label style
          marginBottom: designSystem.spacing.scale.sm, // Small margin for label
        },
        tabBarIconStyle: {
          marginTop: designSystem.spacing.scale.sm, // Small margin for icon
        },
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'home' : 'home-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'list' : 'list-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="vouchers"
        options={{
          title: 'Vouchers',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'ticket' : 'ticket-outline'} color={color} />
          ),
        }}
      />
      {/* Profile: no tab bar entry – accessed via header avatar next to notification bell (§6.4.2) */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Me',
          href: null, // Hide from tab bar; profile is in header (avatar)
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'person' : 'person-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="two" options={{ href: null }} />
    </Tabs>
  );
}
