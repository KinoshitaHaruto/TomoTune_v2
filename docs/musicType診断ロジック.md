# MusicType 診断ロジック

## 4軸・16タイプ

いいねした曲の音楽特徴量から、4つの軸それぞれのスコア（0.0〜1.0）を算出する。
各軸を 0.5 で二値化した4文字コードがタイプ（例: `VMPS`, `CARS`）。

| 軸名 | Low (0.0) | High (1.0) |
|---|---|---|
| **Mood** | **C** — Cold. ダークでメランコリック| **V** — Vivid. 明るくポジティブ|
| **Sound** | **M** — Melody. 歌・メロディ重視| **A** — Atmospheric. 楽器全体のサウンドや空気感重視 |
| **Intensity** | **R** — Relaxed. 穏やかで落ち着いている| **P** — Passionate. 激しくエネルギッシュ|
| **Texture** | **S** — Synth. 電子サウンド| **H** — Human. 生楽器・アコースティックサウンド |

---

## いいね時のスコア更新フロー

```
いいね
  └─ Spotify曲
       └─ YES → ReccoBeats で特徴量取得
                 ├─ HIT  → カルマン更新 [source: "reccobeats"]
                 └─ MISS → Spotifyジャンルタグで近似
                           ├─ HIT  → カルマン更新 [source: "genre_fallback"]
                           └─ MISS → スコア更新なし [source: "no_update"]

   └─ ローカル曲 → song.parameters でカルマン更新 [source: "local"] 
```

---

## アルゴリズム: カルマンフィルター

### 管理する状態（ユーザーごと）

| 値 | 意味 |
|---|---|
| `score_vc/ma/pr/hs` | 各軸の推定スコア（0.0〜1.0） |
| `var_vc/ma/pr/hs` | 各軸の不確実性 σ²（大きいほど次のいいねで動きやすい） |
| `last_liked_at` | 最後にいいねした日時（時間経過による不確実性増加の起点） |

### 更新式

```
days      = (now - last_liked_at).days        # NULL なら 0
P_pred    = min(σ² + Q × max(days, 1), VAR_MAX)
K         = P_pred / (P_pred + R)             # カルマンゲイン
score_new = score + K × (z - score)           # z = 今回の観測値
var_new   = (1 - K) × P_pred
```

### 更新の特徴

**① 更新量は差に比例し、近づくほど小さくなる**

`K × (観測値 - 現在スコア)` で動くため、現在値が観測値に近いほど動きが鈍くなる（指数減衰）。1曲で急激に変わらず、同じ傾向の曲をいいねするほどじわじわ収束していく。

**② ゲイン K は約5%に抑制されている**

`VAR_MAX = 0.01` のキャップにより、K の上限は約5%。

- 1いいねで動く最大幅: `(観測値 - 現在スコア) × 5%`
- 例: スコア0.5の状態でz=0.8の曲をいいねすると +0.015 の変化

| いいね回数 | スコア（z=0.8 を連続でいいね） |
|---|---|
| 0回 | 0.500 |
| 5回 | 0.515 |
| 10回 | 0.527 |
| 20回 | 0.549 |
| 30回 | 0.568 |

**③ 一度変化したタイプは逆方向に同程度いいねしないと戻らない**

タイプ境界（0.5）を越えるまで移動させた回数と同程度、逆方向の曲をいいねしないとタイプは変わらない。短期的なブレに強い。

**④ 時間が経つと少しだけ不確実性が増す**

しばらくいいねしないと σ² が少し増え、次のいいねがわずかに効きやすくなる。ただし VAR_MAX で上限が決まるため、急激な変化は起きない。

---

## 特徴量 → 4軸マッピング

audio features から各軸の観測値 z を計算する。

| 軸 | 計算式 |
|---|---|
| V_C (Mood) | `0.7 × valence + 0.3 × danceability` |
| M_A (Vocals) | `0.7 × instrumentalness + 0.3 × (1 - speechiness)` |
| P_R (Intensity) | `0.7 × energy + 0.3 × clamp((tempo - 60) / 140, 0, 1)` |
| H_S (Texture) | `0.7 × acousticness + 0.3 × liveness` |

---

## 実装ファイル

| ファイル | 役割 |
|---|---|
| `services/reccobeats.py` | ReccoBeats から audio features 取得 |
| `services/genre_fallback.py` | ジャンルタグ → 4軸スコア近似 |
| `services/typeCal_kalman.py` | カルマンフィルター更新・タイプコード判定 |
| `services/typeCal.py` | 旧実装（EMA）、参照用に保持 |
