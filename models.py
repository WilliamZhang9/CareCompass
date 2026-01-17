from pydantic import BaseModel, Field
from typing import Literal


Severity = Literal["low", "medium", "high"]
TravelMode = Literal["driving", "transit", "walking"]


class RecommendRequest(BaseModel):
    lat: float
    lng: float
    severity: Severity = "medium"
    mode: TravelMode = "driving"
    radius_m: int = Field(default=6000, ge=500, le=25000)
    include_tts: bool = False


class Facility(BaseModel):
    id: str
    name: str
    address: str
    lat: float
    lng: float
    kind: Literal["hospital", "clinic"]
    phone: str | None = None
    website: str | None = None


class FacilityScore(BaseModel):
    facility: Facility
    travel_seconds: int
    predicted_wait_seconds: int
    total_seconds: int
    explanation: str


class RecommendResponse(BaseModel):
    recommended: FacilityScore
    alternatives: list[FacilityScore]
    spoken_text: str
    tts_audio_base64: str | None = None
