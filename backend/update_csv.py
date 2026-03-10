import csv
from pathlib import Path

# スクリプトのディレクトリを基準にパスを設定
BASE_DIR = Path(__file__).parent.absolute()
STATIC_DIR = BASE_DIR / "static"
CSV_PATH = BASE_DIR / "songs.csv"

# 今回定義する全パラメータ（CSVのヘッダーになります）
CSV_HEADERS = [
    "filename", "title", "artist", 
    "acousticness", "danceability", "energy", "instrumentalness", 
    "liveness", "loudness", "speechiness", "valence", 
    "tempo", "key", "mode", "time_signature"
]

def get_time_signature_from_mp3(file_path):
    """
    mp3ファイルからtime_signatureを取得する
    取得できない場合はデフォルト値4を返す
    """
    try:
        from mutagen.mp3 import MP3
        from mutagen.id3 import ID3NoHeaderError
        
        audio = MP3(str(file_path))
        
        # ID3タグから取得を試みる（通常は含まれていないが、試してみる）
        if audio.tags:
            # TXXXフレーム（カスタムタグ）から取得を試みる
            for key, value in audio.tags.items():
                if 'time_signature' in key.lower() or 'timesignature' in key.lower():
                    try:
                        return str(int(value[0]))
                    except (ValueError, IndexError):
                        pass
        
        # デフォルト値（4/4拍子）を返す
        return "4"
    except (ImportError, ID3NoHeaderError, Exception) as e:
        # mutagenがインストールされていない、またはファイルが読み込めない場合
        return "4"

def update_csv():
    print("曲情報の同期を開始します...")

    # 1. 既存のCSVを読み込む（すでに入力済みのデータは消さない）
    existing_data = {}
    if CSV_PATH.exists():
        with open(CSV_PATH, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                existing_data[row["filename"]] = row

    # 2. フォルダをスキャン
    if not STATIC_DIR.exists():
        print(f"フォルダが見つかりません: {STATIC_DIR}")
        return

    # 3. staticフォルダ内のmp3ファイル一覧を取得
    static_files = set()
    for filename in sorted(STATIC_DIR.iterdir()):
        if filename.suffix.lower() == ".mp3":
            static_files.add(filename.name)

    # 4. CSVに存在するがstaticフォルダにない曲を削除
    removed_count = 0
    for filename in list(existing_data.keys()):
        if filename not in static_files:
            del existing_data[filename]
            removed_count += 1
            print(f"削除: {filename} (staticフォルダに存在しません)")

    final_rows = []
    added_count = 0

    # 5. staticフォルダ内のファイルを処理
    for filename in sorted(static_files):
        file_path = STATIC_DIR / filename
        
        # 既にCSVにある場合 -> 既存データをそのまま使う
        if filename in existing_data:
            final_rows.append(existing_data[filename])
        
        # 新しいファイルの場合 -> 空の行を作る
        else:
            title = filename.replace(".mp3", "").replace("_", " ")
            
            # mp3ファイルからtime_signatureを取得
            time_sig = get_time_signature_from_mp3(file_path)
            
            new_row = {
                "filename": filename,
                "title": title,
                "artist": "Unknown Artist",
                # パラメータは初期値（0や空）を入れておく
                "acousticness": "0.0", "danceability": "0.0", "energy": "0.0",
                "instrumentalness": "0.0", "liveness": "0.0", "loudness": "-60.0",
                "speechiness": "0.0", "valence": "0.0", "tempo": "120",
                "key": "0", "mode": "1", "time_signature": time_sig
            }
            final_rows.append(new_row)
            added_count += 1
            print(f"新規追加: {title} (time_signature: {time_sig})")

    # 6. CSVに書き込む
    with open(CSV_PATH, mode='w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=CSV_HEADERS)
        writer.writeheader()
        writer.writerows(final_rows)

    if added_count > 0 or removed_count > 0:
        print(f"CSVを更新しました(追加: {added_count}曲, 削除: {removed_count}曲)")
        if added_count > 0:
            print("songs.csv を開いて、パラメータ数値を入力してください。")
    else:
        print("CSVは最新です。")

if __name__ == "__main__":
    update_csv()