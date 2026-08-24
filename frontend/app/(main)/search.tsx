import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { usersApi } from '../../src/features/users/api/users.api';
import { User } from '@/features/auth/types';
import { Post } from '@/features/auth/posts/types';
import { postsApi } from '@/features/auth/posts/api/posts.api';
import PostCard from '@/features/auth/components/PostCard';

type Tab = 'users' | 'posts';

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const runSearch = useCallback(
    debounce(async (q: string, activeTab: Tab) => {
      if (!q.trim()) {
        setUsers([]);
        setPosts([]);
        return;
      }
      setIsLoading(true);
      try {
        if (activeTab === 'users') {
          const res = await usersApi.search(q.trim());
          setUsers(res);
        } else {
          const res = await postsApi.search(q.trim());
          setPosts(res.data);
        }
      } finally {
        setIsLoading(false);
      }
    }, 350),
    [],
  );

  const handleChangeText = (text: string) => {
    setQuery(text);
    runSearch(text, tab);
  };

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
    runSearch(query, newTab);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Search users or posts..."
        value={query}
        onChangeText={handleChangeText}
        autoFocus
      />

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'users' && styles.tabActive]}
          onPress={() => handleTabChange('users')}
        >
          <Text style={[styles.tabText, tab === 'users' && styles.tabTextActive]}>Users</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'posts' && styles.tabActive]}
          onPress={() => handleTabChange('posts')}
        >
          <Text style={[styles.tabText, tab === 'posts' && styles.tabTextActive]}>Posts</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : tab === 'users' ? (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.userRow}
              onPress={() => router.push({ pathname: '/profile/[id]', params: { id: item.id } })}
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
          ListEmptyComponent={
            query ? <Text style={styles.empty}>No users found</Text> : null
          }
        />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PostCard post={item} isOwner={false} onEdit={() => {}} onDelete={() => {}} />
          )}
          ListEmptyComponent={
            query ? <Text style={styles.empty}>No posts found</Text> : null
          }
        />
      )}
    </View>
  );
}

// simple debounce helper, inlined to avoid adding a dependency
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 12 },
  input: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
  },
  tabRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 12, marginBottom: 4, gap: 8 },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#f0f0f0' },
  tabActive: { backgroundColor: '#111' },
  tabText: { color: '#555', fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: '#fff' },
  userRow: {
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
  empty: { textAlign: 'center', marginTop: 40, color: '#999' },
});