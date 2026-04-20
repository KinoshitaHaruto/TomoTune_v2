# TomoTune（トモチューン）

## プロジェクト概要

TomoTuneは音楽特化のSNSアプリで、音楽を通じた新たな交流体験を提供することを目標としています。独自のMusic Type診断を取り入れており、ユーザーの音楽的嗜好を可視化することができます。Music Typeによって、初対面でも感性が近いユーザーや相性のいいユーザーを直感的に見つけられたり、既存の友人同士においても友人の意外な音楽的嗜好や、リアルタイムで動的な診断によって気分の変化も発見できます。SNS機能として、楽曲へのコメント投稿やユーザーフォロー機能などを実装しています。

## URL

- [TomoTune](https://tomo-tune.vercel.app/)
- [GitHub](https://github.com/KinoshitaHaruto/TomoTune)

## 使用技術

### バックエンド
- Python 3.11
- FastAPI
- SQLAlchemy
- PostgreSQL（Supabase）
- Cloudflare R2（MP3配信）

### フロントエンド
- React / TypeScript
- Vite
- Chakra UI

### インフラ
- フロントエンド: Vercel
- バックエンド: Railway
- DB: Supabase
- ストレージ: Cloudflare R2

## ディレクトリ構成

```text
.
├── backend/
│   ├── app/
│   │   ├── api/          # APIルート定義
│   │   ├── core/         # DB接続などのコア設定
│   │   ├── crud/         # データベース操作ロジック
│   │   ├── services/     # 診断などの各種ビジネスロジック
│   │   ├── models.py     # SQLAlchemyのデータモデル定義
│   │   ├── schemas.py    # Pydanticのリクエスト・レスポンススキーマ
│   │   └── main.py       # FastAPIアプリケーションのエントリーポイント
│   ├── alembic/          # DBマイグレーション
│   ├── data/             # 初期データ用CSV
│   ├── scripts/          # DB初期化・データ更新等のバッチスクリプト
│   └── static/           # 画像などの静的リソース
└── frontend/
    └── src/
        ├── components/
        │   └── layout/   # ヘッダーや共通レイアウトコンポーネント
        ├── features/     # 各機能ごとのコンポーネントとページ
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

## ローカル開発

[SETUP.md](./SETUP.md) を参照してください。

## ライセンス
