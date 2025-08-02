import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { 
  Platform, 
  Alert,
  KeyboardAvoidingView,
  ScrollView 
} from 'react-native';
import { router } from 'expo-router';
import { Bug, X } from '@tamagui/lucide-icons';
import { 
  Button, 
  Card, 
  Text, 
  TextArea, 
  XStack, 
  YStack 
} from 'tamagui';
import Constants from 'expo-constants';

import { useAuth } from '../src/contexts/AuthContext';
import { apiClient } from '../src/lib/api-client';

export default function BugReportModal() {
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const handleSubmitBugReport = async () => {
    if (!description.trim() || description.trim().length < 10) {
      Alert.alert('Error', 'Please provide a detailed description (at least 10 characters)');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'Please sign in to submit a bug report');
      return;
    }

    setIsLoading(true);
    try {
      const deviceInfo = `${Platform.OS} ${Platform.Version}`;
      const appVersion = Constants.expoConfig?.version || 'Unknown';

      await apiClient.submitBugReport({
        description: description.trim(),
        deviceInfo,
        appVersion,
      });
      
      Alert.alert(
        'Bug Report Sent', 
        'Thank you for your feedback! We\'ve received your bug report and will investigate it.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error submitting bug report:', error);
      Alert.alert('Error', 'Failed to submit bug report. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (!user) {
    return (
      <YStack flex={1} padding="$4" justifyContent="center" alignItems="center" gap="$4">
        <Bug size={48} color="$gray10" />
        <Text fontSize="$6" fontWeight="bold" textAlign="center">
          Sign In Required
        </Text>
        <Text fontSize="$4" color="$gray10" textAlign="center">
          Please sign in to submit a bug report
        </Text>
        <Button onPress={handleCancel} theme="gray">
          <X size={16} />
          Close
        </Button>
        <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
      </YStack>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <YStack flex={1} padding="$4" backgroundColor="$background">
        <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
        
        <XStack justifyContent="space-between" alignItems="center" marginBottom="$6" marginTop="$4">
          <YStack gap="$2">
            <Text fontSize="$8" fontWeight="bold" color="$color">
              Report Bug
            </Text>
            <Text fontSize="$4" color="$gray10">
              Help us improve the app
            </Text>
          </YStack>
          <Button
            onPress={handleCancel}
            size="$3"
            variant="outlined"
            backgroundColor="transparent"
            disabled={isLoading}
          >
            <X size={20} />
          </Button>
        </XStack>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <YStack gap="$4">
            <Card
              padding="$4"
              backgroundColor="$backgroundTransparent"
              borderWidth={1}
              borderColor="$borderColor"
            >
              <XStack alignItems="center" gap="$3">
                <Bug size={20} color="$gray10" />
                <YStack flex={1} gap="$1">
                  <Text fontSize="$3" color="$gray10">
                    Reporting as:
                  </Text>
                  <Text fontSize="$4" fontWeight="500" color="$color">
                    {user.email}
                  </Text>
                </YStack>
              </XStack>
            </Card>

            <YStack gap="$3">
              <Text fontSize="$5" fontWeight="600" color="$color">
                What's the issue?
              </Text>
              <Text fontSize="$3" color="$gray10">
                Please describe the bug in detail. Include steps to reproduce if possible.
              </Text>
              
              <TextArea
                placeholder="Describe the bug you encountered..."
                value={description}
                onChangeText={setDescription}
                minHeight={120}
                maxHeight={200}
                numberOfLines={6}
                backgroundColor="$backgroundTransparent"
                borderColor="$borderColor"
                borderWidth={1}
                padding="$3"
                fontSize="$4"
                color="$color"
                placeholderTextColor="$gray10"
                textAlignVertical="top"
              />
              
              <Text fontSize="$2" color="$gray10" textAlign="right">
                {description.length} characters (minimum 10)
              </Text>
            </YStack>

            <Card
              padding="$4"
              backgroundColor="$backgroundTransparent"
              borderWidth={1}
              borderColor="$borderColor"
            >
              <YStack gap="$2">
                <Text fontSize="$4" fontWeight="500" color="$color">
                  Device Information
                </Text>
                <Text fontSize="$3" color="$gray10">
                  Platform: {Platform.OS} {Platform.Version}
                </Text>
                <Text fontSize="$3" color="$gray10">
                  App Version: {Constants.expoConfig?.version || 'Unknown'}
                </Text>
              </YStack>
            </Card>
          </YStack>
        </ScrollView>

        <YStack marginTop="$4" gap="$3">
          <Button
            onPress={handleSubmitBugReport}
            disabled={isLoading || description.trim().length < 10}
            backgroundColor="$red10"
            color="white"
            size="$4"
            fontWeight="bold"
          >
            <Bug size={20} />
            <Text color="white" fontSize="$4" fontWeight="bold">
              {isLoading ? 'Sending...' : 'Submit Bug Report'}
            </Text>
          </Button>
        </YStack>
      </YStack>
    </KeyboardAvoidingView>
  );
}