# --- 曲の登録 ---
        # data.py の songs リストから登録
        for s in songs:
            # 重複チェック: タイトルで確認
            existing = db.query(Song).filter(Song.title == s["title"]).first()
            if not existing:
                new_song = Song(
                    title=s["title"],
                    artist=s["artist"],
                    url=s["url"],
                    parameters=s["parameters"]
                )
                db.add(new_song)
                print(f"曲追加: {s['title']}")