import { useNavigation } from "@react-navigation/native";
import { useLayoutEffect, useState } from "react";
import { Text, YStack } from "tamagui";
import { useAuth } from "../../src/contexts/AuthContext";
import SignInScreen from "../../src/screens/SignInScreen";
import BookmarksScreen from "../../src/screens/bookmarks-screen";

export default function TabOneScreen() {
  const { user, isLoading } = useAuth();
  const navigation = useNavigation();
  const [searchText, setSearchText] = useState("");

  useLayoutEffect(() => {
    navigation.setOptions({
      headerSearchBarOptions: {
        placeholder: "Search bookmarks...",
        onChangeText: (event: any) => {
          setSearchText(event.nativeEvent.text);
        },
        onSearchButtonPress: (event: any) => {
          setSearchText(event.nativeEvent.text);
        },
        onCancelButtonPress: () => {
          setSearchText("");
        },
      },
    });
  }, [navigation]);

  if (isLoading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" padding="$4">
        <Text fontSize="$8" fontWeight="bold" marginBottom="$2">Loading...</Text>
      </YStack>
    );
  }

  if (!user) {
    return <SignInScreen />;
  }

  return <BookmarksScreen searchQuery={searchText} />;
}

