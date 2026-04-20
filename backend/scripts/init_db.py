"""
初期データ投入スクリプト（スキーマ作成は Alembic が担当）

使い方:
  $ cd backend
  $ python -m scripts.init_db
"""
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

from app.core.database import SessionLocal
from app.models import Song, MusicType
from scripts.data import songs, music_types


def seed_database():
    print("初期データ投入を開始...")
    db = SessionLocal()

    try:
        # --- Music Type の登録 ---
        for t in music_types:
            existing = db.query(MusicType).filter(MusicType.code == t["code"]).first()
            if existing:
                existing.name = t["name"]
                existing.description = t["description"]
                print(f"タイプ更新: {t['code']}")
            else:
                db.add(MusicType(code=t["code"], name=t["name"], description=t["description"]))
                print(f"タイプ追加: {t['code']}")

        # --- 曲の登録 ---
        for s in songs:
            existing = db.query(Song).filter(Song.title == s["title"]).first()
            if not existing:
                db.add(Song(
                    title=s["title"],
                    artist=s["artist"],
                    url=s["url"],
                    parameters=s["parameters"],
                ))
                print(f"曲追加: {s['title']}")
            elif existing.url != s["url"]:
                existing.url = s["url"]
                print(f"曲URL更新: {s['title']} -> {s['url']}")

        db.commit()
        print("初期データ投入完了")
    except Exception as e:
        print(f"エラー: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
