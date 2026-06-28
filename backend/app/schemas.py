from datetime import datetime
from typing import Literal
from pydantic import BaseModel

GameStatus = Literal["playing", "completed", "pending", "dropped"]


# ── Library (user_games) ───────────────────────────────────────────────────────

class UserGameCreate(BaseModel):
    igdb_id: int
    name: str
    cover: str = ""
    status: GameStatus = "pending"


class UserGameUpdate(BaseModel):
    status: GameStatus


class UserGameOut(BaseModel):
    igdb_id: int
    name: str
    cover: str
    status: GameStatus
    added_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Favorites ──────────────────────────────────────────────────────────────────

class FavoriteCreate(BaseModel):
    igdb_id: int
    name: str
    cover: str = ""


class FavoriteOut(BaseModel):
    igdb_id: int
    name: str
    cover: str
    added_at: datetime

    model_config = {"from_attributes": True}
