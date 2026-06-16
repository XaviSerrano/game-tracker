"""
Router /api/games

Endpoints que consume el frontend:
  GET /api/games                  → catálogo popular (fallback sin búsqueda)
  GET /api/games/igdb/search?q=  → búsqueda por texto en IGDB
  GET /api/games/{igdb_id}        → detalle de un juego
"""

from fastapi import APIRouter, HTTPException, Query
from app.services import igdb as igdb_service

router = APIRouter(prefix="/api/games", tags=["games"])


@router.get("/igdb/search")
async def search_igdb(q: str = Query(..., min_length=1)):
    """
    Búsqueda en IGDB por texto.
    Usado por Discover.tsx cuando el usuario escribe en la barra de búsqueda.
    """
    try:
        results = await igdb_service.search_games(query=q, limit=24)
        return results
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al contactar IGDB: {str(e)}")


@router.get("")
async def get_catalog(
    sort: str = Query("popularity", pattern="^(popularity|rating|newest|name)$"),
    genre: str | None = None,
    platform: str | None = None,
):
    """
    Catálogo por defecto: juegos populares de IGDB.
    Usado por Discover.tsx cuando no hay texto de búsqueda.
    """
    try:
        games = await igdb_service.get_popular_games(limit=30)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al contactar IGDB: {str(e)}")

    # Filtros opcionales post-fetch
    if genre:
        games = [g for g in games if genre.lower() in [gen.lower() for gen in g["genres"]]]
    if platform:
        games = [g for g in games if platform.lower() in [p.lower() for p in g["platforms"]]]

    # Ordenación local
    if sort == "rating":
        games.sort(key=lambda g: g.get("rating") or 0, reverse=True)
    elif sort == "name":
        games.sort(key=lambda g: g["name"].lower())
    # "popularity" y "newest" ya vienen ordenados desde IGDB

    return games


@router.get("/{igdb_id}")
async def get_game(igdb_id: int):
    """
    Detalle de un juego por ID. Usado por GameDetails.tsx.
    """
    game = await igdb_service.get_game_by_id(igdb_id)
    if not game:
        raise HTTPException(status_code=404, detail="Juego no encontrado")
    return game
