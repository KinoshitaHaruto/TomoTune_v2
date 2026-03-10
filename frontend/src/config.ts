// 開発中(npm run dev)ならローカルURL、本番(ビルド後)なら「自分と同じ場所」を使う
export const API_BASE = import.meta.env.DEV ? "http://127.0.0.1:8000" : "";