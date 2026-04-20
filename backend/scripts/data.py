import csv
import json
import os
import unicodedata

# --- 曲リスト ---

# CSV読み込み
def load_song_metadata():
    """songs.csv を読み込んで、ファイル名をキーにした辞書を作る"""
    metadata = {}
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    csv_path = os.path.join(base_dir, "data", "songs.csv")
    
    if not os.path.exists(csv_path):
        print(f"警告: {csv_path} が見つかりません。")
        return {}

    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # ファイル名の前後の空白を削除し、NFC形式に正規化
            filename = unicodedata.normalize('NFC', row["filename"].strip())
            metadata[filename] = row
    return metadata

def build_songs_from_csv():
    """CSVから曲リストを作る（本番環境でもMP3ファイルなしで動作する）"""
    metadata_map = load_song_metadata()

    if not metadata_map:
        print("警告: CSVから曲情報を読み込めませんでした。")
        return []

    print(f"CSVに登録されている曲数: {len(metadata_map)}")

    r2_base = os.environ.get("R2_PUBLIC_URL", "").rstrip("/")
    songs = []

    for i, (filename_clean, data) in enumerate(sorted(metadata_map.items()), start=1):
        title = data["title"].strip() if data.get("title") else filename_clean.replace(".mp3", "")
        artist = data["artist"].strip() if data.get("artist") else "Unknown Artist"

        params = {
            "acousticness": float(data.get("acousticness", 0) or 0),
            "danceability": float(data.get("danceability", 0) or 0),
            "energy": float(data.get("energy", 0) or 0),
            "instrumentalness": float(data.get("instrumentalness", 0) or 0),
            "liveness": float(data.get("liveness", 0) or 0),
            "loudness": float(data.get("loudness", 0) or 0),
            "speechiness": float(data.get("speechiness", 0) or 0),
            "valence": float(data.get("valence", 0) or 0),
            "tempo": float(data.get("tempo", 0) or 0),
            "key": int(data.get("key", 0) or 0),
            "mode": int(data.get("mode", 0) or 0),
            "time_signature": int(data.get("time_signature", 4) or 4),
        }

        url = f"{r2_base}/{filename_clean}" if r2_base else f"/static/{filename_clean}"

        songs.append({
            "id": i,
            "title": title,
            "artist": artist,
            "url": url,
            "parameters": json.dumps(params),
        })

    return songs

songs = build_songs_from_csv()

# --- Music Typeリスト ---
def load_music_types():
    """musicType.csv を読み込んでリストを作る"""
    types = []
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    csv_path = os.path.join(base_dir, "data", "musicType.csv")
    
    if not os.path.exists(csv_path):
        print(f"{csv_path} が見つかりません。")
        return []

    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            types.append({
                "code": row["code"],
                "name": row["name"],
                "description": row["description"]
            })
    return types

# 変数に入れておく（init_db.pyで使うため）
music_types = load_music_types()
# --- ユーザーリスト ---
users = [
    {
        "id" : "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        "name" : "Test User",
        "music_type_code" : "VMPH"
    }
]