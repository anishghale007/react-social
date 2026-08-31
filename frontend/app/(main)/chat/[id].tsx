import { useEffect, useState, useRef } from "react";
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useChatStore } from "../../../src/store/chatStore";
import { useAuthStore } from "../../../src/store/authStore";
import { formatMessageTime } from "@/utils/dateFormat";
import TypingIndicator from "@/components/TypingIndicator";

export default function ChatScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const {
    activeMessages,
    fetchMessages,
    joinConversation,
    sendMessage,
    markAsRead,
    emitTyping,
    typingUsers,
  } = useChatStore();
  const [text, setText] = useState("");
  const listRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: name ?? "Chat" });
    joinConversation(id);
    fetchMessages(id);
    markAsRead(id);

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      emitTyping(id, false);
    };
  }, [id]);

  const handleTextChange = (value: string) => {
    setText(value);

    emitTyping(id, true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(id, false);
    }, 2000); // stop showing "typing" after 2s of inactivity
  };

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage(id, text.trim());
    setText("");
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    emitTyping(id, false); // stop indicator immediately on send
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={"padding"}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={activeMessages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isMine = item.senderId === user?.id;
          return (
            <View style={[styles.bubbleRow, isMine && styles.bubbleRowMine]}>
              <View
                style={[
                  styles.bubble,
                  isMine ? styles.bubbleMine : styles.bubbleTheirs,
                ]}
              >
                <Text style={isMine ? styles.textMine : styles.textTheirs}>
                  {item.content}
                </Text>
                <Text
                  style={[
                    styles.timeText,
                    isMine ? styles.timeMine : styles.timeTheirs,
                  ]}
                >
                  {formatMessageTime(item.createdAt)}
                </Text>
              </View>
            </View>
          );
        }}
        inverted
        ListFooterComponent={typingUsers[id] ? <TypingIndicator /> : null}
        contentContainerStyle={{ padding: 12 }}
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
          onChangeText={handleTextChange}
          placeholder="Message..."
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
          disabled={!text.trim()}
          onPress={handleSend}
        >
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubbleRow: { flexDirection: "row", marginVertical: 4 },
  bubbleRowMine: { justifyContent: "flex-end" },
  bubble: { maxWidth: "75%", padding: 12, borderRadius: 16 },
  bubbleMine: { backgroundColor: "#111", borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: "#eee", borderBottomLeftRadius: 4 },
  textMine: { color: "#fff" },
  textTheirs: { color: "#111" },
  inputRow: {
    flexDirection: "row",
    padding: 12,
    marginBottom: 12,
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
  sendButton: {
    backgroundColor: "#111",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  sendButtonDisabled: {
    backgroundColor: "#ccc",
  },
  sendText: { color: "#fff", fontWeight: "600" },
  timeText: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  timeMine: {
    color: "rgba(255,255,255,0.6)",
  },
  timeTheirs: {
    color: "rgba(0,0,0,0.4)",
  },
  typingRow: { paddingHorizontal: 16, paddingVertical: 4 },
  typingText: { fontSize: 12, color: "#888", fontStyle: "italic" },
});
