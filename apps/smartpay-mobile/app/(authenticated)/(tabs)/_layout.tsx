import React, { useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { Link, Tabs, useRouter } from 'expo-router';
import { Pressable, Image } from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useUser } from '@/contexts/UserContext';
import { useNotificationsContext } from '@/contexts/NotificationsContext';
import { AppHeader } from '@/components/layout/AppHeader';
import { getAvatarImageSource } from '@/utils/avatarImageSource';

function HomeHeader() {
  const router = useRouter();
  const { profile } = useUser();
  const { unreadCount } = useNotificationsContext();
  const [searchValue, setSearchValue] = useState('');
  const initials = profile?.firstName && profile?.lastName
    ? `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase()
    : profile?.firstName?.[0]?.toUpperCase() ?? 'U';

  return (
    <AppHeader
      showSearch
      searchPlaceholder="Search..."
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      onNotificationPress={() => router.push('/notifications')}
      notificationBadge={unreadCount > 0}
      onAvatarPress={() => router.push('/(authenticated)/profile')}
      avatarUri={profile?.avatarUrl}
      avatarInitials={initials}
    />
  );
}

export default function AuthenticatedTabLayout() {
  const colorScheme = useColorScheme();
  const tint = colorScheme === 'dark' ? Colors.dark.tint : Colors.light.tint;
  const textColor = colorScheme === 'dark' ? Colors.dark.text : Colors.light.text;
  const { profile } = useUser();
  const avatarSource = getAvatarImageSource(profile?.avatarUrl);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tint,
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="copilot"
        options={{
          title: 'Copilot',
          tabBarIcon: ({ color }) => (
            <SymbolView name="bubble.left.and.bubble.right" tintColor={color} size={28} />
          ),
          headerRight: () => (
            <Link href="/(authenticated)/profile" asChild>
              <Pressable style={{ marginRight: 16 }} accessibilityLabel="Profile">
                {({ pressed }) =>
                  avatarSource ? (
                    <Image source={avatarSource} style={{ width: 32, height: 32, borderRadius: 16, opacity: pressed ? 0.5 : 1 }} resizeMode="cover" />
                  ) : (
                    <SymbolView name="person.circle" size={26} tintColor={textColor} style={{ opacity: pressed ? 0.5 : 1 }} />
                  )
                }
              </Pressable>
            </Link>
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          header: () => <HomeHeader />,
          tabBarIcon: ({ color }) => (
            <SymbolView name="house.fill" tintColor={color} size={28} />
          ),
        }}
      />
      <Tabs.Screen
        name="transfers"
        options={{
          title: 'Transactions',
          tabBarIcon: ({ color }) => (
            <SymbolView name="arrow.left.arrow.right" tintColor={color} size={28} />
          ),
        }}
      />
      <Tabs.Screen name="invest" options={{ href: null }} />
    </Tabs>
  );
}
