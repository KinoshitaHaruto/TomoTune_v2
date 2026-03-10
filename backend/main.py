import logging
import json
from fastapi import FastAPI, Depends, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
import os

import models
import crud
from database import get_db

import typeCal


LIKE_MILESTONE = 5

# How to run
# cd backend
# uvicorn main:app --reload
API_URL="http://127.0.0.1:8000"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("uvicorn")

app = FastAPI()

# ngrok用にCORSを全許可
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],    
    allow_headers=["*"],
)

# --- パス設定 ---
# backendディレクトリの場所
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# 音楽ファイルの場所
STATIC_DIR = os.path.join(BASE_DIR, "static")
# タイプ画像の場所
TYPE_PICTURES_DIR = os.path.join(BASE_DIR, "type_pictures")
# Reactのビルド成果物の場所 (backendの親のfrontendのdist)
DIST_DIR = os.path.join(os.path.dirname(BASE_DIR), "frontend", "dist")

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.mount("/type_pictures", StaticFiles(directory=TYPE_PICTURES_DIR), name="type_pictures")

# --- リクエスト / レスポンスモデル ---
class LoginRequest(BaseModel):
    name: str

class LikeRequest(BaseModel):
    song_id: int
    user_id: str


class PostCreateRequest(BaseModel):
    user_id: str
    song_id: int
    comment: str

class CommentCreateRequest(BaseModel):
    user_id: str
    content: str


class FollowRequest(BaseModel):
    user_id: str  # follower

class UnlikeRequest(BaseModel):
    song_id: int
    user_id: str


# --- API ---

# 全曲取得API
@app.get("/songs")
def read_songs(db: Session = Depends(get_db)):
    return crud.get_all_songs(db)

@app.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    # その名前の人がいるか探す
    user = crud.get_user_by_name(db, req.name)
    
    # いなければ新しく作る
    if not user:
        user = crud.create_user(db, req.name)
        logger.info(f"✨ New User Created: {user.name} ({user.id})")
    else:
        logger.info(f"🔙 Login: {user.name} ({user.id})")
    
    # ユーザー情報を返す
    return user

# 診断結果受け取り用モデル
class DiagnosisRequest(BaseModel):
    user_id: str
    score_vc: float # 0.0 - 1.0
    score_ma: float
    score_pr: float
    score_hs: float

