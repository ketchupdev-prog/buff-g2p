import { Stack } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

export default function GroupsLayout() {
  return (
    <Stack>
      <View style={styles.container}>
        <Text style={styles.text}>Groups Layout</Text>
      </View>
    </Stack>
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
