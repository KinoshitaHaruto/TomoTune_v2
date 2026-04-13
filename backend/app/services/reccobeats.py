import logging
import httpx

logger = logging.getLogger("uvicorn")

RECCOBEATS_BASE = "https://api.reccobeats.com/v1"


async def get_audio_features(spotify_track_id: str) -> dict | None:
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Step1: Spotify track ID → ReccoBeats 内部 ID
        res = await client.get(
            f"{RECCOBEATS_BASE}/track",
            params={"ids": spotify_track_id},
        )
        logger.info(f"[ReccoBeats] Step1 track_id={spotify_track_id} status={res.status_code}")

        if res.status_code != 200:
            logger.info(f"[ReccoBeats] Step1 MISS: {res.text[:200]}")
            return None

        content = res.json().get("content", [])
        if not content:
            logger.info("[ReccoBeats] Step1 MISS: content empty")
            return None

        recco_id = content[0].get("id")
        if not recco_id:
            logger.info("[ReccoBeats] Step1 MISS: id not found in content")
            return None

        # Step2: ReccoBeats 内部 ID → audio features
        res2 = await client.get(f"{RECCOBEATS_BASE}/track/{recco_id}/audio-features")
        logger.info(f"[ReccoBeats] Step2 recco_id={recco_id} status={res2.status_code}")

        if res2.status_code != 200:
            logger.info(f"[ReccoBeats] Step2 MISS: {res2.text[:200]}")
            return None

        data = res2.json()

    features = {
        "valence":          data.get("valence"),
        "energy":           data.get("energy"),
        "danceability":     data.get("danceability"),
        "acousticness":     data.get("acousticness"),
        "instrumentalness": data.get("instrumentalness"),
        "speechiness":      data.get("speechiness"),
        "liveness":         data.get("liveness"),
        "loudness":         data.get("loudness"),
        "tempo":            data.get("tempo"),
    }

    # 主要3特徴量がすべて None なら MISS とみなす
    if all(v is None for v in (features["valence"], features["energy"], features["acousticness"])):
        logger.info("[ReccoBeats] Step2 MISS: all key features are None")
        return None

    logger.info(f"[ReccoBeats] HIT valence={features['valence']} energy={features['energy']}")
    return features
