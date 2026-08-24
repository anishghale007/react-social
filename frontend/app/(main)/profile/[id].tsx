import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { usersApi } from "../../../src/features/users/api/users.api";
import { useChatStore } from "../../../src/store/chatStore";
import { useProfileStore } from "../../../src/store/profileStore";
import { useAuthStore } from "../../../src/store/authStore";
import { Post } from "@/features/auth/posts/types";
import { postsApi } from "@/features/auth/posts/api/posts.api";
import PostCard from "@/features/auth/components/PostCard";

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { user: currentUser } = useAuthStore();
  const { startConversation } = useChatStore();
  const { viewedProfile, isLoadingProfile, fetchProfile, clearViewedProfile } =
    useProfileStore();

  const [posts, setPosts] = useState<Post[]>([]);
  const [messaging, setMessaging] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile = currentUser?.id === id;

  useEffect(() => {
    if (isOwnProfile) {
      router.replace("/(main)/(tabs)/profile");
      return;
    }

    fetchProfile(id);
    postsApi.getByUser(id).then((res) => setPosts(res.data));

    return () => clearViewedProfile();
  }, [id]);

  useEffect(() => {
    if (viewedProfile) {
      navigation.setOptions({
        title: viewedProfile.displayName ?? viewedProfile.username,
      });
      setIsFollowing(viewedProfile.isFollowing);
      setFollowerCount(viewedProfile._count.followers);
    }
  }, [viewedProfile]);

  const handleToggleFollow = async () => {
    if (followLoading) return;
    setFollowLoading(true);

    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setFollowerCount((c) => (wasFollowing ? c - 1 : c + 1));

    try {
      if (wasFollowing) {
        await usersApi.unfollow(id);
      } else {
        await usersApi.follow(id);
      }
    } catch {
      setIsFollowing(wasFollowing);
      setFollowerCount((c) => (wasFollowing ? c + 1 : c - 1));
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = async () => {
    setMessaging(true);
    try {
      const conversation = await startConversation(id);
      router.push({
        pathname: "/chat/[id]",
        params: { id: conversation.id, name: viewedProfile?.displayName ?? "" },
      });
    } finally {
      setMessaging(false);
    }
  };

  if (isOwnProfile || isLoadingProfile || !viewedProfile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <PostCard
          post={item}
          isOwner={false}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      )}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(viewedProfile.displayName ??
                viewedProfile.username)[0].toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>
            {viewedProfile.displayName ?? viewedProfile.username}
          </Text>
          <Text style={styles.username}>@{viewedProfile.username}</Text>
          {viewedProfile.bio ? (
            <Text style={styles.bio}>{viewedProfile.bio}</Text>
          ) : null}

          <View style={styles.statsRow}>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() =>
                router.push({
                  pathname: "/profile/[id]/followers",
                  params: { id },
                })
              }
            >
              <Text style={styles.statCount}>{followerCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() =>
                router.push({
                  pathname: "/profile/[id]/following",
                  params: { id },
                })
              }
            >
              <Text style={styles.statCount}>
                {viewedProfile._count.following}
              </Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
            <View style={styles.statItem}>
              <Text style={styles.statCount}>{viewedProfile._count.posts}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.followButton,
                isFollowing && styles.followingButton,
              ]}
              onPress={handleToggleFollow}
              disabled={followLoading}
            >
              <Text
                style={[
                  styles.followButtonText,
                  isFollowing && styles.followingButtonText,
                ]}
              >
                {isFollowing ? "Following" : "Follow"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.messageButton}
              onPress={handleMessage}
              disabled={messaging}
            >
              {messaging ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.messageButtonText}>Message</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>No posts yet</Text>}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    alignItems: "center",
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 24 },
  name: { fontSize: 17, fontWeight: "600", color: "#111" },
  username: { fontSize: 14, color: "#888", marginTop: 2 },
  bio: {
    fontSize: 14,
    color: "#333",
    marginTop: 10,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  statsRow: { flexDirection: "row", marginTop: 16, gap: 32 },
  statItem: { alignItems: "center" },
  statCount: { fontSize: 16, fontWeight: "700", color: "#111" },
  statLabel: { fontSize: 12, color: "#888", marginTop: 2 },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  followButton: {
    backgroundColor: "#111",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  followingButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  followButtonText: { color: "#fff", fontWeight: "600" },
  followingButtonText: { color: "#111" },
  messageButton: {
    backgroundColor: "#111",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  messageButtonText: { color: "#fff", fontWeight: "600" },
  empty: { textAlign: "center", marginTop: 40, color: "#999" },
});
