import { useEffect } from 'react';
import { View, FlatList, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRouter } from 'expo-router';
import { useChatStore } from '../../../src/store/chatStore';
import { useAuthStore } from '../../../src/store/authStore';

export default function ConversationsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { conversations, fetchConversations, connect } = useChatStore();

  useEffect(() => {
    connect();
    fetchConversations();
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => router.push('/chat/new')} style={{ marginRight: 12 }}>
          <Text style={{ color: '#111', fontWeight: '600', fontSize: 15 }}>+ New</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const otherMember = item.members.find((m) => m.userId !== user?.id);
          const lastMessage =  item.messages?.[0];

          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() =>
                router.push({
                  pathname: '/chat/[id]',
                  params: { id: item.id, name: otherMember?.user.displayName ?? '' },
                })
              }
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(otherMember?.user.displayName ?? '?')[0]?.toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
        <Text style={[styles.name, item.isUnread && styles.unreadText]}>
          {otherMember?.user.displayName ?? otherMember?.user.username}
        </Text>
        <Text
          style={[styles.preview, item.isUnread && styles.unreadText]}
          numberOfLines={1}
        >
          {lastMessage?.content ?? 'No messages yet'}
        </Text>
      </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No conversations yet</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  name: { fontWeight: '600', fontSize: 15, color: '#111' },
  preview: { color: '#888', fontSize: 13, marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 60, color: '#999' },
  unreadText: { fontWeight: '700', color: '#111' },
unreadDot: {
  width: 10,
  height: 10,
  borderRadius: 5,
  backgroundColor: '#e53935',
  marginLeft: 8,
},
});