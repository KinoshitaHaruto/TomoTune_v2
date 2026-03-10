import logging
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session, joinedload

from app import crud, schemas, models
from app.core.database import get_db
from app.services import typeCal

router = APIRouter()
logger = logging.getLogger("uvicorn")

LIKE_MILESTONE = 5

@router.post("/login")
def login(req: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = crud.get_user_by_name(db, req.name)
    if not user:
        user = crud.create_user(db, req.name)
        logger.info(f"✨ New User Created: {user.name} ({user.id})")
    else:
        logger.info(f"🔙 Login: {user.name} ({user.id})")
    return user

@router.post("/diagnosis")
def save_diagnosis(req: schemas.DiagnosisRequest, db: Session = Depends(get_db)):
    user = crud.get_user_by_id(db, req.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.score_vc = req.score_vc
    user.score_ma = req.score_ma
    user.score_pr = req.score_pr
    user.score_hs = req.score_hs

    new_code = typeCal.determine_music_type_code(
        req.score_vc, req.score_ma, req.score_pr, req.score_hs
    )
    user.music_type_code = new_code
    db.add(user)
    db.commit()
    
    logger.info(f"📝 Diagnosis Updated: {user.name} -> {new_code}")
    return {"status": "ok", "music_type_code": new_code}

@router.get("/users/{user_id}")
def get_user_detail(user_id: str, viewer_id: str | None = None, db: Session = Depends(get_db)):
    user = db.query(models.User).options(joinedload(models.User.music_type)).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
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

@router.get("/favorites/{user_id}")
def get_favorites(user_id: str, db: Session = Depends(get_db)):
    user = crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    song_ids = crud.get_favorite_song_ids(db, user_id, threshold=LIKE_MILESTONE)
    return {"song_ids": song_ids}

@router.post("/users/{target_id}/follow", status_code=status.HTTP_201_CREATED)
def follow_user(target_id: str, req: schemas.FollowRequest, db: Session = Depends(get_db)):
    if target_id == req.user_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    follower = crud.get_user_by_id(db, req.user_id)
    target = crud.get_user_by_id(db, target_id)
    if not follower or not target:
        raise HTTPException(status_code=404, detail="User not found")
    crud.create_follow(db, req.user_id, target_id)
    follower_count = crud.count_followers(db, target_id)
    return {"status": "ok", "follower_count": follower_count}

@router.delete("/users/{target_id}/follow", status_code=status.HTTP_200_OK)
def unfollow_user(target_id: str, req: schemas.FollowRequest, db: Session = Depends(get_db)):
    follower = crud.get_user_by_id(db, req.user_id)
    target = crud.get_user_by_id(db, target_id)
    if not follower or not target:
        raise HTTPException(status_code=404, detail="User not found")
    crud.delete_follow(db, req.user_id, target_id)
    follower_count = crud.count_followers(db, target_id)
    return {"status": "ok", "follower_count": follower_count}
