import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Post } from "../posts/types";
import { useRouter } from "expo-router";
import { useState } from "react";
import { postsApi } from "../posts/api/posts.api";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  post: Post;
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export default function PostCard({ post, isOwner, onEdit, onDelete }: Props) {
  const router = useRouter();
  const [likedByMe, setLikedByMe] = useState(false);
  const [likeCount, setLikeCount] = useState(post._count?.likes ?? 0);
  const [isLiking, setIsLiking] = useState(false);

  const handleToggleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);

    // optimistic update
    const wasLiked = likedByMe;
    setLikedByMe(!wasLiked);
    setLikeCount((c) => (wasLiked ? c - 1 : c + 1));

    try {
      await postsApi.toggleLike(post.id);
    } catch {
      // revert on failure
      setLikedByMe(wasLiked);
      setLikeCount((c) => (wasLiked ? c + 1 : c - 1));
    } finally {
      setIsLiking(false);
    }
  };

  const handlePressAuthor = () => {
    if (isOwner) {
      router.push({ pathname: "/(main)/(tabs)/profile" });
      return;
    }
    router.push({ pathname: "/profile/[id]", params: { id: post.authorId } });
  };

  const isEdited =
    new Date(post.updatedAt).getTime() - new Date(post.createdAt).getTime() >
    1000;

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.header}
        onPress={handlePressAuthor}
        // disabled={isOwner}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(post.author.displayName ?? post.author.username)[0].toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>
            {post.author.displayName ?? post.author.username}
          </Text>
          <Text style={styles.username}>@{post.author.username}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.date}>
            {new Date(post.createdAt).toLocaleDateString()}
          </Text>
          {isEdited && <Text style={styles.editedText}>Edited</Text>}
        </View>
      </TouchableOpacity>

      <Text style={styles.content}>{post.content}</Text>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionItem} onPress={handleToggleLike}>
          <Ionicons
            name={likedByMe ? "heart" : "heart-outline"}
            size={20}
            color={likedByMe ? "#e53935" : "#555"}
          />
          <Text style={[styles.actionCount, likedByMe && { color: "#e53935" }]}>
            {likeCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() =>
            router.push({
              pathname: "/post/[id]/comments",
              params: { id: post.id },
            })
          }
        >
          <Ionicons name="chatbubble-outline" size={18} color="#555" />
          <Text style={styles.actionCount}>{post._count?.comments ?? 0}</Text>
        </TouchableOpacity>

        {isOwner && (
          <View style={styles.ownerActions}>
            <TouchableOpacity onPress={onEdit}>
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete}>
              <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarText: { color: "#fff", fontWeight: "700" },
  name: { fontWeight: "600", fontSize: 15, color: "#111" },
  username: { color: "#888", fontSize: 13 },
  date: { color: "#aaa", fontSize: 12 },
  content: { fontSize: 15, color: "#222", lineHeight: 21, marginBottom: 12 },
  actionsRow: { flexDirection: "row", alignItems: "center", gap: 20 },
  actionItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionCount: { fontSize: 13, color: "#555", fontWeight: "600" },
  ownerActions: { flexDirection: "row", gap: 20, marginLeft: "auto" },
  actionText: { color: "#555", fontSize: 13, fontWeight: "600" },
  deleteText: { color: "#e53935" },
  editedText: { color: "#aaa", fontSize: 11, marginTop: 2 },
});
