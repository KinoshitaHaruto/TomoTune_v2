// 開発中(npm run dev)ならローカルURL
// 本番ビルドでは VITE_API_BASE 環境変数を使う（Vercel で設定）
const BACKEND_URL = import.meta.env.VITE_API_BASE ?? "";

export const API_BASE = import.meta.env.DEV
  ? "http://127.0.0.1:8000/api"
  : `${BACKEND_URL}/api`;

export const MEDIA_BASE = import.meta.env.DEV
  ? "http://127.0.0.1:8000"
  : BACKEND_URL;