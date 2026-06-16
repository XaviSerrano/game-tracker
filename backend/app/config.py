from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    twitch_client_id: str
    twitch_client_secret: str

    class Config:
        env_file = ".env"


settings = Settings()
