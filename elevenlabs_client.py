import httpx
from app.config import settings


class ElevenLabsClient:
    async def tts_bytes(self, text: str) -> bytes:
        if not settings.eleven_api_key or not settings.eleven_voice_id:
            raise RuntimeError("ElevenLabs not configured (ELEVEN_API_KEY / ELEVEN_VOICE_ID).")

        url = f"https://api.elevenlabs.io/v1/text-to-speech/{settings.eleven_voice_id}"
        headers = {
            "xi-api-key": settings.eleven_api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        }
        payload = {
            "text": text,
            "model_id": "eleven_multilingual_v2",
        }

        async with httpx.AsyncClient(timeout=12.0) as client:
            r = await client.post(url, headers=headers, json=payload)
            r.raise_for_status()
            return r.content   # raw MP3 bytes
