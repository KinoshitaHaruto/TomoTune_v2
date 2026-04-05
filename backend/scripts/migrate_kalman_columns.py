"""
診断ロジック（カルマンフィルター）対応のマイグレーション

追加カラム:
  users        : var_vc, var_ma, var_pr, var_hs (Float, default=0.25), last_liked_at (DateTime)
  like_logs    : observation_source (Text)

実行方法:
  cd backend
  python scripts/migrate_kalman_columns.py
"""
import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

import sqlite3
from app.core.database import DB_PATH


def migrate():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    added = []

    # --- users テーブル ---
    cur.execute("PRAGMA table_info(users)")
    user_cols = {row[1] for row in cur.fetchall()}

    for col in ("var_vc", "var_ma", "var_pr", "var_hs"):
        if col not in user_cols:
            cur.execute(f"ALTER TABLE users ADD COLUMN {col} REAL DEFAULT 0.25")
            added.append(f"users.{col}")

    if "last_liked_at" not in user_cols:
        cur.execute("ALTER TABLE users ADD COLUMN last_liked_at DATETIME")
        added.append("users.last_liked_at")

    # --- like_logs テーブル ---
    cur.execute("PRAGMA table_info(like_logs)")
    like_cols = {row[1] for row in cur.fetchall()}

    if "observation_source" not in like_cols:
        cur.execute("ALTER TABLE like_logs ADD COLUMN observation_source TEXT")
        added.append("like_logs.observation_source")

    conn.commit()
    conn.close()

    if added:
        print(f"✅ カラム追加完了: {', '.join(added)}")
    else:
        print("ℹ️  既にマイグレーション済みです")


if __name__ == "__main__":
    migrate()
