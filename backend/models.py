from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

# ユーザーテーブル
class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)   # UUIDを使うのでString型
    name = Column(String, index=True)

    # MBTI スコア (0.0 〜 1.0)
    # 初期値は 0.5
    # V_C: ノリ(1.0) vs 静けさ(0.0)
    score_vc = Column(Float, default=0.5) 
    
    # M_A: 雰囲気/Atmosphere(1.0) vs メロディ/Melody(0.0)
    # CSVの instrumentalness が高いほど「雰囲気重視」と解釈
    score_ma = Column(Float, default=0.5) 

    # P_R: 情熱/Passion(1.0) vs 落ち着き/Relax(0.0)
    score_pr = Column(Float, default=0.5) 

    # H_S: 生音/Human(1.0) vs 電子音/Synth(0.0)
    # CSVの acousticness が高いほど「生音」と解釈
    score_hs = Column(Float, default=0.5) 

    # 診断結果のタイプコード
    music_type_code = Column(String, ForeignKey("music_types.code"), nullable=True)

    music_type = relationship("MusicType")

    # リレーション: ユーザーはたくさんの「いいねログ」と「投稿」を持つ
    like_logs = relationship("LikeLog", back_populates="user")
    posts = relationship("Post", back_populates="user")
    comments = relationship("Comment", back_populates="user")
    followers = relationship(
        "Follow",
        foreign_keys="Follow.followed_id",
        back_populates="followed",
        cascade="all,delete-orphan",
    )
    followings = relationship(
        "Follow",
        foreign_keys="Follow.follower_id",
        back_populates="follower",
        cascade="all,delete-orphan",
    )

# Music Typeテーブル
class MusicType(Base):
    __tablename__ = "music_types"

    # 4文字コード (例: "VMPH") を主キーにします
    code = Column(String, primary_key=True, index=True)
    name = Column(String)       # タイプ名 (例: "ノリのいい人")
    description = Column(String) # 説明文

# 曲テーブル
class Song(Base):
    __tablename__ = "songs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    artist = Column(String)
    url = Column(String) # mp3ファイルのパス

    # パラメータを保存する列 (JSON文字列として入れる)
    parameters = Column(String, nullable=True)

    # リレーション: 曲もたくさんの「いいねログ」を持つ
    like_logs = relationship("LikeLog", back_populates="song")
    posts = relationship("Post", back_populates="song")


# いいね履歴テーブル (ログ)
class LikeLog(Base):
    __tablename__ = "like_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # 外部キー: 誰が
    user_id = Column(String, ForeignKey("users.id"))
    
    # 外部キー: どの曲を
    song_id = Column(Integer, ForeignKey("songs.id"))
    
    # いつ (初期値は現在時刻)
    timestamp = Column(DateTime, default=datetime.now)

    # リレーション設定
    user = relationship("User", back_populates="like_logs")
    song = relationship("Song", back_populates="like_logs")


# 投稿テーブル
class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # 誰が
    user_id = Column(String, ForeignKey("users.id"), nullable=False)

    # どの曲を
    song_id = Column(Integer, ForeignKey("songs.id"), nullable=False)

    # 一言コメント
    comment = Column(String, nullable=False)

    # いつ投稿したか
    created_at = Column(DateTime, default=datetime.now)

    # リレーション
    user = relationship("User", back_populates="posts")
    song = relationship("Song", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all,delete")


# 投稿へのコメント
class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    content = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.now)

    # リレーション
    post = relationship("Post", back_populates="comments")
    user = relationship("User", back_populates="comments")


# フォロー関係テーブル
class Follow(Base):
    __tablename__ = "follows"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    follower_id = Column(String, ForeignKey("users.id"), nullable=False)
    followed_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.now)

    follower = relationship("User", foreign_keys=[follower_id], back_populates="followings")
    followed = relationship("User", foreign_keys=[followed_id], back_populates="followers")

    __table_args__ = (
        UniqueConstraint("follower_id", "followed_id", name="uq_follower_followed"),
    )