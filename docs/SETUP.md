# ローカル開発セットアップ

## インストール
- Python 3.11
- Node.js 18以上

## バックエンド
- `backend/.env` を作成（`.env.example` を参考に作成）

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

サーバーは `http://localhost:8000` で起動します。

### 注意

- DBはSupabase（本番と共通）に接続されます
- `python -m scripts.init_db` はローカルで実行しないでください。実行する場合は必ず `R2_PUBLIC_URL` を指定してください：

```bash
R2_PUBLIC_URL=https://pub-708d66c42fff417998fa44be7ecb90eb.r2.dev python -m scripts.init_db
```

## フロントエンド

```bash
cd frontend
npm install
npm run dev
```

サーバーは `http://localhost:5173` で起動します。

## 環境変数

`backend/.env.example` を参考に `backend/.env` を作成してください。

| 変数名 | 説明 |
|---|---|
| `DATABASE_URL` | SupabaseのPostgreSQL接続文字列 |
| `SPOTIFY_CLIENT_ID` | Spotify Developer DashboardのClient ID |
| `SPOTIFY_CLIENT_SECRET` | Spotify Developer DashboardのClient Secret |
| `SPOTIFY_REDIRECT_URI` | `http://127.0.0.1:8000/api/spotify/callback`（ローカル用） |
| `FRONTEND_URL` | `http://localhost:5173`（ローカル用） |
| `R2_PUBLIC_URL` | Cloudflare R2の公開URL |
| `ALLOWED_ORIGINS` | CORS許可オリジン（未設定時はlocalhost） |
