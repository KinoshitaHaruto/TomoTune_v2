"""
既存DBにspotify_idカラムを追加するマイグレーション
使い方: python backend/scripts/migrate_add_spotify_id.py
"""
import os
import sys
import sqlite3

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

DB_PATH = os.path.join(BASE_DIR, "data", "tomoTune.db")

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # カラムが既に存在するか確認
    cursor.execute("PRAGMA table_info(users)")
    columns = [row[1] for row in cursor.fetchall()]

    if "spotify_id" in columns:
        print("spotify_id カラムは既に存在します。スキップします。")
    else:
        cursor.execute("ALTER TABLE users ADD COLUMN spotify_id VARCHAR")
        conn.commit()
        print("spotify_id カラムを追加しました。")

    conn.close()

if __name__ == "__main__":
    migrate()
