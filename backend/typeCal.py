import json

def calculate_new_scores(current_user, song_params_json: str):
    """
    ユーザーの現在のスコアと、曲のパラメータ(JSON文字列)を受け取り、
    新しいスコア(4軸)を計算して返します。
    """
    
    # DBの parameters カラムは文字列(JSON)で入っているので辞書に変換
    if isinstance(song_params_json, str):
        song_params = json.loads(song_params_json)
    else:
        song_params = song_params_json # すでに辞書用

    # 学習率 (0.03 = 過去97% : 新曲3% の割合で変化)
    # 10回程度押したらタイプが変わる程度の変化になるように調整
    alpha = 0.03

    # 指数平滑移動平均で計算
    # --- 1. V vs C (Valence) ---
    # High Valence = V (1.0), Low = C (0.0)
    val_v = float(song_params.get('valence', 0.5))
    new_vc = (current_user.score_vc * (1 - alpha)) + (val_v * alpha)

    # --- 2. M vs A (Melody vs Atmosphere) ---
    # Instrumentalnessが高い = A (Atmosphere/1.0)
    # Instrumentalnessが低い = M (Melody/0.0)
    val_a = float(song_params.get('instrumentalness', 0.0))
    new_ma = (current_user.score_ma * (1 - alpha)) + (val_a * alpha)

    # --- 3. P vs R (Passion vs Relax) ---
    # Energyが高い = P (Passion/1.0)
    val_p = float(song_params.get('energy', 0.5))
    new_pr = (current_user.score_pr * (1 - alpha)) + (val_p * alpha)

    # --- 4. H vs S (Human vs Synth) ---
    # Acousticnessが高い = H (Human/1.0)
    # Acousticnessが低い = S (Synth/0.0)
    # ここでは Acousticness をそのまま H度(1.0)
    val_h = float(song_params.get('acousticness', 0.0))
    new_hs = (current_user.score_hs * (1 - alpha)) + (val_h * alpha)

    return new_vc, new_ma, new_pr, new_hs

def determine_music_type_code(vc, ma, pr, hs):
    """
    4つのスコア(0.0-1.0)から、'VMPH' のような4文字のコードを生成します。
    基準値はすべて 0.5 です。
    """
    code = ""

    # 1文字目: V or C
    code += "V" if vc >= 0.5 else "C"

    # 2文字目: A or M (注意: スコアは Atmosphere(1.0)寄りか判定)
    # スコアが高い(>0.5)ならAtmosphere(A)、低いならMelody(M)
    # Instrumentalnessが低い(0.0) = Melody(M) 
    code += "A" if ma >= 0.5 else "M"

    # 3文字目: P or R
    code += "P" if pr >= 0.5 else "R"

    # 4文字目: H or S
    # Acousticnessが高い(1.0) = Human(H)
    code += "H" if hs >= 0.5 else "S"

    return code