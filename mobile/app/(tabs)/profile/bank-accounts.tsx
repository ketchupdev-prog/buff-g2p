/**
 * Bank Account Linking Screen
 * 
 * Purpose: Manage linked bank accounts for withdrawals
 * Location: mobile/app/(tabs)/profile/bank-accounts.tsx
 * 
 * Features:
 * - View linked accounts
 * - Link new bank account
 * - Verify account
 * - Remove account
 * - Set primary account
 */

import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { useUser } from '@/contexts/UserContext';
import {
  getLinkedBankAccounts,
  linkBankAccount,
  verifyBankAccount,
  removeBankAccount,
  setPrimaryAccount,
  getSupportedBanks,
  LinkedBankAccount,
  BankLinkRequest
} from '@/services/bankLinkingService';

export default function BankAccountsScreen() {
  const { profile } = useUser();
  const [accounts, setAccounts] = useState<LinkedBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<LinkedBankAccount | null>(null);
  
  // Link form state
  const [selectedBank, setSelectedBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountType, setAccountType] = useState<'savings' | 'checking' | 'current'>('savings');
  const [branchCode, setBranchCode] = useState('');
  const [linking, setLinking] = useState(false);
  
  // Verification state
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      loadAccounts();
    }
  }, [profile?.id]);

  const loadAccounts = async () => {
    if (!profile?.id) return;
    
    try {
      setLoading(true);
      const data = await getLinkedBankAccounts(profile.id);
      setAccounts(data);
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkAccount = async () => {
    if (!profile?.id) return;
    
    if (!selectedBank || !accountNumber) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }
    
    try {
      setLinking(true);
      
      const request: BankLinkRequest = {
        bankName: selectedBank,
        accountNumber,
        accountHolderName: accountHolder || profile.fullName || undefined,
        accountType,
        branchCode: branchCode || undefined
      };
      
      const result = await linkBankAccount(profile.id, request);
      
      if (result.success && result.account) {
        Alert.alert('Success', 'Bank account linked successfully. Please verify to enable withdrawals.');
        setShowLinkModal(false);
        resetLinkForm();
        loadAccounts();
      } else {
        Alert.alert('Error', result.error || 'Failed to link account');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to link account');
    } finally {
      setLinking(false);
    }
  };

  const handleVerify = async () => {
    if (!selectedAccount) return;
    
    if (verificationCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a 6-digit verification code');
      return;
    }
    
    try {
      setVerifying(true);
      
      const result = await verifyBankAccount(selectedAccount.id, verificationCode);
      
      if (result.success && result.verified) {
        Alert.alert('Verified', 'Bank account verified successfully!');
        setShowVerifyModal(false);
        setVerificationCode('');
        setSelectedAccount(null);
        loadAccounts();
      } else {
        Alert.alert('Verification Failed', result.error || 'Invalid verification code');
      }
    } catch (error) {
      Alert.alert('Error', 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleRemoveAccount = (account: LinkedBankAccount) => {
    Alert.alert(
      'Remove Account',
      `Remove ${account.bankName} account ending in ${account.accountNumber.slice(-4)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const result = await removeBankAccount(account.id);
            if (result.success) {
              loadAccounts();
            } else {
              Alert.alert('Error', result.error || 'Failed to remove account');
            }
          }
        }
      ]
    );
  };

  const handleSetPrimary = async (account: LinkedBankAccount) => {
    try {
      const result = await setPrimaryAccount(account.id);
      if (result.success) {
        loadAccounts();
      } else {
        Alert.alert('Error', result.error || 'Failed to set primary');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to set primary account');
    }
  };

  const resetLinkForm = () => {
    setSelectedBank('');
    setAccountNumber('');
    setAccountHolder('');
    setAccountType('savings');
    setBranchCode('');
  };

  const renderAccountItem = ({ item }: { item: LinkedBankAccount }) => {
    const maskedNumber = `****${item.accountNumber.slice(-4)}`;
    
    return (
      <View className="bg-white p-4 mb-3 rounded-xl border border-gray-200">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-900">
              {item.bankName}
            </Text>
            <Text className="text-sm text-gray-500">
              {maskedNumber} • {item.accountType || 'Savings'}
            </Text>
            {item.accountHolderName && (
              <Text className="text-xs text-gray-400 mt-1">
                {item.accountHolderName}
              </Text>
            )}
          </View>
          
          <View className="items-end">
            {item.isPrimary && (
              <View className="bg-green-100 px-2 py-1 rounded mb-1">
                <Text className="text-xs text-green-700 font-semibold">Primary</Text>
              </View>
            )}
            {item.isVerified ? (
              <Text className="text-xs text-green-600">✓ Verified</Text>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setSelectedAccount(item);
                  setShowVerifyModal(true);
                }}
              >
                <Text className="text-xs text-orange-600 font-semibold">Verify</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        <View className="flex-row items-center justify-end mt-2 space-x-3">
          {!item.isPrimary && item.isVerified && (
            <TouchableOpacity onPress={() => handleSetPrimary(item)}>
              <Text className="text-sm text-blue-600 font-medium">Set as Primary</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity onPress={() => handleRemoveAccount(item)}>
            <Text className="text-sm text-red-600 font-medium">Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <Stack.Screen options={{ title: 'Bank Accounts' }} />
      
      <View className="flex-1 px-5 pt-6">
        {/* Header */}
        <View className="mb-4">
          <Text className="text-lg text-gray-700 mb-4">
            Link your bank accounts to withdraw funds directly to your bank
          </Text>
        </View>
        
        {loading ? (
          <ActivityIndicator size="large" color="#3b82f6" />
        ) : accounts.length === 0 ? (
          <View className="items-center justify-center py-12">
            <Text className="text-6xl mb-4">🏦</Text>
            <Text className="text-lg font-semibold text-gray-900 mb-2">
              No Bank Accounts Linked
            </Text>
            <Text className="text-sm text-gray-500 text-center mb-6">
              Link your bank account to enable direct withdrawals
            </Text>
          </View>
        ) : (
          <FlatList
            data={accounts}
            keyExtractor={(item) => item.id}
            renderItem={renderAccountItem}
            showsVerticalScrollIndicator={false}
          />
        )}
        
        {/* Add Account Button */}
        <TouchableOpacity
          onPress={() => setShowLinkModal(true)}
          className="bg-blue-500 py-4 rounded-xl items-center mt-4"
        >
          <Text className="text-white font-semibold text-base">+ Link Bank Account</Text>
        </TouchableOpacity>
      </View>
      
      {/* Link Account Modal */}
      <Modal
        visible={showLinkModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLinkModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6" style={{ maxHeight: '80%' }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-2xl font-bold text-gray-900 mb-6">Link Bank Account</Text>
              
              {/* Bank Selection */}
              <Text className="text-sm font-medium text-gray-700 mb-2">Select Bank *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                {getSupportedBanks().map((bank) => (
                  <TouchableOpacity
                    key={bank.code}
                    onPress={() => setSelectedBank(bank.name)}
                    className={`
                      px-4 py-3 rounded-xl mr-2 border-2
                      ${selectedBank === bank.name ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}
                    `}
                  >
                    <Text className={`text-sm font-medium ${selectedBank === bank.name ? 'text-blue-700' : 'text-gray-700'}`}>
                      {bank.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              {/* Account Number */}
              <Text className="text-sm font-medium text-gray-700 mb-2">Account Number *</Text>
              <TextInput
                value={accountNumber}
                onChangeText={setAccountNumber}
                placeholder="Enter account number"
                keyboardType="number-pad"
                className="bg-gray-100 p-4 rounded-xl mb-4 text-base"
              />
              
              {/* Account Holder Name */}
              <Text className="text-sm font-medium text-gray-700 mb-2">Account Holder Name</Text>
              <TextInput
                value={accountHolder}
                onChangeText={setAccountHolder}
                placeholder={profile?.fullName || "Enter account holder name"}
                className="bg-gray-100 p-4 rounded-xl mb-4 text-base"
              />
              
              {/* Account Type */}
              <Text className="text-sm font-medium text-gray-700 mb-2">Account Type</Text>
              <View className="flex-row mb-4">
                {(['savings', 'checking', 'current'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setAccountType(type)}
                    className={`
                      flex-1 py-3 rounded-xl mr-2 border-2
                      ${accountType === type ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}
                    `}
                  >
                    <Text className={`text-center text-sm capitalize ${accountType === type ? 'text-blue-700 font-semibold' : 'text-gray-700'}`}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Branch Code */}
              <Text className="text-sm font-medium text-gray-700 mb-2">Branch Code (Optional)</Text>
              <TextInput
                value={branchCode}
                onChangeText={setBranchCode}
                placeholder="e.g., 280172"
                keyboardType="number-pad"
                className="bg-gray-100 p-4 rounded-xl mb-6 text-base"
              />
              
              {/* Actions */}
              <View className="flex-row space-x-3">
                <TouchableOpacity
                  onPress={() => {
                    setShowLinkModal(false);
                    resetLinkForm();
                  }}
                  className="flex-1 py-4 rounded-xl bg-gray-200"
                >
                  <Text className="text-center text-gray-700 font-semibold">Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={handleLinkAccount}
                  disabled={linking || !selectedBank || !accountNumber}
                  className={`
                    flex-1 py-4 rounded-xl
                    ${!selectedBank || !accountNumber ? 'bg-gray-300' : 'bg-blue-500'}
                  `}
                >
                  {linking ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-center text-white font-semibold">Link Account</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* Verification Modal */}
      <Modal
        visible={showVerifyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowVerifyModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-center px-6">
          <View className="bg-white rounded-2xl p-6">
            <Text className="text-xl font-bold text-gray-900 mb-2">Verify Account</Text>
            <Text className="text-sm text-gray-600 mb-6">
              Enter the 6-digit verification code sent to your registered mobile number
            </Text>
            
            <TextInput
              value={verificationCode}
              onChangeText={setVerificationCode}
              placeholder="000000"
              keyboardType="number-pad"
              maxLength={6}
              className="bg-gray-100 p-4 rounded-xl mb-4 text-center text-2xl font-mono"
            />
            
            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={() => {
                  setShowVerifyModal(false);
                  setVerificationCode('');
                  setSelectedAccount(null);
                }}
                className="flex-1 py-3 rounded-xl bg-gray-200"
              >
                <Text className="text-center text-gray-700 font-semibold">Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleVerify}
                disabled={verifying || verificationCode.length !== 6}
                className={`
                  flex-1 py-3 rounded-xl
                  ${verificationCode.length !== 6 ? 'bg-gray-300' : 'bg-blue-500'}
                `}
              >
                {verifying ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-center text-white font-semibold">Verify</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