# 診断結果保存API
@app.post("/diagnosis")
def save_diagnosis(req: DiagnosisRequest, db: Session = Depends(get_db)):
    user = crud.get_user_by_id(db, req.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 1. スコアを更新
    user.score_vc = req.score_vc
    user.score_ma = req.score_ma
    user.score_pr = req.score_pr
    user.score_hs = req.score_hs

    # 2. タイプコードを判定 (typeCal再利用)
    new_code = typeCal.determine_music_type_code(
        req.score_vc, req.score_ma, req.score_pr, req.score_hs
    )
    user.music_type_code = new_code

    db.add(user)
    db.commit()
    
    logger.info(f"📝 Diagnosis Updated: {user.name} -> {new_code}")

    return {"status": "ok", "music_type_code": new_code}

# 詳細取得用API (Profile画面用)
@app.get("/users/{user_id}")
def get_user_detail(user_id: str, viewer_id: str | None = None, db: Session = Depends(get_db)):
    # joinedloadでMusicType情報も結合して取得
    user = db.query(models.User).options(joinedload(models.User.music_type)).filter(models.User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 診断結果データの整形
    music_type_data = None
    if user.music_type:
        music_type_data = {
            "code": user.music_type.code,
            "name": user.music_type.name,
            "description": user.music_type.description
        }

    follower_count = crud.count_followers(db, user.id)
    following_count = crud.count_followings(db, user.id)
    viewer_is_following = False
    if viewer_id:
        viewer_is_following = crud.is_following(db, viewer_id, user.id)

    return {
        "id": user.id,
        "name": user.name,
        "scores": {
            "VC": user.score_vc,
            "MA": user.score_ma,
            "PR": user.score_pr,
            "HS": user.score_hs
        },
        "music_type": music_type_data,
        "music_type_code": user.music_type_code,
        "follower_count": follower_count,
        "following_count": following_count,
        "viewer_is_following": viewer_is_following,
    }

@app.post("/likes", status_code=status.HTTP_201_CREATED)
def create_like(like: LikeRequest, db: Session = Depends(get_db)):
    # 曲の存在チェック
    target_song = crud.get_song_by_id(db, like.song_id)
    if target_song is None:
        raise HTTPException(status_code=404, detail="曲が見つかりません")

    # テストユーザー取得 (DBから)
    user = crud.get_user_by_id(db, like.user_id)
    if not user:
        raise HTTPException(status_code=500, detail="テストユーザーがいません")
    
    if target_song.parameters:
        # 新しいスコアを計算
        new_vc, new_ma, new_pr, new_hs = typeCal.calculate_new_scores(user, target_song.parameters)
        
        # 新しいタイプコードを決定
        new_type_code = typeCal.determine_music_type_code(new_vc, new_ma, new_pr, new_hs)
        
        # ユーザー情報を更新
        user.score_vc = new_vc
        user.score_ma = new_ma
        user.score_pr = new_pr
        user.score_hs = new_hs
        user.music_type_code = new_type_code
        
        db.add(user)

    # いいね保存 (DBへ)
    crud.create_like(db, user.id, like.song_id)
    
    # 集計
    total = crud.count_likes(db, like.song_id, user.id)
    
    # 5回以上押されていれば「お気に入り扱い」
    is_favorite = (total >= LIKE_MILESTONE)
    # ちょうど5回目のときだけ「マイルストーン達成」とする（トースト用）
    just_reached_milestone = (total == LIKE_MILESTONE)

    logger.info(f"[❤️]: User: {user.name} | SongID: {like.song_id} | Total: {total}")

    return {
        "status": "ok", 
        "total_likes": total, 
        "is_milestone": just_reached_milestone,
        "is_favorite": is_favorite,
        "user_music_type": user.music_type_code, 
        "scores": {
            "VC": user.score_vc,
            "MA": user.score_ma,
            "PR": user.score_pr,
            "HS": user.score_hs
        }
    }


@app.get("/favorites/{user_id}")
def get_favorites(user_id: str, db: Session = Depends(get_db)):
    """
    ログインユーザーのお気に入り曲ID一覧を返すAPI
    """
    user = crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    song_ids = crud.get_favorite_song_ids(db, user_id, threshold=LIKE_MILESTONE)
    return {"song_ids": song_ids}

@app.delete("/likes", status_code=status.HTTP_200_OK)
def delete_like(req: UnlikeRequest, db: Session = Depends(get_db)):
    """
    特定の曲に対するユーザーのいいねを1件削除するAPI
    """
    user = crud.get_user_by_id(db, req.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 現在のいいね数を取得
    current_total = crud.count_likes(db, req.song_id, req.user_id)
    
    if current_total == 0:
        raise HTTPException(status_code=404, detail="Like not found")
    
    # お気に入りから外すため、いいねを5回未満になるまで削除
    # つまり、5回以上いいねしている場合は、5回未満になるまで削除
    target_count = LIKE_MILESTONE - 1  # 4回以下にする
    
    # 削除する件数を計算
    delete_count = max(0, current_total - target_count)
    
    if delete_count > 0:
        # 最新のいいねログを削除する件数分取得して削除
        like_logs = (
            db.query(models.LikeLog)
            .filter(
                models.LikeLog.user_id == req.user_id,
                models.LikeLog.song_id == req.song_id
            )
            .order_by(models.LikeLog.timestamp.desc())
            .limit(delete_count)
            .all()
        )
        
        for like_log in like_logs:
            db.delete(like_log)
        
        db.commit()
    
    # 削除後のいいね数を取得
    total = crud.count_likes(db, req.song_id, req.user_id)
    is_favorite = (total >= LIKE_MILESTONE)
    
    logger.info(f"[💔]: User: {user.name} | SongID: {req.song_id} | Deleted: {delete_count} | Remaining: {total}")
    
    return {
        "status": "ok",
        "total_likes": total,
        "is_favorite": is_favorite,
    }


# --- 投稿API ---

@app.post("/posts", status_code=status.HTTP_201_CREATED)
def create_post(req: PostCreateRequest, db: Session = Depends(get_db)):
    # ユーザー・曲の存在チェック
    user = crud.get_user_by_id(db, req.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    song = crud.get_song_by_id(db, req.song_id)
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    post = crud.create_post(db, req.user_id, req.song_id, req.comment)
    logger.info(f"📝 New Post: user={user.name}, song_id={song.id}")

    return {
        "id": post.id,
        "comment": post.comment,
        "created_at": post.created_at.isoformat(),
        "user": {
            "id": user.id,
            "name": user.name,
        },
        "song": {
            "id": song.id,
            "title": song.title,
            "artist": song.artist,
            "url": song.url,
        },
    }


@app.get("/posts")
def list_posts(limit: int = 50, db: Session = Depends(get_db)):
    """
    最新の投稿を取得（Homeページ用）
    """
    posts = crud.get_recent_posts(db, limit=limit)

    results = []
    for p in posts:
        user = p.user
        song = p.song

        # ユーザーのMusic Type情報
        music_type_data = None
        if user and user.music_type:
            music_type_data = {
                "code": user.music_type.code,
                "name": user.music_type.name,
                "description": user.music_type.description,
            }

        # コメント一覧
        comments_payload = []
        for c in p.comments:
            comment_user = c.user
            comment_music_type = None
            if comment_user and comment_user.music_type:
                comment_music_type = {
                    "code": comment_user.music_type.code,
                    "name": comment_user.music_type.name,
                    "description": comment_user.music_type.description,
                }
            comments_payload.append({
                "id": c.id,
                "content": c.content,
                "created_at": c.created_at.isoformat(),
                "user": {
                    "id": comment_user.id,
                    "name": comment_user.name,
                    "music_type": comment_music_type,
                } if comment_user else None,
            })

        results.append({
            "id": p.id,
            "comment": p.comment,
            "created_at": p.created_at.isoformat(),
            "user": {
                "id": user.id,
                "name": user.name,
                "music_type": music_type_data,
            } if user else None,
            "song": {
                "id": song.id,
                "title": song.title,
                "artist": song.artist,
                "url": song.url,
            } if song else None,
            "comments": comments_payload,
        })

    return results


@app.get("/posts/{post_id}/comments")
def list_comments(post_id: int, db: Session = Depends(get_db)):
    post = crud.get_post_by_id(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    comments = crud.get_comments_by_post(db, post_id)

    payload = []
    for c in comments:
        comment_user = c.user
        comment_music_type = None
        if comment_user and comment_user.music_type:
            comment_music_type = {
                "code": comment_user.music_type.code,
                "name": comment_user.music_type.name,
                "description": comment_user.music_type.description,
            }
        payload.append({
            "id": c.id,
            "content": c.content,
            "created_at": c.created_at.isoformat(),
            "user": {
                "id": comment_user.id,
                "name": comment_user.name,
                "music_type": comment_music_type,
            } if comment_user else None,
        })
    return payload


@app.post("/users/{target_id}/follow", status_code=status.HTTP_201_CREATED)
def follow_user(target_id: str, req: FollowRequest, db: Session = Depends(get_db)):
    if target_id == req.user_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    follower = crud.get_user_by_id(db, req.user_id)
    target = crud.get_user_by_id(db, target_id)
    if not follower or not target:
        raise HTTPException(status_code=404, detail="User not found")
    crud.create_follow(db, req.user_id, target_id)
    follower_count = crud.count_followers(db, target_id)
    return {"status": "ok", "follower_count": follower_count}


@app.delete("/users/{target_id}/follow", status_code=status.HTTP_200_OK)
def unfollow_user(target_id: str, req: FollowRequest, db: Session = Depends(get_db)):
    follower = crud.get_user_by_id(db, req.user_id)
    target = crud.get_user_by_id(db, target_id)
    if not follower or not target:
        raise HTTPException(status_code=404, detail="User not found")
    crud.delete_follow(db, req.user_id, target_id)
    follower_count = crud.count_followers(db, target_id)
    return {"status": "ok", "follower_count": follower_count}
@app.post("/posts/{post_id}/comments", status_code=status.HTTP_201_CREATED)
def create_comment(post_id: int, req: CommentCreateRequest, db: Session = Depends(get_db)):
    post = crud.get_post_by_id(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    user = crud.get_user_by_id(db, req.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    comment = crud.create_comment(db, post_id, req.user_id, req.content)

    music_type_data = None
    if user.music_type:
        music_type_data = {
            "code": user.music_type.code,
            "name": user.music_type.name,
            "description": user.music_type.description,
        }

    return {
        "id": comment.id,
        "content": comment.content,
        "created_at": comment.created_at.isoformat(),
        "user": {
            "id": user.id,
            "name": user.name,
            "music_type": music_type_data,
        }
    }

# ルートURL ("/") にアクセスが来たら、distフォルダの中身(index.html)を返す
if os.path.exists(DIST_DIR):
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="dist")
else:
    logger.warning(f"'dist' folder not found at {DIST_DIR}.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
