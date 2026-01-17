import httpx
from app.config import settings
from app.models import Facility


class FacilityProvider:
    def __init__(self):
        if not settings.google_maps_api_key:
            raise RuntimeError("GOOGLE_MAPS_API_KEY not set in .env")

    # -------------------------------------------------
    # Find nearby hospitals or clinics using Places API
    # -------------------------------------------------
    async def nearby(self, lat: float, lng: float, radius_m: int, kind: str) -> list[Facility]:
        """
        kind: "hospital" or "clinic"
        """
        place_type = "hospital" if kind == "hospital" else "doctor"
        keyword = None if kind == "hospital" else "walk-in clinic urgent care"

        url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
        params = {
            "key": settings.google_maps_api_key,
            "location": f"{lat},{lng}",
            "radius": radius_m,
            "type": place_type,
        }

        if keyword:
            params["keyword"] = keyword

        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(url, params=params)
            r.raise_for_status()
            data = r.json()

        facilities: list[Facility] = []

        for p in data.get("results", []):
            loc = p.get("geometry", {}).get("location", {})
            facilities.append(
                Facility(
                    id=p.get("place_id", ""),
                    name=p.get("name", "Unknown"),
                    address=p.get("vicinity", "") or p.get("formatted_address", ""),
                    lat=float(loc.get("lat")),
                    lng=float(loc.get("lng")),
                    kind="hospital" if kind == "hospital" else "clinic",
                    phone=None,
                    website=None,
                )
            )

        return facilities

    # -------------------------------------------------
    # Get travel times WITH live traffic
    # -------------------------------------------------
    async def travel_times(self, user_lat: float, user_lng: float, facilities: list[Facility], mode: str):
        """
        Returns list of travel times (seconds) aligned with facilities order.
        Uses real-time traffic when mode == "driving".
        """

        if not facilities:
            return []

        origin = f"{user_lat},{user_lng}"
        destinations = "|".join(f"{f.lat},{f.lng}" for f in facilities)

        url = "https://maps.googleapis.com/maps/api/distancematrix/json"

        params = {
            "origins": origin,
            "destinations": destinations,
            "mode": mode,
            "key": settings.google_maps_api_key,
        }

        # Enable live traffic for driving
        if mode == "driving":
            params["departure_time"] = "now"
            params["traffic_model"] = "best_guess"

        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(url, params=params)
            r.raise_for_status()
            data = r.json()

        rows = data.get("rows", [])
        if not rows:
            raise RuntimeError("No rows returned from Distance Matrix API")

        elements = rows[0].get("elements", [])
        times: list[int] = []

        for el in elements:
            if el.get("status") == "OK":
                # Prefer traffic-aware time if available
                if "duration_in_traffic" in el:
                    times.append(int(el["duration_in_traffic"]["value"]))
                else:
                    times.append(int(el["duration"]["value"]))
            else:
                # Unreachable → very large time so it won't be selected
                times.append(10**9)

        return times
