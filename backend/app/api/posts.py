import logging
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session

from app import crud, schemas
from app.core.database import get_db

router = APIRouter()
logger = logging.getLogger("uvicorn")

@router.post("/posts", status_code=status.HTTP_201_CREATED)
def create_post(req: schemas.PostCreateRequest, db: Session = Depends(get_db)):
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
            "url": song.url or "",
            "spotify_track_id": song.spotify_track_id,
            "album_image": song.album_image,
        },
    }

@router.post("/posts/from-spotify", status_code=status.HTTP_201_CREATED)
def create_post_from_spotify(req: schemas.SpotifyPostCreateRequest, db: Session = Depends(get_db)):
    user = crud.get_user_by_id(db, req.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    song = crud.get_or_create_song_from_spotify(
        db, req.spotify_track_id, req.title, req.artist, req.spotify_url, req.album_image
    )

    post = crud.create_post(db, req.user_id, song.id, req.comment)
    logger.info(f"📝 New Spotify Post: user={user.name}, track={req.title}")

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
            "url": song.url or "",
            "spotify_track_id": song.spotify_track_id,
            "album_image": song.album_image,
        },
    }

@router.get("/posts")
def list_posts(limit: int = 50, db: Session = Depends(get_db)):
    posts = crud.get_recent_posts(db, limit=limit)

    results = []
    for p in posts:
        user = p.user
        song = p.song

        music_type_data = None
        if user and user.music_type:
            music_type_data = {
                "code": user.music_type.code,
                "name": user.music_type.name,
                "description": user.music_type.description,
            }

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
                "url": song.url or "",
                "spotify_track_id": song.spotify_track_id,
                "album_image": song.album_image,
            } if song else None,
            "comments": comments_payload,
        })

    return results

@router.get("/posts/{post_id}/comments")
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

@router.post("/posts/{post_id}/comments", status_code=status.HTTP_201_CREATED)
def create_comment(post_id: int, req: schemas.CommentCreateRequest, db: Session = Depends(get_db)):
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
