import { View, Text, StyleSheet } from 'react-native';

export default function GroupsCreateScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>GroupsCreate Screen</Text>
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
