
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./smartmunicipality.db"

    cors_origins: str = (
    "http://localhost:5173,"
    "http://localhost:5174,"
    "http://localhost:5175,"
    "http://127.0.0.1:5173,"
    "http://127.0.0.1:5174,"
    "http://127.0.0.1:5175,"
    "http://localhost:5176,"
    "http://127.0.0.1:5176,"
    "http://localhost:5177,"
    "http://127.0.0.1:5177,"
    "http://localhost:5178,"
    "http://127.0.0.1:5178,"
    "http://localhost:4173,"
    "http://127.0.0.1:4173"
)

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )


settings = Settings()



