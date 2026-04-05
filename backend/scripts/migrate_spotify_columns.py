"""
Songテーブルに Spotify 連携用カラムを追加するマイグレーション

実行方法:
  cd backend
  python scripts/migrate_spotify_columns.py
"""
import os
import sys
import sqlite3

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

from app.core.database import DB_PATH

db_path = DB_PATH

def migrate():
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # 既存カラムを確認
    cur.execute("PRAGMA table_info(songs)")
    existing = {row[1] for row in cur.fetchall()}

    added = []

    if "spotify_track_id" not in existing:
        cur.execute("ALTER TABLE songs ADD COLUMN spotify_track_id TEXT")
        added.append("spotify_track_id")

    if "album_image" not in existing:
        cur.execute("ALTER TABLE songs ADD COLUMN album_image TEXT")
        added.append("album_image")

    conn.commit()
    conn.close()

    if added:
        print(f"✅ カラム追加完了: {', '.join(added)}")
    else:
        print("ℹ️  既にマイグレーション済みです")

if __name__ == "__main__":
    migrate()
