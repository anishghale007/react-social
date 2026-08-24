import { useEffect, useState } from "react";
import {
  View,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { useAuthStore } from "../../../src/store/authStore";
import PostCard from "@/features/auth/components/PostCard";
import { usePostsStore } from "@/store/postStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNotificationsStore } from "@/store/notificationsStore";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { unreadCount, fetchUnreadCount } = useNotificationsStore();

  const navigation = useNavigation();
  const {
    posts,
    isLoading,
    isRefreshing,
    page,
    totalPages,
    feedMode,
    setFeedMode,
    fetchPosts,
    refreshPosts,
    createPost,
    deletePost,
  } = usePostsStore();

  const [newPostText, setNewPostText] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetchPosts(1);
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => router.push("/search")}
          style={{ marginRight: 12 }}
        >
          <Ionicons name="search-outline" size={22} color="#111" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
            marginRight: 12,
          }}
        >
          <TouchableOpacity
            onPress={() => router.push("/notifications")}
            style={{ position: "relative" }}
          >
            <Ionicons name="notifications-outline" size={22} color="#111" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/search")}>
            <Ionicons name="search-outline" size={22} color="#111" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, unreadCount]);

  const handleCreate = async () => {
    if (!newPostText.trim()) return;
    setPosting(true);
    try {
      await createPost(newPostText.trim());
      setNewPostText("");
    } catch {
      Alert.alert("Error", "Failed to create post");
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete post?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePost(id);
          } catch {
            Alert.alert("Error", "Failed to delete post");
          }
        },
      },
    ]);
  };

  const handleLoadMore = () => {
    if (page < totalPages && !isLoading) {
      fetchPosts(page + 1);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder="What's on your mind?"
          value={newPostText}
          onChangeText={setNewPostText}
          multiline
        />
        <TouchableOpacity
          style={[
            styles.postButton,
            !newPostText.trim() && styles.postButtonDisabled,
          ]}
          onPress={handleCreate}
          disabled={!newPostText.trim() || posting}
        >
          {posting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.postButtonText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.feedToggle}>
        <TouchableOpacity
          style={[
            styles.feedTab,
            feedMode === "global" && styles.feedTabActive,
          ]}
          onPress={() => setFeedMode("global")}
        >
          <Text
            style={[
              styles.feedTabText,
              feedMode === "global" && styles.feedTabTextActive,
            ]}
          >
            Global
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.feedTab,
            feedMode === "following" && styles.feedTabActive,
          ]}
          onPress={() => setFeedMode("following")}
        >
          <Text
            style={[
              styles.feedTabText,
              feedMode === "following" && styles.feedTabTextActive,
            ]}
          >
            Following
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            isOwner={item.authorId === user?.id}
            onEdit={() =>
              router.push({
                pathname: "/post/[id]/edit",
                params: { id: item.id },
              })
            }
            onDelete={() => handleDelete(item.id)}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refreshPosts} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isLoading ? <ActivityIndicator style={{ margin: 20 }} /> : null
        }
        ListEmptyComponent={
          !isLoading ? (
            <Text style={styles.emptyText}>
              {feedMode === "following"
                ? "No posts from people you follow yet. Find people to follow!"
                : "No posts yet. Be the first to share!"}
            </Text>
          ) : null
        }
        contentContainerStyle={{ paddingVertical: 12 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  composer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 15,
  },
  postButton: {
    backgroundColor: "#111",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  postButtonDisabled: { backgroundColor: "#ccc" },
  postButtonText: { color: "#fff", fontWeight: "600" },
  emptyText: { textAlign: "center", marginTop: 60, color: "#999" },
  logoutButton: { padding: 14, alignItems: "center" },
  logoutText: { color: "#000000", fontWeight: "600" },
  feedToggle: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  feedTab: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  feedTabActive: { backgroundColor: "#111" },
  feedTabText: { color: "#555", fontWeight: "600", fontSize: 13 },
  feedTabTextActive: { color: "#fff" },
  badge: {
    position: "absolute",
    top: -6,
    right: -8,
    backgroundColor: "#e53935",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
});
