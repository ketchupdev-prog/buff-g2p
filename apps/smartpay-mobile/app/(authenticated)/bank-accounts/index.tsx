/**
 * Bank Accounts Screen - Buffr Connect Integration
 * Shows linked bank accounts and allows users to connect new accounts
 * 
 * Location: fintech/apps/smartpay-mobile/app/(authenticated)/bank-accounts/index.tsx
 */
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAccounts, ConnectButton } from '@buffr/react-native';
import { useBuffr } from '@/contexts/BuffrContext';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

export default function BankAccountsScreen() {
  const { isConfigured } = useBuffr();
  const { data: accounts, isLoading, error, refetch } = useAccounts();

  const handleConnectBank = async (provider: string) => {
    try {
      const buffrUrl = process.env.EXPO_PUBLIC_BUFFR_CONNECT_URL || 'http://localhost:3000';
      
      // Open Buffr Connect consent flow in browser
      // In production, this would use proper OAuth with expo-auth-session
      const result = await WebBrowser.openBrowserAsync(`${buffrUrl}/consent?provider=${provider}`);
      
      if (result.type === 'cancel' || result.type === 'dismiss') {
        Alert.alert('Cancelled', 'Bank connection was cancelled');
      } else {
        // Refresh accounts after consent flow completes
        setTimeout(() => refetch(), 2000);
      }
    } catch (err) {
      console.error('[BankAccounts] Connect error:', err);
      Alert.alert('Error', 'Failed to connect bank account');
    }
  };

  if (!isConfigured) {
    return (
      <View className="flex-1 bg-base-100 items-center justify-center p-4">
        <Ionicons name="warning-outline" size={64} className="text-warning mb-4" />
        <Text className="text-lg text-base-content font-semibold text-center mb-2">
          Buffr Connect Not Configured
        </Text>
        <Text className="text-sm text-base-content/70 text-center">
          Please set EXPO_PUBLIC_BUFFR_CONNECT_URL in your .env file
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 bg-base-100 items-center justify-center">
        <ActivityIndicator size="large" className="text-primary" />
        <Text className="mt-4 text-base-content/70">Loading bank accounts...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-base-100 items-center justify-center p-4">
        <Ionicons name="alert-circle-outline" size={64} className="text-error mb-4" />
        <Text className="text-lg text-base-content font-semibold text-center mb-2">
          Failed to Load Accounts
        </Text>
        <Text className="text-sm text-base-content/70 text-center mb-4">
          {error instanceof Error ? error.message : 'Unknown error'}
        </Text>
        <TouchableOpacity
          onPress={() => refetch()}
          className="btn btn-primary"
        >
          <Text className="text-primary-content font-semibold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const banks = [
    { id: 'fnb_namibia', name: 'FNB Namibia', icon: 'business' },
    { id: 'standard_bank_namibia', name: 'Standard Bank', icon: 'business' },
    { id: 'bank_windhoek', name: 'Bank Windhoek', icon: 'business' },
    { id: 'nedbank_namibia', name: 'Nedbank', icon: 'business' },
  ];

  return (
    <ScrollView className="flex-1 bg-base-100">
      <View className="p-4">
        {/* Header */}
        <Text className="text-2xl font-bold text-base-content mb-2">
          Bank Accounts
        </Text>
        <Text className="text-sm text-base-content/70 mb-6">
          Connect your bank accounts to access your financial data
        </Text>

        {/* Connected Accounts */}
        {accounts && accounts.length > 0 && (
          <View className="mb-6">
            <Text className="text-lg font-semibold text-base-content mb-3">
              Connected Accounts
            </Text>
            {accounts.map((account) => (
              <View
                key={account.id}
                className="card bg-base-200 p-4 mb-3 flex-row items-center justify-between"
              >
                <View className="flex-row items-center flex-1">
                  <Ionicons name="card-outline" size={32} className="text-primary mr-3" />
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-base-content">
                      {account.account_name || account.account_type || 'Account'}
                    </Text>
                    <Text className="text-sm text-base-content/70">
                      {account.account_number || account.id}
                    </Text>
                    {account.balance !== undefined && (
                      <Text className="text-sm text-success font-semibold mt-1">
                        {account.currency} {account.balance.toFixed(2)}
                      </Text>
                    )}
                  </View>
                </View>
                <Ionicons name="checkmark-circle" size={24} className="text-success" />
              </View>
            ))}
          </View>
        )}

        {/* Connect New Bank */}
        <View>
          <Text className="text-lg font-semibold text-base-content mb-3">
            Connect New Bank
          </Text>
          
          {banks.map((bank) => (
            <TouchableOpacity
              key={bank.id}
              onPress={() => handleConnectBank(bank.id)}
              className="card bg-base-200 p-4 mb-3 flex-row items-center"
            >
              <Ionicons name={bank.icon as any} size={32} className="text-primary mr-3" />
              <View className="flex-1">
                <Text className="text-base font-semibold text-base-content">
                  {bank.name}
                </Text>
                <Text className="text-sm text-base-content/70">
                  Connect via Buffr Connect
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} className="text-base-content/50" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Help Text */}
        <View className="alert mt-6">
          <Ionicons name="information-circle-outline" size={20} className="text-info" />
          <View className="flex-1">
            <Text className="text-sm text-base-content font-semibold mb-1">
              Secure Connection
            </Text>
            <Text className="text-xs text-base-content/70">
              Your bank credentials are never stored on our servers. 
              All connections are encrypted and follow banking regulations.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
