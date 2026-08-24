export interface PublicProfile {
  id: string;
  username: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  createdAt: string;
  isFollowing: boolean;
  _count: {
    posts: number;
    followers: number;
    following: number;
  };
}

export interface UpdateProfilePayload {
  displayName?: string;
  bio?: string;
}

export interface FollowUser {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}
