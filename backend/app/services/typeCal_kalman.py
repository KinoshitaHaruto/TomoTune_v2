from datetime import datetime

Q                = 0.001
R_RECCOBEATS     = 0.05
R_LOCAL          = 0.05
R_GENRE_FALLBACK = 0.20


def _observation(features: dict) -> tuple[float, float, float, float]:
    valence          = float(features.get("valence",          0.5))
    danceability     = float(features.get("danceability",     0.5))
    energy           = float(features.get("energy",           0.5))
    tempo            = float(features.get("tempo",            120))
    instrumentalness = float(features.get("instrumentalness", 0.0))
    acousticness     = float(features.get("acousticness",     0.0))

    tempo_norm = max(0.0, min(1.0, (tempo - 60) / 140))

    z_vc = 0.7 * valence + 0.3 * danceability
    z_pr = 0.7 * energy  + 0.3 * tempo_norm
    z_ma = instrumentalness
    z_hs = acousticness

    return z_vc, z_ma, z_pr, z_hs


def _elapsed_days(last_liked_at, now: datetime) -> int:
    if last_liked_at is None:
        return 0
    return max(0, (now - last_liked_at).days)


def _kalman_update(score: float, var: float, z: float, R: float, days: int) -> tuple[float, float]:
    P_pred    = var + Q * max(days, 1)  # 最低1日分のドリフト
    K         = P_pred / (P_pred + R)
    score_new = score + K * (z - score)
    var_new   = (1 - K) * P_pred
    return score_new, var_new


def calculate_new_scores(
    current_user,
    features: dict,
    R: float,
    now: datetime | None = None,
) -> tuple[float, float, float, float, float, float, float, float]:
    """audio features dict からカルマン更新。(vc, ma, pr, hs, var_vc, var_ma, var_pr, var_hs) を返す。"""
    if now is None:
        now = datetime.now()

    days = _elapsed_days(current_user.last_liked_at, now)
    z_vc, z_ma, z_pr, z_hs = _observation(features)

    new_vc, new_var_vc = _kalman_update(current_user.score_vc, current_user.var_vc, z_vc, R, days)
    new_ma, new_var_ma = _kalman_update(current_user.score_ma, current_user.var_ma, z_ma, R, days)
    new_pr, new_var_pr = _kalman_update(current_user.score_pr, current_user.var_pr, z_pr, R, days)
    new_hs, new_var_hs = _kalman_update(current_user.score_hs, current_user.var_hs, z_hs, R, days)

    return new_vc, new_ma, new_pr, new_hs, new_var_vc, new_var_ma, new_var_pr, new_var_hs


def calculate_new_scores_from_axes(
    current_user,
    axes: dict[str, float],
    R: float,
    now: datetime | None = None,
) -> tuple[float, float, float, float, float, float, float, float]:
    """ジャンルフォールバック用。axes={"vc","ma","pr","hs"} からカルマン更新。"""
    if now is None:
        now = datetime.now()

    days = _elapsed_days(current_user.last_liked_at, now)

    new_vc, new_var_vc = _kalman_update(current_user.score_vc, current_user.var_vc, axes["vc"], R, days)
    new_ma, new_var_ma = _kalman_update(current_user.score_ma, current_user.var_ma, axes["ma"], R, days)
    new_pr, new_var_pr = _kalman_update(current_user.score_pr, current_user.var_pr, axes["pr"], R, days)
    new_hs, new_var_hs = _kalman_update(current_user.score_hs, current_user.var_hs, axes["hs"], R, days)

    return new_vc, new_ma, new_pr, new_hs, new_var_vc, new_var_ma, new_var_pr, new_var_hs


def determine_music_type_code(vc, ma, pr, hs) -> str:
    code  = "V" if vc >= 0.5 else "C"
    code += "A" if ma >= 0.5 else "M"
    code += "P" if pr >= 0.5 else "R"
    code += "H" if hs >= 0.5 else "S"
    return code
