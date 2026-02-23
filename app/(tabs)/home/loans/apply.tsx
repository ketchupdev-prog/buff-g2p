import { View, Text, StyleSheet } from 'react-native';
import { designSystem } from '@/constants/designSystem';

export default function LoansApplyScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>LoansApply Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: designSystem.colors.neutral.background,
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
