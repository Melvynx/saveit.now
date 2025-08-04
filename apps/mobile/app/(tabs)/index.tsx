import { useNavigation } from '@react-navigation/native';
import { useLayoutEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { Text, View } from '../../components/Themed';
import { useAuth } from '../../src/contexts/auth-context';
import SignInScreen from '../../src/screens/SignInScreen';
import BookmarksScreen from '../../src/screens/bookmarks-screen';

export default function TabOneScreen() {
  const { user, isLoading } = useAuth();
  const navigation = useNavigation();
  const [searchText, setSearchText] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({
      headerSearchBarOptions: {
        placeholder: 'Search bookmarks...',
        onChangeText: (event: any) => {
          setSearchText(event.nativeEvent.text);
        },
        onSearchButtonPress: (event: any) => {
          setSearchText(event.nativeEvent.text);
        },
        onCancelButtonPress: () => {
          setSearchText('');
        },
      },
    });
  }, [navigation]);

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

  return <BookmarksScreen searchQuery={searchText} />;
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
