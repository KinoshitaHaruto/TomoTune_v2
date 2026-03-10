from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func # 集計用(COUNTとか)
from datetime import datetime
import uuid
from models import User, Song, LikeLog, Post, Comment, Follow

# --- 曲の操作 ---

def get_all_songs(db: Session):
    """全曲リストを取得する"""
    return db.query(Song).all()

def get_song_by_id(db: Session, song_id: int):
    """IDで曲を探す"""
    return db.query(Song).filter(Song.id == song_id).first()

# --- ユーザーの操作 ---
# 名前からユーザーを探す
def get_user_by_name(db: Session, name: str):
    return db.query(User).filter(User.name == name).first()

# IDからユーザーを探す
def get_user_by_id(db: Session, user_id: str):
    return db.query(User).filter(User.id == user_id).first()

# 新しいユーザーを登録する
def create_user(db: Session, name: str):
    # UUID4 (ランダムなID) を生成して文字列にする
    new_id = str(uuid.uuid4())
    
    new_user = User(
        id=new_id,
        name=name,
        music_type_code=None
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

def get_test_user(db: Session):
    """
    開発用のテストユーザーを取得する
    """
    test_userID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
    return db.query(User).filter(User.id == test_userID).first()


# --- ❤️の操作 ---

def create_like(db: Session, user_id: str, song_id: int):
    """ハートログをDBに保存する"""
    new_like = LikeLog(
        user_id=user_id,
        song_id=song_id,
        timestamp=datetime.now()
    )
    db.add(new_like)
    db.commit()
    db.refresh(new_like) # 念のため最新情報を読み込む
    return new_like

def count_likes(db: Session, song_id: int, user_id: str) -> int:
    """
    特定のユーザーがその曲を何回ハートしたか数える
    SQL: SELECT COUNT(*) FROM like_logs WHERE user_id=... AND song_id=...
    """
    return db.query(LikeLog).filter(
        LikeLog.user_id == user_id,
        LikeLog.song_id == song_id
    ).count()


def get_favorite_song_ids(db: Session, user_id: str, threshold: int = 5):
    """
    特定ユーザーが、threshold回以上いいねした曲ID一覧を返す
    """
    rows = (
        db.query(LikeLog.song_id, func.count(LikeLog.id).label("c"))
        .filter(LikeLog.user_id == user_id)
        .group_by(LikeLog.song_id)
        .having(func.count(LikeLog.id) >= threshold)
        .all()
    )
    return [row[0] for row in rows]

def delete_like_log(db: Session, user_id: str, song_id: int):
    """
    特定の曲に対するユーザーの最新のいいねログを1件削除する
    """
    like_log = (
        db.query(LikeLog)
        .filter(LikeLog.user_id == user_id, LikeLog.song_id == song_id)
        .order_by(LikeLog.timestamp.desc())
        .first()
    )
    if like_log:
        db.delete(like_log)
        db.commit()
        return True
    return False


# --- 投稿の操作 ---

def create_post(db: Session, user_id: str, song_id: int, comment: str) -> Post:
    """投稿を1件作成して保存する"""
    new_post = Post(
        user_id=user_id,
        song_id=song_id,
        comment=comment,
    )
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    return new_post


def get_post_by_id(db: Session, post_id: int) -> Post:
    """投稿をIDで取得する"""
    return (
        db.query(Post)
        .options(
            joinedload(Post.user).joinedload(User.music_type),
            joinedload(Post.song),
            joinedload(Post.comments).joinedload(Comment.user).joinedload(User.music_type),
        )
        .filter(Post.id == post_id)
        .first()
    )


def get_recent_posts(db: Session, limit: int = 50):
    """最新の投稿を新しい順に取得する（ユーザー/曲/コメントも取得）"""
    return (
        db.query(Post)
        .options(
            # 関連オブジェクトを一度に取得してN+1を避ける
            joinedload(Post.user).joinedload(User.music_type),
            joinedload(Post.song),
            joinedload(Post.comments).joinedload(Comment.user).joinedload(User.music_type),
        )
        .order_by(Post.created_at.desc())
        .limit(limit)
        .all()
    )


# --- コメントの操作 ---

def create_comment(db: Session, post_id: int, user_id: str, content: str) -> Comment:
    """コメントを追加する"""
    new_comment = Comment(
        post_id=post_id,
        user_id=user_id,
        content=content,
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    return new_comment


def get_comments_by_post(db: Session, post_id: int):
    """特定の投稿に紐づくコメント一覧を取得（新しい順）"""
    return (
        db.query(Comment)
        .filter(Comment.post_id == post_id)
        .order_by(Comment.created_at.asc())
        .all()
    )


# --- フォローの操作 ---

def create_follow(db: Session, follower_id: str, followed_id: str):
    """フォローを作成（既存なら何もしない）"""
    if follower_id == followed_id:
        return None
    existing = (
        db.query(Follow)
        .filter(Follow.follower_id == follower_id, Follow.followed_id == followed_id)
        .first()
    )
    if existing:
        return existing
    follow = Follow(follower_id=follower_id, followed_id=followed_id)
    db.add(follow)
    db.commit()
    db.refresh(follow)
    return follow


def delete_follow(db: Session, follower_id: str, followed_id: str):
    """フォロー解除"""
    db.query(Follow).filter(
        Follow.follower_id == follower_id, Follow.followed_id == followed_id
    ).delete()
    db.commit()


def is_following(db: Session, follower_id: str, followed_id: str) -> bool:
    return (
        db.query(Follow)
        .filter(Follow.follower_id == follower_id, Follow.followed_id == followed_id)
        .first()
        is not None
    )


def count_followers(db: Session, user_id: str) -> int:
    return db.query(Follow).filter(Follow.followed_id == user_id).count()


def count_followings(db: Session, user_id: str) -> int:
    return db.query(Follow).filter(Follow.follower_id == user_id).count()

