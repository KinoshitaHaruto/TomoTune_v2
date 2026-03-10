from database import engine, SessionLocal, Base
from models import User, Song, MusicType, Post
from data import songs, users, music_types
import os

# BASE_URL = "http://127.0.0.1:8000"
def init_database():
    print("データベース構築を開始...")

    # テーブルを全部作る (CREATE TABLE文の発行)
    # models.py で定義した User, Songの箱が作られる
    Base.metadata.create_all(bind=engine)
    print("テーブル作成完了")

    # DBを開く
    db = SessionLocal()

    try:
        # --- ユーザーの登録 ---
        # data.py の users リストから登録
        for u in users:
            # 重複チェック: IDが既にあるか
            existing = db.query(User).filter(User.id == u["id"]).first()
            if not existing:
                new_user = User(
                    id=u["id"],
                    name=u["name"],
                    music_type_code=u["music_type_code"]
                )
                db.add(new_user)
                print(f"ユーザー追加: {u['name']}")

        # --- 曲の登録 ---
        # data.py の songs リストから登録
        for s in songs:
            # 重複チェック: タイトルで確認
            existing = db.query(Song).filter(Song.title == s["title"]).first()
            if not existing:
                new_song = Song(
                    title=s["title"],
                    artist=s["artist"],
                    url=s["url"],
                    parameters=s["parameters"]
                )
                db.add(new_song)
                print(f"曲追加: {s['title']}")
        
        # --- Music Typeの登録 ---
        for t in music_types:
            existing = db.query(MusicType).filter(MusicType.code == t["code"]).first()
            
            if existing:
                # 更新 (CSVの内容で上書き)
                existing.name = t["name"]
                existing.description = t["description"]
                print(f"タイプ更新: {t['code']}")
            else:
                # 新規作成
                new_type = MusicType(
                    code=t["code"],
                    name=t["name"],
                    description=t["description"]
                )
                db.add(new_type)
                print(f"タイプ追加: {t['code']}")

        # まとめて保存 (コミット)
        db.commit()
        print("データベースの初期化が完了")
    except Exception as e:
        print(f"エラーが発生: {e}")
        db.rollback() # 失敗したら取り消す
    finally:
        db.close() # 必ず閉じる

if __name__ == "__main__":
    init_database()
