import React from 'react';
import { XStack, YStack, H4, Button, useTheme } from 'tamagui';
import { useColorScheme } from '../../components/useColorScheme';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface HeaderProps {
  title: string;
  showThemeToggle?: boolean;
  onThemeToggle?: () => void;
  rightComponent?: React.ReactNode;
  backgroundColor?: string;
}

export function Header({ 
  title, 
  showThemeToggle = false, 
  onThemeToggle,
  rightComponent,
  backgroundColor
}: HeaderProps) {
  const theme = useTheme();
  const colorScheme = useColorScheme();

  return (
    <XStack
      backgroundColor={backgroundColor || theme.background.val}
      borderBottomWidth={1}
      borderBottomColor={theme.borderColor.val}
      paddingHorizontal="$4"
      paddingVertical="$3"
      paddingTop="$6" // Extra padding for status bar
      justifyContent="space-between"
      alignItems="center"
      elevation={2}
      shadowColor={theme.borderColor.val}
      shadowOffset={{ width: 0, height: 1 }}
      shadowOpacity={0.1}
      shadowRadius={2}
    >
      <YStack flex={1}>
        <H4 
          color={theme.color.val}
          fontWeight="600"
          numberOfLines={1}
        >
          {title}
        </H4>
      </YStack>

      <XStack alignItems="center" gap="$3">
        {showThemeToggle && (
          <Button
            size="$3"
            variant="outlined"
            backgroundColor="transparent"
            onPress={onThemeToggle}
            padding="$2"
            borderRadius="$3"
            hoverStyle={{
              backgroundColor: theme.backgroundHover.val,
            }}
            pressStyle={{
              backgroundColor: theme.backgroundPress.val,
            }}
          >
            <FontAwesome
              name={colorScheme === 'dark' ? 'sun-o' : 'moon-o'}
              size={20}
              color={theme.color.val}
            />
          </Button>
        )}
        {rightComponent}
      </XStack>
    </XStack>
  );
}

// Export a themed variant specifically for the main app header
export function AppHeader(props: Omit<HeaderProps, 'backgroundColor'>) {
  const theme = useTheme();
  
  return (
    <Header 
      {...props}
      backgroundColor={theme.background.val}
    />
  );
}