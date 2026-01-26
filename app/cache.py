from __future__ import annotations

import time
from dataclasses import dataclass
from threading import RLock
from typing import Dict, Generic, Optional, TypeVar

K = TypeVar("K")
V = TypeVar("V")


@dataclass
class CacheEntry(Generic[V]):
    value: V
    expires_at: float


class TTLCache(Generic[K, V]):
    def __init__(self, max_items: int, ttl_seconds: int):
        self._max_items = max_items
        self._ttl_seconds = ttl_seconds
        self._lock = RLock()
        self._data: Dict[K, CacheEntry[V]] = {}

    def get(self, key: K) -> Optional[V]:
        now = time.time()
        with self._lock:
            entry = self._data.get(key)
            if not entry:
                return None
            if entry.expires_at <= now:
                self._data.pop(key, None)
                return None
            return entry.value

    def set(self, key: K, value: V) -> None:
        now = time.time()
        with self._lock:
            if len(self._data) >= self._max_items:
                self._evict(now)
            self._data[key] = CacheEntry(value=value, expires_at=now + self._ttl_seconds)

    def _evict(self, now: float) -> None:
        expired_keys = [k for k, v in self._data.items() if v.expires_at <= now]
        for k in expired_keys:
            self._data.pop(k, None)
        
        if len(self._data) < self._max_items:
            return
        
        sorted_items = sorted(self._data.items(), key=lambda kv: kv[1].expires_at)
        remove_count = max(1, len(self._data) - self._max_items + 1)
        for i in range(remove_count):
            self._data.pop(sorted_items[i][0], None)

    def clear(self) -> None:
        with self._lock:
            self._data.clear()
