from pydantic import BaseModel

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

class DiagnosisRequest(BaseModel):
    user_id: str
    score_vc: float # 0.0 - 1.0
    score_ma: float
    score_pr: float
    score_hs: float
