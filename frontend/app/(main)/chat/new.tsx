import React, { useEffect, useState } from 'react';
import { View, FlatList, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { usersApi } from '../../../src/features/users/api/users.api';
import { useChatStore } from '../../../src/store/chatStore';
import { User } from '../../../src/features/auth/types';

export default function NewMessageScreen() {
  const router = useRouter();
  const { startConversation } = useChatStore();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);

  useEffect(() => {
    usersApi
      .getAll()
      .then(setUsers)
      .finally(() => setIsLoading(false));
  }, []);

  const handleSelectUser = async (recipientId: string) => {
    setStartingId(recipientId);
    try {
      const conversation = await startConversation(recipientId);
      const otherMember = conversation.members.find((m) => m.userId === recipientId);
      router.replace({
        pathname: '/chat/[id]',
        params: { id: conversation.id, name: otherMember?.user.displayName ?? '' },
      });
    } finally {
      setStartingId(null);
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
    <View style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => handleSelectUser(item.id)}
            disabled={startingId !== null}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(item.displayName ?? item.username)[0].toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.displayName ?? item.username}</Text>
              <Text style={styles.username}>@{item.username}</Text>
            </View>
            {startingId === item.id && <ActivityIndicator size="small" />}
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No other users yet</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontWeight: '700' },
  name: { fontWeight: '600', fontSize: 15, color: '#111' },
  username: { color: '#888', fontSize: 13 },
  empty: { textAlign: 'center', marginTop: 60, color: '#999' },
});