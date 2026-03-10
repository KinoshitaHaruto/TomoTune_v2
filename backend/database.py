from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# SQLiteのファイル名
SQLALCHEMY_DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'tomoTune.db')}"

# エンジン
# check_same_thread: False はSQLiteの設定
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# セッションメーカー
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
# autocommit=False: 明示的にコミットしないと変更が保存されない(安全なトランザクション処理のため)

# テーブルの親クラス
Base = declarative_base()

# 依存関係
# APIが呼ばれるたびにDBを開き、終わったら必ず閉じる関数
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()