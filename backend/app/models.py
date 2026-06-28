from datetime import datetime, timezone
from sqlalchemy import Integer, String, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class UserGame(Base):
    __tablename__ = "user_games"

    igdb_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    cover: Mapped[str] = mapped_column(String, nullable=False, default="")
    # playing | completed | pending | dropped
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class Favorite(Base):
    __tablename__ = "favorites"

    igdb_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    cover: Mapped[str] = mapped_column(String, nullable=False, default="")
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
