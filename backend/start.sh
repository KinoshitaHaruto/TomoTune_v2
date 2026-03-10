#!/bin/bash
# Render用の起動スクリプト

# データベースの初期化（初回起動時のみ）
if [ ! -f "tomoTune.db" ]; then
    echo "データベースを初期化しています..."
    python init_db.py
fi

# アプリケーションの起動
# PORT環境変数が設定されている場合はそれを使用、なければ8000を使用
PORT=${PORT:-8000}
python -m uvicorn main:app --host 0.0.0.0 --port $PORT

