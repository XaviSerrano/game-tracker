"""
Router /api/library y /api/favorites

Library:
  GET    /api/library                → lista de juegos del usuario
  POST   /api/library                → añadir juego
  PATCH  /api/library/{igdb_id}      → cambiar estado
  DELETE /api/library/{igdb_id}      → eliminar de la lista

Favorites:
  GET    /api/favorites              → lista de favoritos
  POST   /api/favorites              → añadir favorito
  DELETE /api/favorites/{igdb_id}    → quitar favorito
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import UserGame, Favorite
from app.schemas import (
    UserGameCreate, UserGameUpdate, UserGameOut,
    FavoriteCreate, FavoriteOut,
)

router = APIRouter(tags=["library"])


# ── Library ────────────────────────────────────────────────────────────────────

@router.get("/api/library", response_model=list[UserGameOut])
async def get_library(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserGame).order_by(UserGame.added_at.desc()))
    return result.scalars().all()


@router.post("/api/library", response_model=UserGameOut, status_code=201)
async def add_to_library(body: UserGameCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.get(UserGame, body.igdb_id)
    if existing:
        raise HTTPException(status_code=409, detail="El juego ya está en tu lista")
    game = UserGame(**body.model_dump())
    db.add(game)
    await db.commit()
    await db.refresh(game)
    return game


@router.patch("/api/library/{igdb_id}", response_model=UserGameOut)
async def update_game_status(igdb_id: int, body: UserGameUpdate, db: AsyncSession = Depends(get_db)):
    game = await db.get(UserGame, igdb_id)
    if not game:
        raise HTTPException(status_code=404, detail="Juego no encontrado en tu lista")
    game.status = body.status
    game.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(game)
    return game


@router.delete("/api/library/{igdb_id}", status_code=204)
async def remove_from_library(igdb_id: int, db: AsyncSession = Depends(get_db)):
    game = await db.get(UserGame, igdb_id)
    if not game:
        raise HTTPException(status_code=404, detail="Juego no encontrado en tu lista")
    await db.delete(game)
    await db.commit()


# ── Favorites ──────────────────────────────────────────────────────────────────

@router.get("/api/favorites", response_model=list[FavoriteOut])
async def get_favorites(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Favorite).order_by(Favorite.added_at.desc()))
    return result.scalars().all()


@router.post("/api/favorites", response_model=FavoriteOut, status_code=201)
async def add_favorite(body: FavoriteCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.get(Favorite, body.igdb_id)
    if existing:
        raise HTTPException(status_code=409, detail="El juego ya está en favoritos")
    fav = Favorite(**body.model_dump())
    db.add(fav)
    await db.commit()
    await db.refresh(fav)
    return fav


@router.delete("/api/favorites/{igdb_id}", status_code=204)
async def remove_favorite(igdb_id: int, db: AsyncSession = Depends(get_db)):
    fav = await db.get(Favorite, igdb_id)
    if not fav:
        raise HTTPException(status_code=404, detail="Juego no encontrado en favoritos")
    await db.delete(fav)
    await db.commit()
