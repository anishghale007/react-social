import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePostsStore } from '@/store/postStore';

export default function EditPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { posts, updatePost } = usePostsStore();
  const post = posts.find((p) => p.id === id);

  const [content, setContent] = useState(post?.content ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!post) {
      Alert.alert('Not found', 'This post no longer exists.');
      router.back();
    }
  }, [post]);

  const handleSave = async () => {
    if (!content.trim() || !id) return;
    setSaving(true);
    try {
      await updatePost(id, content.trim());
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to update post');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={content}
        onChangeText={setContent}
        multiline
        autoFocus
      />
      <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Changes</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});