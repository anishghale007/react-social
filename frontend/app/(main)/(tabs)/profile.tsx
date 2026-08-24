import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../src/store/authStore';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(user?.displayName ?? user?.username ?? '?')[0]?.toUpperCase()}
        </Text>
      </View>
      <Text style={styles.name}>{user?.displayName ?? user?.username}</Text>
      <Text style={styles.username}>@{user?.username}</Text>
      <Text style={styles.username}>{user?.email}</Text>
      {user?.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}

      <TouchableOpacity style={styles.editButton} onPress={() => router.push('/profile/edit')}>
        <Text style={styles.editButtonText}>Edit Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingTop: 40, backgroundColor: '#fff' },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 28 },
  name: { fontSize: 18, fontWeight: '600', color: '#111' },
  username: { fontSize: 14, color: '#888', marginTop: 4 },
  bio: { fontSize: 14, color: '#333', marginTop: 12, textAlign: 'center', paddingHorizontal: 32 },
  editButton: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  editButtonText: { color: '#111', fontWeight: '600' },
  logoutButton: { marginTop: 16, padding: 14 },
  logoutText: { color: '#e53935', fontWeight: '600' },
});