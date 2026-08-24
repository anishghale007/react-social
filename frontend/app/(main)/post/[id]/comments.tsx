import React, { useEffect, useState } from "react";
import {
  View,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useAuthStore } from "../../../../src/store/authStore";
import { formatMessageTime } from "../../../../src/utils/dateFormat";
import { postsApi } from "@/features/auth/posts/api/posts.api";
import { Comment } from "@/features/auth/posts/types";
import { usePostsStore } from "@/store/postStore";

export default function CommentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { incrementCommentCount, decrementCommentCount } = usePostsStore();

  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  const loadComments = () => {
    postsApi.getComments(id).then((res) => {
      setComments(res.data);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadComments();
  }, [id]);

  const handlePost = async () => {
    if (!text.trim()) return;
    setPosting(true);
    try {
      const comment = await postsApi.createComment(id, text.trim());
      setComments((prev) => [...prev, comment]);
      incrementCommentCount(id);
      setText("");
    } catch {
      Alert.alert("Error", "Failed to post comment");
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = (commentId: string) => {
    Alert.alert("Delete comment?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await postsApi.deleteComment(commentId);
            setComments((prev) => prev.filter((c) => c.id !== commentId));
            decrementCommentCount(id);
          } catch {
            Alert.alert("Error", "Failed to delete comment");
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isMine = item.authorId === user?.id;
          return (
            <View style={styles.commentRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.author.displayName ??
                    item.author.username)[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.commentHeader}>
                  <Text style={styles.name}>
                    {item.author.displayName ?? item.author.username}
                  </Text>
                  <Text style={styles.time}>
                    {formatMessageTime(item.createdAt)}
                  </Text>
                </View>
                <Text style={styles.commentText}>{item.content}</Text>
              </View>
              {isMine && (
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>No comments yet. Be the first!</Text>
        }
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
      />

      <View
        style={[
          styles.inputRow,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Add a comment..."
          multiline
        />
        <TouchableOpacity
          style={styles.postButton}
          onPress={handlePost}
          disabled={posting}
        >
          {posting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.postButtonText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  commentRow: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-start",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  commentHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { fontWeight: "600", fontSize: 14, color: "#111" },
  time: { fontSize: 12, color: "#aaa" },
  commentText: { fontSize: 14, color: "#333", marginTop: 2, lineHeight: 19 },
  deleteText: { color: "#e53935", fontSize: 12, fontWeight: "600" },
  empty: { textAlign: "center", marginTop: 60, color: "#999" },
  inputRow: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
  },
  postButton: {
    backgroundColor: "#111",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  postButtonText: { color: "#fff", fontWeight: "600" },
});
