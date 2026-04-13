import logging
import httpx
from collections import defaultdict

logger = logging.getLogger("uvicorn")

SPOTIFY_API_BASE = "https://api.spotify.com/v1"

# キーワード部分一致でジャンルタグ → 軸スコアにマッピング
GENRE_AXIS_MAP: dict[str, dict[str, float]] = {
    "dance":             {"vc": 0.75},
    "pop":               {"vc": 0.65},
    "anime":             {"vc": 0.65},
    "j-pop":             {"vc": 0.60},
    "classical":         {"vc": 0.35},
    "metal":             {"pr": 0.85},
    "punk":              {"pr": 0.80},
    "hard rock":         {"pr": 0.75},
    "edm":               {"pr": 0.70},
    "drum and bass":     {"pr": 0.75},
    "lo-fi":             {"pr": 0.30},
    "chillout":          {"pr": 0.25},
    "acoustic":          {"hs": 0.80},
    "folk":              {"hs": 0.75},
    "singer-songwriter": {"hs": 0.70},
    "blues":             {"hs": 0.70},
    "jazz":              {"hs": 0.65},
    "electronic":        {"hs": 0.20},
    "synth":             {"hs": 0.15},
    "electropop":        {"hs": 0.30},
    "techno":            {"hs": 0.15},
    "house":             {"hs": 0.20},
    "instrumental":      {"ma": 0.80},
    "new age":           {"ma": 0.75},
}

# ambient は複数軸に影響するため個別定義
_AMBIENT_AXES: dict[str, float] = {"vc": 0.30, "pr": 0.25, "ma": 0.75}


def _genres_to_axes(genres: list[str]) -> dict[str, float] | None:
    axis_hits: dict[str, list[float]] = defaultdict(list)

    for genre in genres:
        genre_lower = genre.lower()

        if "ambient" in genre_lower:
            for axis, val in _AMBIENT_AXES.items():
                axis_hits[axis].append(val)
            continue

        for keyword, axis_scores in GENRE_AXIS_MAP.items():
            if keyword in genre_lower:
                for axis, val in axis_scores.items():
                    axis_hits[axis].append(val)

    if not axis_hits:
        return None

    # ヒットしなかった軸はデフォルト 0.5
    return {
        "vc": sum(axis_hits["vc"]) / len(axis_hits["vc"]) if axis_hits["vc"] else 0.5,
        "ma": sum(axis_hits["ma"]) / len(axis_hits["ma"]) if axis_hits["ma"] else 0.5,
        "pr": sum(axis_hits["pr"]) / len(axis_hits["pr"]) if axis_hits["pr"] else 0.5,
        "hs": sum(axis_hits["hs"]) / len(axis_hits["hs"]) if axis_hits["hs"] else 0.5,
    }


async def get_axis_scores_from_artist(
    artist_id: str,
    access_token: str,
) -> dict[str, float] | None:
    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.get(
            f"{SPOTIFY_API_BASE}/artists/{artist_id}",
            headers={"Authorization": f"Bearer {access_token}"},
        )

    if res.status_code != 200:
        logger.info(f"[GenreFallback] MISS artist_id={artist_id} status={res.status_code}")
        return None

    genres: list[str] = res.json().get("genres", [])
    logger.info(f"[GenreFallback] artist_id={artist_id} genres={genres}")

    result = _genres_to_axes(genres)
    if result is None:
        logger.info(f"[GenreFallback] MISS: no keyword matched for {genres}")
    else:
        logger.info(f"[GenreFallback] HIT axes={result}")

    return result
