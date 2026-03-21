// frontend/src/types.ts

export interface MusicType {
  code: string;
  name: string;
  description: string;
}

// コンポーネントで使い回せるように切り出しておく
export interface UserScores {
  VC: number;
  MA: number;
  PR: number;
  HS: number;
}

export interface User {
  id: string;
  name: string;
  scores: UserScores; 
  
  // まだ診断されていない(null)場合や、コードだけの取得に備えて ? (Optional) にする
  music_type_code?: string; 
  music_type?: MusicType;   
  follower_count?: number;
  following_count?: number;
  viewer_is_following?: boolean;
}

export interface Song {
  id: number;
  title: string;
  artist: string;
  url: string;
  parameters?: string;
  spotify_track_id?: string | null;
  album_image?: string | null;
}

export interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  album_image: string | null;
  spotify_url: string;
  duration_ms: number;
  preview_url: string | null;
}

export interface Comment {
  id: number;
  content: string;
  created_at: string;
  user: {
    id: string;
    name: string;
    music_type?: MusicType | null;
  } | null;
}

export interface Post {
  id: number;
  comment: string;
  created_at: string;
  user: {
    id: string;
    name: string;
    music_type?: MusicType | null;
  } | null;
  song: Song;
  comments?: Comment[];
}