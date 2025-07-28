import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { 
  Platform, 
  StyleSheet, 
  TextInput, 
  Pressable, 
  Alert,
  KeyboardAvoidingView,
  ScrollView 
} from 'react-native';
import { router } from 'expo-router';

import { Text, View } from '../components/Themed';
import { useAuth } from '../src/contexts/AuthContext';
import { apiClient } from '../src/lib/api-client';

export default function AddBookmarkModal() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const handleAddBookmark = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a URL');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'Please sign in to add bookmarks');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.createBookmark({
        url: url.trim(),
      });
      
      Alert.alert('Success', 'Bookmark added successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error adding bookmark:', error);
      Alert.alert('Error', 'Failed to add bookmark. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Sign In Required</Text>
        <Text style={styles.subtitle}>Please sign in to add bookmarks</Text>
        <Pressable style={styles.button} onPress={handleCancel}>
          <Text style={styles.buttonText}>Close</Text>
        </Pressable>
        <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Add Bookmark</Text>
        <Text style={styles.subtitle}>Save a new link to your collection</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Paste URL here..."
          value={url}
          onChangeText={setUrl}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="url"
          multiline
          numberOfLines={3}
        />
        
        <View style={styles.buttonContainer}>
          <Pressable 
            style={[styles.button, styles.cancelButton]} 
            onPress={handleCancel}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </Pressable>
          
          <Pressable 
            style={[styles.button, styles.addButton, isLoading && styles.buttonDisabled]}
            onPress={handleAddBookmark}
            disabled={isLoading}
          >
            <Text style={[styles.buttonText, styles.addButtonText]}>
              {isLoading ? 'Adding...' : 'Add Bookmark'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f3f4',
  },
  addButton: {
    backgroundColor: '#007AFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  addButtonText: {
    color: '#fff',
  },
});
