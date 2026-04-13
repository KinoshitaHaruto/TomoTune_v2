import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 本番環境では DATABASE_URL 環境変数（Supabase PostgreSQL）を使用
# ローカル開発では SQLite にフォールバック
DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL:
    # Supabase / Heroku 等が返す "postgres://" を SQLAlchemy 用に変換
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
else:
    DB_PATH = os.path.join(BASE_DIR, "data", "tomoTune.db")
    DATABASE_URL = f"sqlite:///{DB_PATH}"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
