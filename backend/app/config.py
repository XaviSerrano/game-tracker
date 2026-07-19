# from pydantic_settings import BaseSettings


# class Settings(BaseSettings):
#     twitch_client_id: str
#     twitch_client_secret: str

#     class Config:
#         env_file = ".env"


# settings = Settings()

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # IGDB_CLIENT_ID: str
    # IGDB_CLIENT_SECRET: str

    twitch_client_id: str
    twitch_client_secret: str

    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_SECURE: bool = False
    SMTP_USER: str | None = None
    SMTP_PASS: str | None = None
    SMTP_FROM: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()