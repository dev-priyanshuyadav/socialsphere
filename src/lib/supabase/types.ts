export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
};

export type Post = {
  id: string;
  author_id: string;
  content: string;
  media_url: string | null;
  created_at: string;
  profiles?: Profile;
  likes?: { user_id: string }[];
  comments?: { id: string }[];
};

export type FeedPost = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  time: string;
  text: string;
  image: string | null;
  mediaType: 'image' | 'video' | null;
  likes: number;
  comments: number;
  liked: boolean;
  authorId: string;
};

export type FeedUser = {
  id: string;
  email: string | undefined;
  profile: Omit<Profile, 'created_at'> & { website: string | null };
  stats: {
    posts: number;
    followers: number;
    following: number;
  };
};

export type FeedResult = {
  user: FeedUser | null;
  bookmarks: string[];
  posts: FeedPost[];
};
