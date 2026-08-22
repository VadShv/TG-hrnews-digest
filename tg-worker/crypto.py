"""AES-256-GCM encryption for the TG session string (compatible key derivation with the app)."""

import os
import base64
import hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def _get_key() -> bytes:
    raw = os.environ.get("APP_ENCRYPTION_KEY", "")
    if not raw:
        raise RuntimeError("APP_ENCRYPTION_KEY is not set")
    # Accept 32-byte hex (64 chars)
    if len(raw) == 64:
        try:
            return bytes.fromhex(raw)
        except ValueError:
            pass
    return hashlib.sha256(raw.encode()).digest()


def encrypt(plain: str) -> str:
    key = _get_key()
    aes = AESGCM(key)
    nonce = os.urandom(12)
    ct = aes.encrypt(nonce, plain.encode("utf-8"), None)
    return f"{base64.b64encode(nonce).decode()}:{base64.b64encode(ct).decode()}"


def decrypt(payload: str) -> str:
    key = _get_key()
    aes = AESGCM(key)
    parts = payload.split(":")
    if len(parts) != 2:
        raise ValueError("Invalid encrypted payload")
    nonce = base64.b64decode(parts[0])
    ct = base64.b64decode(parts[1])
    return aes.decrypt(nonce, ct, None).decode("utf-8")
