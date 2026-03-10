# TomoTune (ともチューン)

音楽とSNSを融合したWebアプリケーション。
ハッカソン用のプロジェクトです。

## 🛠 環境構築 (Setup)

このリポジトリをクローンした後、以下の手順で環境を作ってください。

### Backend (Python/FastAPI)
```bash
cd backend
# 仮想環境を作成
python -m venv venv

# 仮想環境に入る
# Mac
source venv/bin/activate
# Windows
.\venv\Scripts\activate

# 必要なライブラリ等のインストール
pip install -r requirements.txt
# (pip freeze > requirements.txtによって保存された情報)
```

### frontend (React/ChakraUI)
```bash
```bash
cd frontend
npm install
```

## How to run
### backend
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
```

### frontend
```bash
cd frontend
npm run dev
```

### ngrokサーバー（開発用）
```bash
cd frontend
npm run build   # 環境の保存
ngrok http 8000
```

## 🚀 デプロイ

ハッカソンなどで一時的にデプロイする場合は、[DEPLOY.md](./DEPLOY.md) を参照してください。
Renderを使用することで、ngrokの帯域幅制限を回避できます。

# ログインエラー時
## backend
python .\init_db.py