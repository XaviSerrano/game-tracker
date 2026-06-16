"""
Servicio IGDB — gestiona autenticación OAuth2 con Twitch y consultas a la API.

El token se cachea en memoria y se renueva automáticamente cuando expira.
"""

import time
import httpx
from typing import Optional
from app.config import settings

# ── Token cache ────────────────────────────────────────────────────────────────

_cached_token: Optional[str] = None
_token_expires_at: float = 0.0


async def _get_access_token() -> str:
    """Devuelve un token válido, renovándolo si ha expirado."""
    global _cached_token, _token_expires_at

    if _cached_token and time.time() < _token_expires_at - 60:
        return _cached_token

    async with httpx.AsyncClient() as client:
        res = await client.post(
            "https://id.twitch.tv/oauth2/token",
            params={
                "client_id": settings.twitch_client_id,
                "client_secret": settings.twitch_client_secret,
                "grant_type": "client_credentials",
            },
        )
        res.raise_for_status()
        data = res.json()

    _cached_token = data["access_token"]
    _token_expires_at = time.time() + data["expires_in"]
    return _cached_token


async def igdb_request(endpoint: str, body: str) -> list[dict]:
    """
    Lanza una petición POST a la API de IGDB.
    
    Args:
        endpoint: p.ej. "games", "genres", "platforms"
        body: query en sintaxis APIcalypse de IGDB
    """
    token = await _get_access_token()

    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"https://api.igdb.com/v4/{endpoint}",
            headers={
                "Client-ID": settings.twitch_client_id,
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
            },
            content=body,
            timeout=10.0,
        )
        res.raise_for_status()
        return res.json()


# ── Mapeador de respuesta ──────────────────────────────────────────────────────

def _cover_url(image_id: Optional[str], size: str = "t_cover_big") -> str:
    if not image_id:
        return "https://via.placeholder.com/264x352?text=No+Cover"
    return f"https://images.igdb.com/igdb/image/upload/{size}/{image_id}.jpg"


def map_igdb_game(raw: dict) -> dict:
    """
    Convierte un objeto raw de IGDB al tipo Game del frontend:
    {
        igdbId, name, slug, cover, summary,
        genres[], platforms[], releaseDate, rating, popularity
    }
    """
    # Portada
    cover_id = None
    if isinstance(raw.get("cover"), dict):
        cover_id = raw["cover"].get("image_id")

    # Géneros
    genres: list[str] = []
    for g in raw.get("genres") or []:
        if isinstance(g, dict) and g.get("name"):
            genres.append(g["name"])

    # Plataformas
    platforms: list[str] = []
    for p in raw.get("platforms") or []:
        if isinstance(p, dict) and p.get("name"):
            platforms.append(p["name"])

    # Fecha de lanzamiento (primer elemento)
    release_date = ""
    dates = raw.get("first_release_date")
    if dates:
        from datetime import datetime, timezone
        release_date = datetime.fromtimestamp(dates, tz=timezone.utc).strftime("%Y-%m-%d")

    # Rating redondeado a 1 decimal (IGDB usa escala 0-100)
    rating = None
    if raw.get("total_rating"):
        rating = round(raw["total_rating"] / 10, 1)  # → escala 0-10

    return {
        "igdbId": raw["id"],
        "name": raw.get("name", ""),
        "slug": raw.get("slug", ""),
        "cover": _cover_url(cover_id),
        "summary": raw.get("summary", ""),
        "genres": genres,
        "platforms": platforms,
        "releaseDate": release_date,
        "rating": rating,
        "popularity": raw.get("popularity"),
    }


# ── Consultas públicas ─────────────────────────────────────────────────────────

_GAME_FIELDS = """
fields id, name, slug, summary, cover.image_id,
       genres.name, platforms.name,
       first_release_date, total_rating, popularity;
"""


async def search_games(query: str, limit: int = 20) -> list[dict]:
    """Búsqueda por texto libre en IGDB."""
    body = f"""
    {_GAME_FIELDS}
    search "{query}";
    where version_parent = null & cover != null;
    limit {limit};
    """
    raw_list = await igdb_request("games", body)
    return [map_igdb_game(g) for g in raw_list]


async def get_popular_games(limit: int = 30) -> list[dict]:
    """Juegos populares ordenados por rating para el catálogo por defecto."""
    body = f"""
    {_GAME_FIELDS}
    where total_rating_count > 50 & cover != null & version_parent = null;
    sort total_rating desc;
    limit {limit};
    """
    raw_list = await igdb_request("games", body)
    return [map_igdb_game(g) for g in raw_list]


async def get_game_by_id(igdb_id: int) -> Optional[dict]:
    """Detalle de un juego por su ID de IGDB."""
    body = f"""
    {_GAME_FIELDS}
    where id = {igdb_id};
    limit 1;
    """
    raw_list = await igdb_request("games", body)
    if not raw_list:
        return None
    return map_igdb_game(raw_list[0])
