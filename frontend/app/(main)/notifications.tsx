import { useEffect } from "react";
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useNotificationsStore } from "../../src/store/notificationsStore";
import { Notification } from "../../src/features/notifications/types";
import { formatMessageTime } from "../../src/utils/dateFormat";

function notificationText(n: Notification): string {
  const name = n.actor.displayName ?? n.actor.username;
  switch (n.type) {
    case "LIKE":
      return `${name} liked your post`;
    case "COMMENT":
      return `${name} commented on your post`;
    case "FOLLOW":
      return `${name} started following you`;
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, isLoading, fetchNotifications, markAllAsRead } =
    useNotificationsStore();

  useEffect(() => {
    fetchNotifications();
    markAllAsRead(); // opening the screen implicitly reads everything, like most apps do
  }, []);

  const handlePress = (n: Notification) => {
    if (n.type === "FOLLOW") {
      router.push({ pathname: "/profile/[id]", params: { id: n.actorId } });
    } else if (n.postId) {
      router.push({
        pathname: "/post/[id]/comments",
        params: { id: n.postId },
      });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={notifications}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.row, !item.isRead && styles.unreadRow]}
          onPress={() => handlePress(item)}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(item.actor.displayName ?? item.actor.username)[0].toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.text}>{notificationText(item)}</Text>
            <Text style={styles.time}>{formatMessageTime(item.createdAt)}</Text>
          </View>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <Text style={styles.empty}>No notifications yet</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  unreadRow: { backgroundColor: "#f9f9ff" },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: { color: "#fff", fontWeight: "700" },
  text: { fontSize: 14, color: "#111" },
  time: { fontSize: 12, color: "#aaa", marginTop: 2 },
  empty: { textAlign: "center", marginTop: 60, color: "#999" },
});
