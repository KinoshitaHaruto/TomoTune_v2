import json
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session

from app import crud, schemas
from app.core.database import get_db
from app.services import reccobeats, genre_fallback
from app.services.typeCal_kalman import (
    calculate_new_scores,
    calculate_new_scores_from_axes,
    determine_music_type_code,
    R_RECCOBEATS, R_LOCAL, R_GENRE_FALLBACK,
)

router = APIRouter()
logger = logging.getLogger("uvicorn")

LIKE_MILESTONE = 5


@router.get("/songs")
def read_songs(db: Session = Depends(get_db)):
    return crud.get_all_songs(db)


@router.post("/songs/spotify", status_code=status.HTTP_200_OK)
def register_spotify_song(req: schemas.SpotifySongRegisterRequest, db: Session = Depends(get_db)):
    """Spotify曲をDBに登録（既存なら取得）して song_id を返す。"""
    song = crud.get_or_create_song_from_spotify(
        db, req.spotify_track_id, req.title, req.artist, req.spotify_url, req.album_image
    )
    return {"song_id": song.id}


@router.post("/likes", status_code=status.HTTP_201_CREATED)
async def create_like(like: schemas.LikeRequest, db: Session = Depends(get_db)):
    target_song = crud.get_song_by_id(db, like.song_id)
    if target_song is None:
        raise HTTPException(status_code=404, detail="曲が見つかりません")

    user = crud.get_user_by_id(db, like.user_id)
    if not user:
        raise HTTPException(status_code=500, detail="テストユーザーがいません")

    now = datetime.now()
    source = "no_update"
    new_scores = None

    if target_song.spotify_track_id:
        # Spotify曲: ReccoBeats → ジャンルフォールバックの順で試みる
        features = await reccobeats.get_audio_features(target_song.spotify_track_id)
        if features:
            new_scores = calculate_new_scores(user, features, R_RECCOBEATS, now)
            source = "reccobeats"
        elif like.spotify_artist_id and like.access_token:
            axes = await genre_fallback.get_axis_scores_from_artist(
                like.spotify_artist_id, like.access_token
            )
            if axes:
                new_scores = calculate_new_scores_from_axes(user, axes, R_GENRE_FALLBACK, now)
                source = "genre_fallback"

    elif target_song.parameters:
        # ローカル曲
        params = json.loads(target_song.parameters) if isinstance(target_song.parameters, str) else target_song.parameters
        new_scores = calculate_new_scores(user, params, R_LOCAL, now)
        source = "local"

    if new_scores:
        new_vc, new_ma, new_pr, new_hs, new_var_vc, new_var_ma, new_var_pr, new_var_hs = new_scores
        user.score_vc = new_vc
        user.score_ma = new_ma
        user.score_pr = new_pr
        user.score_hs = new_hs
        user.var_vc   = new_var_vc
        user.var_ma   = new_var_ma
        user.var_pr   = new_var_pr
        user.var_hs   = new_var_hs
        user.music_type_code = determine_music_type_code(new_vc, new_ma, new_pr, new_hs)

    user.last_liked_at = now
    db.add(user)

    crud.create_like(db, user.id, like.song_id, source)
    total = crud.count_likes(db, like.song_id, user.id)
    is_favorite = (total >= LIKE_MILESTONE)
    just_reached_milestone = (total == LIKE_MILESTONE)

    logger.info(f"[❤️] User:{user.name} SongID:{like.song_id} source:{source} Total:{total}")

    return {
        "status": "ok",
        "total_likes": total,
        "is_milestone": just_reached_milestone,
        "is_favorite": is_favorite,
        "observation_source": source,
        "user_music_type": user.music_type_code,
        "scores": {
            "VC": user.score_vc,
            "MA": user.score_ma,
            "PR": user.score_pr,
            "HS": user.score_hs,
        },
    }


@router.delete("/likes", status_code=status.HTTP_200_OK)
def delete_like(req: schemas.UnlikeRequest, db: Session = Depends(get_db)):
    from app import models
    user = crud.get_user_by_id(db, req.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    current_total = crud.count_likes(db, req.song_id, req.user_id)
    if current_total == 0:
        raise HTTPException(status_code=404, detail="Like not found")

    target_count = LIKE_MILESTONE - 1
    delete_count = max(0, current_total - target_count)

    if delete_count > 0:
        like_logs = (
            db.query(models.LikeLog)
            .filter(
                models.LikeLog.user_id == req.user_id,
                models.LikeLog.song_id == req.song_id,
            )
            .order_by(models.LikeLog.timestamp.desc())
            .limit(delete_count)
            .all()
        )
        for like_log in like_logs:
            db.delete(like_log)
        db.commit()

    total = crud.count_likes(db, req.song_id, req.user_id)
    is_favorite = (total >= LIKE_MILESTONE)

    logger.info(f"[💔] User:{user.name} SongID:{req.song_id} Deleted:{delete_count} Remaining:{total}")
    return {"status": "ok", "total_likes": total, "is_favorite": is_favorite}
