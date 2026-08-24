import { Stack } from "expo-router";

export default function MainLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="post/[id]/edit" options={{ title: "Edit Post" }} />
      <Stack.Screen name="post/[id]/comments" options={{ title: "Comments" }} />
      <Stack.Screen name="chat/[id]" options={{ title: "Chat" }} />
      <Stack.Screen name="chat/new" options={{ title: "New Message" }} />
      <Stack.Screen name="profile/edit" options={{ title: "Edit Profile" }} />
      <Stack.Screen name="profile/[id]" options={{ title: "Profile" }} />
      <Stack.Screen name="search" options={{ title: "Search" }} />
      <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
      <Stack.Screen
        name="profile/[id]/followers"
        options={{ title: "Followers" }}
      />
      <Stack.Screen
        name="profile/[id]/following"
        options={{ title: "Following" }}
      />
    </Stack>
  );
}
