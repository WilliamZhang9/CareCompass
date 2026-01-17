import json
from fastapi import FastAPI, HTTPException
from app.models import RecommendRequest, RecommendResponse, FacilityScore
from app.cache import TTLCache
from app.config import settings
from app.elevenlabs_client import ElevenLabsClient
from app.facility_provider import FacilityProvider
from app.scoring import predict_wait_seconds, explain

app = FastAPI(title="Montreal Care Router")

cache = TTLCache(settings.cache_ttl_seconds)
tts = ElevenLabsClient()

# If you want everything through Gumloop, remove this and implement POI discovery in Gumloop too.
facility_provider = FacilityProvider()


def _cache_key(req: RecommendRequest) -> str:
    # bucket by minute to avoid hammering APIs
    lat = round(req.lat, 4)
    lng = round(req.lng, 4)
    return f"{lat}:{lng}:{req.severity}:{req.mode}:{req.radius_m}"


@app.post("/recommend", response_model=RecommendResponse)
async def recommend(req: RecommendRequest):
    # Safety note (not medical advice): for severe emergencies call local emergency services.
    if req.severity == "high":
        # still proceed, but your frontend should show emergency disclaimer
        pass

    key = _cache_key(req)
    cached = cache.get(key)
    if cached and not req.include_tts:
        return cached

    # 1) facilities
    hospitals = await facility_provider.nearby(req.lat, req.lng, req.radius_m, "hospital")
    clinics = []
    if req.severity == "low":
        clinics = await facility_provider.nearby(req.lat, req.lng, req.radius_m, "clinic")

    candidates = (hospitals + clinics)[: settings.max_candidates]
    if not candidates:
        raise HTTPException(404, "No facilities found in radius")

    # 2) travel times via Gumloop in a single flow run (batched)
    origin = f"{req.lat},{req.lng}"
    destinations = [f"{f.lat},{f.lng}" for f in candidates]

    durations = await facility_provider.travel_times(
    req.lat, req.lng, candidates, req.mode
)

    if raw is None:
        raise HTTPException(500, f"Gumloop outputs missing durations_seconds: {outputs}")

    durations = json.loads(raw) if isinstance(raw, str) else raw
    if not isinstance(durations, list) or len(durations) != len(candidates):
        raise HTTPException(500, "Gumloop durations shape mismatch")

    # 3) score = travel + wait
    scored: list[FacilityScore] = []
    for f, travel_s in zip(candidates, durations):
        travel_s = int(travel_s)
        wait_s = int(predict_wait_seconds(f, req.severity))
        total = travel_s + wait_s
        scored.append(
            FacilityScore(
                facility=f,
                travel_seconds=travel_s,
                predicted_wait_seconds=wait_s,
                total_seconds=total,
                explanation=explain(f, travel_s, wait_s),
            )
        )

    scored.sort(key=lambda x: x.total_seconds)
    best = scored[0]
    alts = scored[1:6]

    mins = max(1, round(best.travel_seconds / 60))
    spoken = f"Closest facility is {mins} minutes at {best.facility.name}, {best.facility.address}."

    audio_b64 = None
    if req.include_tts:
        audio_b64 = await tts.tts_base64(spoken)

    resp = RecommendResponse(
        recommended=best,
        alternatives=alts,
        spoken_text=spoken,
        tts_audio_base64=audio_b64,
    )

    if not req.include_tts:
        cache.set(key, resp)

    return resp
