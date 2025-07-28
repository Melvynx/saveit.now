import { StyleSheet } from 'react-native';

import { Text, View } from '../../components/Themed';
import { useAuth } from '../../src/contexts/AuthContext';
import SignInScreen from '../../src/screens/SignInScreen';
import BookmarksScreen from '../../src/screens/bookmarks-screen';

export default function TabOneScreen() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return <SignInScreen />;
  }

  return <BookmarksScreen />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
});
