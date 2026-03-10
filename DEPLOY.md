# Render デプロイ手順

このドキュメントでは、TomoTuneアプリをRenderにデプロイする手順を説明します。

## 📋 前提条件

1. [Render](https://render.com) のアカウントを作成（GitHubアカウントでサインアップ可能）
2. このリポジトリをGitHubにプッシュ済み

## 🚀 デプロイ手順

### 1. Renderにログイン

[Render Dashboard](https://dashboard.render.com) にアクセスしてログインします。

### 2. 新しいWebサービスを作成

1. Dashboardで「New +」ボタンをクリック
2. 「Web Service」を選択
3. GitHubリポジトリを接続（初回のみ認証が必要）
4. このリポジトリ（tomoTune）を選択

### 3. サービス設定

以下の設定を行います：

- **Name**: `tomoTune`（任意の名前）
- **Region**: `Singapore`（日本に近い）
- **Branch**: `main`（デプロイしたいブランチ）
- **Root Directory**: （空白のまま）
- **Environment**: `Python 3`
- **Build Command**: 
  ```bash
  pip install -r backend/requirements.txt && cd frontend && npm install && npm run build
  ```
- **Start Command**: 
  ```bash
  cd backend && if [ ! -f "tomoTune.db" ]; then python init_db.py; fi && python -m uvicorn main:app --host 0.0.0.0 --port $PORT
  ```
- **Plan**: `Free`（無料プラン）

### 4. 環境変数の設定（オプション）

必要に応じて環境変数を設定できます。現在は特に必須の環境変数はありません。

### 5. デプロイ開始

「Create Web Service」をクリックしてデプロイを開始します。

初回デプロイには5-10分程度かかります。

### 6. デプロイ完了後の確認

デプロイが完了すると、`https://tomoTune.onrender.com` のようなURLが生成されます。
このURLにアクセスしてアプリが正常に動作することを確認してください。

## ⚠️ 注意事項

### 無料プランの制限

- **スリープ**: 15分間アクセスがないと自動的にスリープします。次回アクセス時に自動的に起動しますが、起動に30秒〜1分程度かかります。
- **データベース**: SQLiteファイルは一時的なストレージに保存されます。再デプロイやサービス再起動時にデータがリセットされる可能性があります。
- **帯域幅**: 無料プランでもMP3ファイルの配信は可能ですが、大量のトラフィックがある場合は制限に達する可能性があります。

### トラブルシューティング

#### デプロイが失敗する場合

1. **Build Logを確認**: Render Dashboardの「Logs」タブでエラーメッセージを確認
2. **依存関係の確認**: `backend/requirements.txt` と `frontend/package.json` が正しいか確認
3. **パスの確認**: ファイルパスが正しいか確認（特に静的ファイルのパス）

#### データベースが初期化されない場合

Render Dashboardの「Shell」タブから以下のコマンドを実行して手動で初期化できます：

```bash
cd backend
python init_db.py
```

#### MP3ファイルが読み込めない場合

静的ファイルのパスを確認してください。`backend/main.py` の `STATIC_DIR` が正しく設定されているか確認します。

## 🔄 更新方法

コードを更新したら、GitHubにプッシュするだけで自動的に再デプロイされます。

手動で再デプロイしたい場合は、Render Dashboardの「Manual Deploy」から「Deploy latest commit」をクリックします。

## 📝 その他のデプロイ方法

### Railway（代替案）

1. [Railway](https://railway.app) にアカウント作成
2. GitHubリポジトリを接続
3. 新しいプロジェクトを作成
4. 環境変数 `PORT` を設定（Railwayが自動設定する場合もある）
5. デプロイ

### Fly.io（代替案）

1. [Fly.io](https://fly.io) にアカウント作成
2. `flyctl` CLIをインストール
3. `fly launch` でデプロイ

## 💡 ハッカソン向けのヒント

- デモ時は、スリープを防ぐために定期的にアクセスするか、[UptimeRobot](https://uptimerobot.com) などの無料サービスでpingを送る
- 重要なデータは定期的にバックアップを取る
- デプロイ前にローカルで動作確認を必ず行う

