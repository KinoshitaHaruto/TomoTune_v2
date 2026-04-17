from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    spotify_client_id: str = ""
    spotify_client_secret: str = ""
    spotify_redirect_uri: str = "http://127.0.0.1:8000/api/spotify/callback"
    frontend_url: str = "http://localhost:5173"

    # 本番環境では DATABASE_URL を設定する（Supabase 接続文字列）
    database_url: str = ""

    # 本番環境では ALLOWED_ORIGINS にフロントエンドのURLをカンマ区切りで設定する
    # 例: "https://tomo-tune.vercel.app,https://www.tomotune.com"
    allowed_origins: str = ""

    # Cloudflare R2 公開URL（MP3配信用）
    # 例: "https://pub-xxxx.r2.dev" または独自ドメイン
    # 未設定の場合はローカルの /static/ から配信
    r2_public_url: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    def get_allowed_origins(self) -> list[str]:
        """CORS許可オリジンのリストを返す。未設定の場合は開発用ローカルURLを返す。"""
        if self.allowed_origins:
            return [o.strip() for o in self.allowed_origins.split(",")]
        return [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]


settings = Settings()
