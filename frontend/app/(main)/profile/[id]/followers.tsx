import { useEffect, useState } from "react";
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { usersApi } from "../../../../src/features/users/api/users.api";
import { FollowUser } from "../../../../src/features/users/types";

export default function FollowersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    usersApi.getFollowers(id).then((res) => {
      setUsers(res);
      setIsLoading(false);
    });
  }, [id]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={users}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.row}
          onPress={() =>
            router.push({ pathname: "/profile/[id]", params: { id: item.id } })
          }
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(item.displayName ?? item.username)[0].toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.name}>{item.displayName ?? item.username}</Text>
            <Text style={styles.username}>@{item.username}</Text>
          </View>
        </TouchableOpacity>
      )}
      ListEmptyComponent={<Text style={styles.empty}>No followers yet</Text>}
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: { color: "#fff", fontWeight: "700" },
  name: { fontWeight: "600", fontSize: 15, color: "#111" },
  username: { color: "#888", fontSize: 13 },
  empty: { textAlign: "center", marginTop: 40, color: "#999" },
});
