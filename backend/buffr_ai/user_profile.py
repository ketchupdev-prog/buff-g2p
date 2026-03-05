"""
Fetch current user profile from Buffr Node API (single source of truth for onboarding data).

Location: backend/buffr_ai/user_profile.py
Purpose: DRY – profile lives in Node; Companion calls GET /api/v1/mobile/user/profile with
         Bearer token and uses the returned user (id, name, phone, photo_url) for context.
"""

import logging
import os
from typing import Any, Dict, Optional, Tuple

import httpx

logger = logging.getLogger(__name__)

# Base URL of the Buffr Node backend (e.g. http://localhost:3001). Set in backend/.env.
BUFFR_API_BASE_URL = os.getenv("BUFFR_API_BASE_URL", "").rstrip("/")


async def fetch_user_profile(auth_token: str) -> Optional[Dict[str, Any]]:
    """
    Fetch the current user's profile from the Buffr Node API using the session token.
    Returns the same user object the mobile app gets from GET /api/v1/mobile/user/profile.
    Single source of truth: Node backend and users table.
    """
    if not BUFFR_API_BASE_URL:
        logger.info("BUFFR_API_BASE_URL not set; Companion will not have user profile. Set it in backend/.env (e.g. http://localhost:3001).")
        return None
    token = auth_token.strip()
    if token.startswith("Bearer "):
        token = token[7:].strip()
    if not token:
        return None
    url = f"{BUFFR_API_BASE_URL}/api/v1/mobile/user/profile"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(
                url,
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            )
        if r.status_code != 200:
            logger.info("User profile fetch returned %s: %s", r.status_code, r.text[:200])
            return None
        data = r.json()
        user = data.get("user")
        if not user or not isinstance(user, dict):
            return None
        return user
    except Exception as e:
        logger.warning("Failed to fetch user profile from Node API: %s", e)
        return None


def _display_name_and_phone(profile: Dict[str, Any]) -> Tuple[Optional[str], Optional[str]]:
    """Single place for name/phone from profile (DRY). Returns (display_name, phone)."""
    name = profile.get("name") or (
        " ".join(filter(None, [profile.get("first_name"), profile.get("last_name")])).strip() or None
    )
    phone = profile.get("phone")
    return (name, phone)


def format_user_context(profile: Dict[str, Any]) -> str:
    """One-line summary for injecting into the conversation so the model sees user context without calling the tool."""
    name, phone = _display_name_and_phone(profile)
    parts = []
    if name:
        parts.append(f"name is {name}")
    if phone:
        parts.append(f"phone is {phone}")
    if not parts:
        return ""
    return f"[Current user: {'; '.join(parts)}.]"


def format_user_info_response(profile: Optional[Dict[str, Any]]) -> str:
    """Format profile for the get_user_info tool response. Single place for tool copy (DRY)."""
    if profile is None:
        return (
            "I don't have access to the current user's profile. "
            "The user can see their name and details in the Buffr app profile section."
        )
    name, phone = _display_name_and_phone(profile)
    parts = []
    if name:
        parts.append(f"Name: {name}")
    if phone:
        parts.append(f"Phone: {phone}")
    if not parts:
        return "The user's profile is available but name and phone are not set yet (e.g. onboarding not complete)."
    return "\n".join(parts)
