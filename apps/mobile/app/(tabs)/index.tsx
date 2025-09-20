import { useNavigation } from "@react-navigation/native";
import { useLayoutEffect, useState } from "react";
import BookmarksScreen from "../../src/screens/bookmarks-screen";

export default function TabOneScreen() {
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

  return <BookmarksScreen searchQuery={searchText} />;
}

