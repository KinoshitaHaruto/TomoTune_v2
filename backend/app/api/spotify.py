import os
import traceback
import urllib.parse
import httpx
from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app import crud

router = APIRouter()

SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID", "")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET", "")
SPOTIFY_REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI", "http://127.0.0.1:8000/api/spotify/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
TOKEN_URL = "https://accounts.spotify.com/api/token"
SEARCH_URL = "https://api.spotify.com/v1/search"
AUTH_URL = "https://accounts.spotify.com/authorize"


async def get_access_token() -> str:
    """Client Credentials Flowでアクセストークンを取得"""
    if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Spotify API keys are not configured")

    async with httpx.AsyncClient() as client:
        res = await client.post(
            TOKEN_URL,
            data={"grant_type": "client_credentials"},
            auth=(SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET),
        )
        if res.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to get Spotify token")
        return res.json()["access_token"]


@router.get("/spotify/login")
def spotify_login():
    """SpotifyのOAuth認証ページにリダイレクト"""
    params = {
        "client_id": SPOTIFY_CLIENT_ID,
        "response_type": "code",
        "redirect_uri": SPOTIFY_REDIRECT_URI,
        "scope": "streaming user-read-email user-read-private user-modify-playback-state user-top-read",
    }
    url = f"{AUTH_URL}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url)


@router.get("/spotify/callback")
async def spotify_callback(code: str = Query(...), db: Session = Depends(get_db)):
    """SpotifyのOAuthコールバック: トークン取得 → ユーザー作成/取得 → フロントにリダイレクト"""
    # 1. 認可コードをトークンに交換
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": SPOTIFY_REDIRECT_URI,
            },
            auth=(SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET),
        )
        if token_res.status_code != 200:
            return RedirectResponse(f"{FRONTEND_URL}/login?error=token_exchange_failed")
        token_data = token_res.json()

        access_token = token_data["access_token"]
        refresh_token = token_data["refresh_token"]
        expires_in = token_data["expires_in"]

        # 2. Spotifyユーザー情報取得
        me_res = await client.get(
            "https://api.spotify.com/v1/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if me_res.status_code != 200:
            return RedirectResponse(f"{FRONTEND_URL}/login?error=user_fetch_failed")
        me_data = me_res.json()

    spotify_id = me_data["id"]
    display_name = me_data.get("display_name") or f"Spotify_{spotify_id[:8]}"

    # 3. DBでユーザーを検索または作成
    user = crud.get_user_by_spotify_id(db, spotify_id)
    if not user:
        user = crud.create_user(db, name=display_name, spotify_id=spotify_id)

    # 4. フロントエンドにリダイレクト（トークン + user_id）
    params = urllib.parse.urlencode({
        "user_id": user.id,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_in": expires_in,
    })
    return RedirectResponse(f"{FRONTEND_URL}/login?{params}")


@router.post("/spotify/refresh")
async def spotify_refresh_token(refresh_token: str = Query(...)):
    """アクセストークンをリフレッシュ"""
    async with httpx.AsyncClient() as client:
        res = await client.post(
            TOKEN_URL,
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
            },
            auth=(SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET),
        )
        if res.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to refresh token")
        data = res.json()

    return {"access_token": data["access_token"], "expires_in": data["expires_in"]}


@router.get("/spotify/me")
async def spotify_me(access_token: str = Query(...)):
    """ログイン中のSpotifyユーザー情報を取得（Premium判定用）"""
    async with httpx.AsyncClient() as client:
        res = await client.get(
            "https://api.spotify.com/v1/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if res.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to get Spotify user info")
        data = res.json()
    return {
        "display_name": data.get("display_name", ""),
        "is_premium": data.get("product") == "premium",
    }


def _format_track(track: dict) -> dict:
    return {
        "id": track["id"],
        "title": track["name"],
        "artist": ", ".join(a["name"] for a in track["artists"]),
        "album": track["album"]["name"],
        "album_image": track["album"]["images"][0]["url"] if track["album"]["images"] else None,
        "spotify_url": track["external_urls"]["spotify"],
        "duration_ms": track["duration_ms"],
        "preview_url": track.get("preview_url"),
    }


async def _get_popular_tracks() -> dict:
    """Client Credentials で人気曲を取得（フォールバック）"""
    token = await get_access_token()
    async with httpx.AsyncClient() as client:
        res = await client.get(
            SEARCH_URL,
            params={"q": "Ado OR YOASOBI OR Vaundy", "type": "track", "limit": 10, "market": "JP"},
            headers={"Authorization": f"Bearer {token}"},
        )
        print(f"[top-tracks fallback] status={res.status_code}")
        if res.status_code != 200:
            print(f"[top-tracks fallback] body={res.text}")
            raise HTTPException(status_code=502, detail="Failed to get popular tracks")
        tracks = res.json()["tracks"]["items"]
    return {"tracks": [_format_track(t) for t in tracks], "type": "popular"}


@router.get("/spotify/top-tracks")
async def get_top_tracks(access_token: str = Query(...), limit: int = 20):
    """ログイン済みユーザーのトップトラックを取得（user-top-read スコープが必要）"""
    async with httpx.AsyncClient() as client:
        res = await client.get(
            "https://api.spotify.com/v1/me/top/tracks",
            params={"time_range": "medium_term", "limit": limit},
            headers={"Authorization": f"Bearer {access_token}"},
        )
        print(f"[top-tracks] status={res.status_code}")

        if res.status_code != 200:
            # スコープ不足など → 人気曲にフォールバック
            print(f"[top-tracks] body={res.text}")
            return await _get_popular_tracks()

        items = res.json().get("items", [])
        if not items:
            # リスニング履歴なし → 人気曲にフォールバック
            return await _get_popular_tracks()

    return {"tracks": [_format_track(t) for t in items], "type": "top"}


@router.get("/spotify/search")
async def search_spotify(q: str = Query(..., description="検索キーワード"), limit: int = 10):
    """Spotifyで曲を検索する（Client Credentials Flow）"""
    try:
        token = await get_access_token()

        async with httpx.AsyncClient() as client:
            res = await client.get(
                SEARCH_URL,
                params={"q": q, "type": "track", "limit": limit, "market": "JP"},
                headers={"Authorization": f"Bearer {token}"},
            )
            if res.status_code != 200:
                print(f"Spotify Search Error: {res.status_code} {res.text}")
                raise HTTPException(status_code=502, detail=f"Spotify search failed: {res.status_code} - {res.text}")

            tracks = res.json()["tracks"]["items"]

        return {"tracks": [_format_track(t) for t in tracks]}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Search Exception: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=502, detail=f"Search Exception: {str(e)}")
