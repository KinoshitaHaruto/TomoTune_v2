import os
import traceback
import httpx
from fastapi import APIRouter, HTTPException, Query

router = APIRouter()

SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID", "")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET", "")
TOKEN_URL = "https://accounts.spotify.com/api/token"
SEARCH_URL = "https://api.spotify.com/v1/search"


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

        results = []
        for track in tracks:
            results.append({
                "id": track["id"],
                "title": track["name"],
                "artist": ", ".join(a["name"] for a in track["artists"]),
                "album": track["album"]["name"],
                "album_image": track["album"]["images"][0]["url"] if track["album"]["images"] else None,
                "spotify_url": track["external_urls"]["spotify"],
                "duration_ms": track["duration_ms"],
            })

        return {"tracks": results}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Search Exception: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=502, detail=f"Search Exception: {str(e)}")
