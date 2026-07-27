
"""
Servicio IGDB — gestiona autenticación OAuth2 con Twitch y consultas a la API.

El token se cachea en memoria y se renueva automáticamente cuando expira.
"""

import time
from datetime import datetime, timezone
from typing import Optional

import httpx

from app.config import settings


# ── Token cache ────────────────────────────────────────────────────────────────

_cached_token: Optional[str] = None
_token_expires_at: float = 0.0


async def _get_access_token() -> str:
    """Devuelve un token válido, renovándolo si ha expirado."""
    global _cached_token, _token_expires_at

    if _cached_token and time.time() < _token_expires_at - 60:
        return _cached_token

    async with httpx.AsyncClient(timeout=10.0) as client:
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


# ── Petición genérica a IGDB ───────────────────────────────────────────────────

async def igdb_request(endpoint: str, body: str) -> list[dict]:
    """
    Lanza una petición POST a la API de IGDB.

    Args:
        endpoint: Por ejemplo, "games", "genres" o "platforms".
        body: Query en sintaxis APIcalypse de IGDB.
    """

    token = await _get_access_token()

    async with httpx.AsyncClient(
        timeout=httpx.Timeout(
            connect=10.0,
            read=20.0,
            write=10.0,
            pool=10.0,
        )
    ) as client:
        res = await client.post(
            f"https://api.igdb.com/v4/{endpoint}",
            headers={
                "Client-ID": settings.twitch_client_id,
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
            },
            content=body,
        )

        res.raise_for_status()

        return res.json()


# ── Constructores de URLs de imágenes ─────────────────────────────────────────

def _cover_url(
    image_id: Optional[str],
    size: str = "t_cover_big",
) -> str:
    """Construye la URL de la portada de un juego."""

    if not image_id:
        return "https://via.placeholder.com/264x352?text=No+Cover"

    return (
        "https://images.igdb.com/igdb/image/upload/"
        f"{size}/{image_id}.jpg"
    )


def _screenshot_url(
    image_id: Optional[str],
    size: str = "t_1080p",
) -> str:
    """Construye la URL de una screenshot de IGDB."""

    if not image_id:
        return ""

    return (
        "https://images.igdb.com/igdb/image/upload/"
        f"{size}/{image_id}.jpg"
    )


# ── Mapeador de respuesta ─────────────────────────────────────────────────────

def map_igdb_game(raw: dict) -> dict:
    """
    Convierte la respuesta original de IGDB al formato utilizado
    por el frontend de GameTracker.
    """

    # ── Portada ────────────────────────────────────────────────────────────────

    cover_id = None

    if isinstance(raw.get("cover"), dict):
        cover_id = raw["cover"].get("image_id")

    # ── Géneros ────────────────────────────────────────────────────────────────

    genres: list[str] = []

    for genre in raw.get("genres") or []:
        if isinstance(genre, dict) and genre.get("name"):
            genres.append(genre["name"])

    # ── Plataformas ────────────────────────────────────────────────────────────

    platforms: list[str] = []

    for platform in raw.get("platforms") or []:
        if isinstance(platform, dict) and platform.get("name"):
            platforms.append(platform["name"])

    # ── Fecha de lanzamiento ───────────────────────────────────────────────────

    release_date = ""

    first_release_date = raw.get("first_release_date")

    if first_release_date:
        release_date = datetime.fromtimestamp(
            first_release_date,
            tz=timezone.utc,
        ).strftime("%Y-%m-%d")

    # ── Rating ─────────────────────────────────────────────────────────────────

    rating = None

    if raw.get("total_rating") is not None:
        rating = round(raw["total_rating"] / 10, 1)

    # ── Screenshots ────────────────────────────────────────────────────────────

    screenshots: list[str] = []

    for screenshot in raw.get("screenshots") or []:
        if not isinstance(screenshot, dict):
            continue

        image_id = screenshot.get("image_id")

        if not image_id:
            continue

        screenshot_url = _screenshot_url(image_id)

        if screenshot_url and screenshot_url not in screenshots:
            screenshots.append(screenshot_url)

    # ── Resultado final ────────────────────────────────────────────────────────

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
        "screenshots": screenshots,
    }


# ── Campos comunes de las consultas de juegos ─────────────────────────────────

_GAME_FIELDS = """
fields
    id,
    name,
    slug,
    summary,
    cover.image_id,
    genres.name,
    platforms.name,
    first_release_date,
    total_rating,
    popularity,
    screenshots.image_id;
"""


# ── Consultas públicas ────────────────────────────────────────────────────────

async def search_games(
    query: str,
    limit: int = 20,
) -> list[dict]:
    """Busca juegos por texto libre en IGDB."""

    body = f"""
    {_GAME_FIELDS}

    search "{query}";

    where
        version_parent = null
        & cover != null;

    limit {limit};
    """

    raw_list = await igdb_request("games", body)

    return [
        map_igdb_game(game)
        for game in raw_list
    ]


async def get_popular_games(
    limit: int = 30,
) -> list[dict]:
    """Devuelve juegos populares ordenados por rating."""

    body = f"""
    {_GAME_FIELDS}

    where
        total_rating_count > 50
        & cover != null
        & version_parent = null;

    sort total_rating desc;

    limit {limit};
    """

    raw_list = await igdb_request("games", body)

    return [
        map_igdb_game(game)
        for game in raw_list
    ]


async def get_game_by_id(igdb_id: int) -> Optional[dict]:
    print(f"GET_GAME_BY_ID EJECUTADO: {igdb_id}", flush=True)

    body = f"""
    fields
        id,
        name,
        slug,
        summary,
        cover.image_id,
        genres.name,
        platforms.name,
        first_release_date,
        total_rating,
        popularity,
        screenshots.image_id;
    where id = {igdb_id};
    limit 1;
    """

    raw_list = await igdb_request("games", body)

    print("RAW IGDB RESPONSE:", flush=True)
    print(raw_list, flush=True)

    if not raw_list:
        return None

    print("SCREENSHOTS RAW:", flush=True)
    print(raw_list[0].get("screenshots"), flush=True)

    mapped_game = map_igdb_game(raw_list[0])

    print("MAPPED GAME:", flush=True)
    print(mapped_game, flush=True)

    return mapped_game