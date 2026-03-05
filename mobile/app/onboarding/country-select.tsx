/**
 * Country Selection Screen
 * 
 * Purpose: Allow users to select their country during onboarding
 * Location: mobile/app/onboarding/country-select.tsx
 * 
 * Features:
 * - Auto-detect user's country
 * - Display list of supported countries
 * - Show currency and features per country
 * - Save selection and proceed to phone verification
 */

import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { 
  getSupportedCountries, 
  detectCountry, 
  setSelectedCountry,
  Country 
} from '@/services/countryService';

export default function CountrySelectScreen() {
  const router = useRouter();
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelected] = useState<Country | null>(null);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(true);

  useEffect(() => {
    loadCountries();
  }, []);

  const loadCountries = async () => {
    try {
      setLoading(true);
      
      // Fetch countries
      const supported = await getSupportedCountries();
      setCountries(supported);
      
      // Try to auto-detect
      setDetecting(true);
      const detected = await detectCountry();
      if (detected) {
        setSelected(detected);
      }
    } catch (error) {
      console.error('Error loading countries:', error);
      Alert.alert('Error', 'Failed to load countries. Please try again.');
    } finally {
      setLoading(false);
      setDetecting(false);
    }
  };

  const handleSelectCountry = (country: Country) => {
    setSelected(country);
  };

  const handleContinue = async () => {
    if (!selectedCountry) {
      Alert.alert('Selection Required', 'Please select your country to continue');
      return;
    }
    
    try {
      await setSelectedCountry(selectedCountry);
      router.push('/onboarding/phone');
    } catch (error) {
      Alert.alert('Error', 'Failed to save country selection');
    }
  };

  const renderCountryItem = ({ item }: { item: Country }) => {
    const isSelected = selectedCountry?.code === item.code;
    
    // Feature badges
    const features = [];
    if (item.features.vouchers) features.push('📜 Vouchers');
    if (item.features.cash_out) features.push('💵 Cash-Out');
    if (item.features.loans) features.push('💳 Loans');
    
    return (
      <TouchableOpacity
        onPress={() => handleSelectCountry(item)}
        className={`
          p-4 mb-3 rounded-xl border-2 
          ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}
        `}
      >
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center">
            <Text className="text-3xl mr-3">{item.flag}</Text>
            <View>
              <Text className="text-lg font-semibold text-gray-900">{item.name}</Text>
              <Text className="text-sm text-gray-500">
                {item.currency.symbol} {item.currency.code} • {item.phonePrefix}
              </Text>
            </View>
          </View>
          
          {isSelected && (
            <View className="bg-blue-500 rounded-full p-1">
              <Text className="text-white text-xs px-2">✓ Selected</Text>
            </View>
          )}
        </View>
        
        {features.length > 0 && (
          <View className="flex-row flex-wrap mt-2">
            {features.map((f, idx) => (
              <Text key={idx} className="text-xs text-gray-600 mr-3 mb-1">
                {f}
              </Text>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-600">Loading countries...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen 
        options={{ 
          title: 'Select Your Country',
          headerBackVisible: false
        }} 
      />
      
      <View className="flex-1 px-5 pt-6">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            Where are you located?
          </Text>
          <Text className="text-base text-gray-600">
            Select your country to personalize your Buffr experience
          </Text>
          
          {detecting && (
            <View className="mt-3 flex-row items-center">
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text className="ml-2 text-sm text-blue-600">Detecting your location...</Text>
            </View>
          )}
        </View>
        
        {/* Countries List */}
        <FlatList
          data={countries}
          keyExtractor={(item) => item.code}
          renderItem={renderCountryItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      </View>
      
      {/* Continue Button */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-5 py-4">
        <TouchableOpacity
          onPress={handleContinue}
          disabled={!selectedCountry}
          className={`
            py-4 rounded-xl items-center justify-center
            ${selectedCountry ? 'bg-blue-500' : 'bg-gray-300'}
          `}
        >
          <Text className="text-white font-semibold text-lg">
            Continue
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
