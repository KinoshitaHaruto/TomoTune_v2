from datetime import datetime
import csv
import uuid
import json
import os
import unicodedata

# サーバーのURL (自分のPCの住所)
# BASE_URL = "http://127.0.0.1:8000"

# --- 曲リスト ---

# CSV読み込み
def load_song_metadata():
    """songs.csv を読み込んで、ファイル名をキーにした辞書を作る"""
    metadata = {}
    base_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(base_dir, "songs.csv")
    
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

# staticフォルダ内の音楽ファイルをスキャンして曲リストを作成
def scan_static_files():
    """staticフォルダとCSVを照らし合わせて曲リストを作る"""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    static_dir = os.path.join(base_dir, "static")
    songs = []
    
    # CSVデータを読み込む
    metadata_map = load_song_metadata()
    
    if not metadata_map:
        print("警告: CSVから曲情報を読み込めませんでした。")

    if not os.path.exists(static_dir):
        print(f"警告: {static_dir} が見つかりません。")
        return []

    # デバッグ用: CSVに含まれるファイル名を表示
    csv_filenames = set(metadata_map.keys())
    print(f"CSVに登録されている曲数: {len(csv_filenames)}")

    # ファイル名順に処理
    for i, filename in enumerate(sorted(os.listdir(static_dir)), start=1):
        if filename.endswith(".mp3"):
            filename_clean = unicodedata.normalize('NFC', filename.strip())
            
            # CSVに情報がある場合 -> それを使う
            if filename_clean in metadata_map:
                data = metadata_map[filename_clean]
                title = data["title"].strip() if data.get("title") else filename_clean.replace(".mp3", "")
                artist = data["artist"].strip() if data.get("artist") else "Unknown Artist"
                
                # パラメータを辞書としてまとめる（文字列を数値に変換）
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
            
            # CSVにない場合 -> ファイル名から推測
            else:
                print(f"警告: CSVに存在しないファイルが見つかりました: {filename_clean}")
                title = filename_clean.replace(".mp3", "").replace("_", " ")
                artist = "Unknown Artist"
                params = {} 

            song = {
                "id": i,
                "title": title,
                "artist": artist,
                "url": f"/static/{filename_clean}",
                # 辞書をJSON文字列に変換して保存
                "parameters": json.dumps(params)
            }
            songs.append(song)
    
    return songs

songs = scan_static_files()

# --- Music Typeリスト ---
def load_music_types():
    """musicType.csv を読み込んでリストを作る"""
    types = []
    base_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(base_dir, "musicType.csv")
    
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