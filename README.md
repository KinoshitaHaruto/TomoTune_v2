# TomoTune（トモチューン）

## プロジェクト概要

TomoTuneは音楽特化のSNSアプリで、音楽を通じた新たな交流体験を提供することを目標としています。独自のMusic Type診断を取り入れており、ユーザーの音楽的嗜好を可視化することができます。Music Typeによって、初対面でも感性が近いユーザーや相性のいいユーザーを直感的に見つけられたり、既存の友人同士においても友人の意外な音楽的嗜好や、リアルタイムで動的な診断によって気分の変化も発見できます。SNS機能として、楽曲へのコメント投稿やユーザーフォロー機能などを実装しています。

## URL
[github](https://github.com/KinoshitaHaruto/TomoTune)

[TomoTune](https://tomotune.onrender.com/)

## 使用技術
### バックエンド
- Python 3.x
- FastAPI
- SQLAlchemy
- SQLite

### フロントエンド
- React
- TypeScript
- Vite
- Chakra UI

## セットアップ・実行方法

### バックエンドのセットアップ

1. 仮想環境の作成と有効化
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate
   ```

2. 依存関係のインストール
   ```bash
   pip install -r requirements.txt
   ```

3. データベースの初期化とデータのロード
   ```bash
   python scripts/init_db.py
   ```

4. 開発環境でのサーバー起動
   ```bash
   uvicorn app.main:app --reload
   ```
   サーバーはデフォルトで `http://localhost:8000` で起動します。

### フロントエンドのセットアップ

1. 依存関係のインストール
   ```bash
   cd frontend
   npm install
   ```

2. 開発用サーバーの起動
   ```bash
   npm run dev
   ```
   サーバーはデフォルトで `http://localhost:5173` で起動します。

## ディレクトリ構成

```text
.
├── backend/
│   ├── app/
│   │   ├── api/          # APIのプレフィックスルート定義
│   │   ├── core/         # DB接続などのコア設定
│   │   ├── crud/         # データベース操作ロジック
│   │   ├── services/     # 診断などの各種ビジネスロジック
│   │   ├── models.py     # SQLAlchemyのデータモデル定義
│   │   ├── schemas.py    # Pydanticのリクエスト・レスポンススキーマ
│   │   └── main.py       # FastAPIアプリケーションのエントリーポイント
│   ├── data/             # SQLiteデータベースファイルや初期化用CSV
│   ├── scripts/          # DB初期化、データ更新等のバッチスクリプト
│   └── static/           # 音楽ファイルや画像などの静的リソース
└── frontend/
    └── src/
        ├── components/
        │   └── layout/   # ヘッダーや共通レイアウトコンポーネント
        ├── features/     # 各機能（ドメイン）ごとのコンポーネントとページ
        │   ├── auth/     # 認証・ログイン関連
        │   ├── home/     # ホーム画面・タイムライン関連
        │   ├── music/    # 楽曲再生関連
        │   ├── posts/    # 投稿・シェア関連
        │   └── profile/  # プロフィール表示・診断関連
        ├── App.tsx       # 画面ルーティング設定
        ├── main.tsx      # Reactアプリケーションのエントリーポイント
        ├── config.ts     # APIエンドポイント等の設定ファイル
        └── types.ts      # TypeScriptの共通型定義
```

## 環境変数
`.env.example` を参考に `backend/.env` を作成してください。    
Spotify のクレデンシャルは [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) で取得できます。                                                        

## ライセンス


