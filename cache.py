import time
from typing import Any


class TTLCache:
    def __init__(self, ttl_seconds: int):
        self.ttl = ttl_seconds
        self._store: dict[str, tuple[float, Any]] = {}

    def get(self, key: str):
        item = self._store.get(key)
        if not item:
            return None
        exp, val = item
        if exp < time.time():
            self._store.pop(key, None)
            return None
        return val

    def set(self, key: str, val: Any):
        self._store[key] = (time.time() + self.ttl, val)
