import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "../types";
import { API_BASE } from "../config";

interface UserContextType {
  user: User | null;
  login: (name: string) => Promise<User | null>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 初期ロード
  useEffect(() => {
    const savedUserId = localStorage.getItem("tomo_user_id");
    if (savedUserId) {
      fetchUser(savedUserId);
    }
  }, []);

  const fetchUser = async (userId: string): Promise<User | null> => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/users/${userId}`);
      if (!res.ok) {
        console.warn("User fetch failed:", res.status);
        // 404ならユーザーが存在しないので消す
        if (res.status === 404) {
             localStorage.removeItem("tomo_user_id");
             localStorage.removeItem("tomo_user_name");
             setUser(null);
        }
        return null;
      }
      const data = await res.json();
      setUser(data);
      // localStorage の表示用の名前も最新化しておく
      if (data?.name) {
        localStorage.setItem("tomo_user_name", data.name);
      }
      return data;
    } catch (err) {
      console.error(err);
      // ネットワークエラー等の場合は消さない（再試行のチャンスを残す）
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (name: string): Promise<User | null> => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      
      // /login は最小限のユーザー情報を返すので、id だけ保存してから
      // /users/{id} を叩いて User 型に揃えたデータを取得する
      localStorage.setItem("tomo_user_id", data.id);
      const fetched = await fetchUser(data.id);
      // name も確実に保存しておく（プロフィール画面の既存実装向け）
      if (fetched?.name) {
        localStorage.setItem("tomo_user_name", fetched.name);
      }
      return fetched ?? null;
    } catch (err) {
      console.error(err);
      alert("ログインに失敗しました");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("tomo_user_id");
    localStorage.removeItem("tomo_user_name");
    setUser(null);
  };

  // ユーザー情報がメモリになくても、localStorageにあれば復元を試みる
  const refreshUser = async () => {
    const targetId = user?.id || localStorage.getItem("tomo_user_id");
    if (targetId) {
      await fetchUser(targetId);
    } else {
        console.warn("No user ID found to refresh.");
    }
  };

  const value = {
    user,
    login,
    logout,
    refreshUser,
    isLoading
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};