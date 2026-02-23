import { View, Text, StyleSheet } from 'react-native';

export default function MerchantsIndexScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>MerchantsIndex Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
