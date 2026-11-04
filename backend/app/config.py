from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "../.env"))
    database_url: str
    redis_url: str | None = None  # env REDIS_URL
    cors_origins: str = ""  # env CORS_ORIGINS, comma-separated
    api_secret_key: str | None = None  # env API_SECRET_KEY; required for POST /api/jobs


settings = Settings()
