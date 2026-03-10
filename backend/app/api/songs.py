import logging
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session

from app import crud, schemas
from app.core.database import get_db
from app.services import typeCal

router = APIRouter()
logger = logging.getLogger("uvicorn")

LIKE_MILESTONE = 5

@router.get("/songs")
def read_songs(db: Session = Depends(get_db)):
    return crud.get_all_songs(db)

@router.post("/likes", status_code=status.HTTP_201_CREATED)
def create_like(like: schemas.LikeRequest, db: Session = Depends(get_db)):
    target_song = crud.get_song_by_id(db, like.song_id)
    if target_song is None:
        raise HTTPException(status_code=404, detail="曲が見つかりません")

    user = crud.get_user_by_id(db, like.user_id)
    if not user:
        raise HTTPException(status_code=500, detail="テストユーザーがいません")
    
    if target_song.parameters:
        new_vc, new_ma, new_pr, new_hs = typeCal.calculate_new_scores(user, target_song.parameters)
        new_type_code = typeCal.determine_music_type_code(new_vc, new_ma, new_pr, new_hs)
        
        user.score_vc = new_vc
        user.score_ma = new_ma
        user.score_pr = new_pr
        user.score_hs = new_hs
        user.music_type_code = new_type_code
        db.add(user)

    crud.create_like(db, user.id, like.song_id)
    total = crud.count_likes(db, like.song_id, user.id)
    is_favorite = (total >= LIKE_MILESTONE)
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
                models.LikeLog.song_id == req.song_id
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
    
    logger.info(f"[💔]: User: {user.name} | SongID: {req.song_id} | Deleted: {delete_count} | Remaining: {total}")
    return {"status": "ok", "total_likes": total, "is_favorite": is_favorite}
