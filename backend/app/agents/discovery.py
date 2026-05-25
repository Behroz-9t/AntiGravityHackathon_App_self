import json
import os
import math
import requests
from typing import List, Optional, Tuple
from ..database import get_all_providers
from ..models.schemas import Provider, Intent

# Known Islamabad sectors — used only when user explicitly names one in their query
ISLAMABAD_SECTORS = {
    "G-13": {"lat": 33.6490, "lng": 72.9690},
    "G-11": {"lat": 33.6690, "lng": 72.9890},
    "G-9":  {"lat": 33.6820, "lng": 73.0290},
    "G-10": {"lat": 33.6755, "lng": 73.0090},
    "G-6":  {"lat": 33.7050, "lng": 73.0590},
    "G-7":  {"lat": 33.6990, "lng": 73.0490},
    "G-8":  {"lat": 33.6900, "lng": 73.0390},
    "F-8":  {"lat": 33.7120, "lng": 73.0430},
    "F-7":  {"lat": 33.7200, "lng": 73.0550},
    "F-10": {"lat": 33.6930, "lng": 73.0140},
    "F-11": {"lat": 33.6980, "lng": 73.0000},
    "F-6":  {"lat": 33.7300, "lng": 73.0650},
    "E-11": {"lat": 33.7260, "lng": 73.0060},
    "I-8":  {"lat": 33.6680, "lng": 73.0720},
    "I-9":  {"lat": 33.6640, "lng": 73.0650},
    "I-10": {"lat": 33.6610, "lng": 73.0580},
    "H-9":  {"lat": 33.6750, "lng": 73.0500},
    "H-11": {"lat": 33.6850, "lng": 73.0000},
    "D-12": {"lat": 33.7400, "lng": 73.0200},
    "B-17": {"lat": 33.7500, "lng": 72.9300},
}

# Pakistan centre as absolute last resort
DEFAULT_COORDS = {"lat": 30.3753, "lng": 69.3451}


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine formula — distance in km between two GPS points."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
         * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)


def reverse_geocode_location(lat: float, lng: float) -> str:
    """
    Convert GPS coordinates to a human-readable Pakistani area name
    using the free OpenStreetMap Nominatim API.
    Returns e.g. "Malir, Karachi" / "Gulberg, Lahore" / "G-13, Islamabad".
    Falls back to coordinate string if the API is unreachable.
    """
    try:
        url = "https://nominatim.openstreetmap.org/reverse"
        params = {
            "lat": lat,
            "lon": lng,
            "format": "json",
            "zoom": 14,          # neighbourhood / suburb granularity
            "addressdetails": 1,
        }
        headers = {"User-Agent": "AntiGravityServiceApp/1.0"}
        resp = requests.get(url, params=params, headers=headers, timeout=5)
        resp.raise_for_status()
        data = resp.json()
        addr = data.get("address", {})

        # Build "Neighbourhood, City" label from address fields
        neighbourhood = (
            addr.get("suburb")
            or addr.get("neighbourhood")
            or addr.get("city_district")
            or addr.get("county")
            or addr.get("town")
        )
        city = addr.get("city") or addr.get("town") or addr.get("village") or addr.get("state")

        if neighbourhood and city and neighbourhood != city:
            return f"{neighbourhood}, {city}"
        elif city:
            return city
        elif neighbourhood:
            return neighbourhood
        # Ultimate fallback — first part of display_name
        return data.get("display_name", "").split(",")[0].strip() or f"{lat:.4f}°N, {lng:.4f}°E"
    except Exception:
        # Network failure or timeout — use coordinate string so UI still shows something
        return f"{lat:.4f}°N, {lng:.4f}°E"


def forward_geocode_location(location_name: str) -> Optional[Tuple[float, float]]:
    """
    Convert a location name (e.g., 'Malir, Karachi') into GPS coordinates
    using OpenStreetMap Nominatim API.
    """
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            "q": location_name,
            "format": "json",
            "limit": 1
        }
        headers = {"User-Agent": "AntiGravityServiceApp/1.0"}
        resp = requests.get(url, params=params, headers=headers, timeout=5)
        resp.raise_for_status()
        data = resp.json()
        if data:
            return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception as e:
        print(f"Forward geocode failed for {location_name}: {e}")
    return None


# Keep this for backwards compat (Islamabad-only search by sector)
def find_nearest_sector(lat: float, lng: float) -> str:
    """Snap GPS to nearest Islamabad sector name (used only for pure Islamabad queries)."""
    nearest = min(
        ISLAMABAD_SECTORS.items(),
        key=lambda item: calculate_distance(lat, lng, item[1]["lat"], item[1]["lng"])
    )
    return nearest[0]


def estimated_arrival_str(distance_km: float, response_time_mins: int) -> str:
    """ETA = travel time (at 30 km/h city speed) + provider response time."""
    travel_mins = int((distance_km / 30.0) * 60)
    total_mins = travel_mins + response_time_mins
    if total_mins < 60:
        return f"{total_mins} min"
    hours = total_mins // 60
    mins = total_mins % 60
    return f"{hours}h {mins}min" if mins else f"{hours}h"


def get_city(location_str: str) -> Optional[str]:
    """Helper to categorize location text or coordinates to a city name."""
    s = location_str.lower()
    if "karachi" in s or "malir" in s:
        return "karachi"
    if "lahore" in s:
        return "lahore"
    if "islamabad" in s:
        return "islamabad"
    if "rawalpindi" in s:
        return "rawalpindi"
    if "multan" in s:
        return "multan"
    if "peshawar" in s:
        return "peshawar"
    if "quetta" in s:
        return "quetta"
    return None


def discover_providers(
    intent: Intent,
    user_lat: Optional[float] = None,
    user_lng: Optional[float] = None,
    query: Optional[str] = None,
    recipient_province: Optional[str] = None,
) -> Tuple[List[Provider], str]:
    """
    Find and rank service providers for the given intent.

    Location priority (for distance calculation):
      1. Named Islamabad sector in the query  → use sector centre coords
      2. Geocoded named location (e.g. Malir Karachi) → use resolved GPS
      3. Real GPS from device                 → use raw GPS (works anywhere in Pakistan)
      4. Pakistan centre                      → absolute last resort, app never crashes
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    mock_file = os.path.join(base_dir, "mock_data", "providers.json")

    all_providers = get_all_providers()
    if not all_providers:
        with open(mock_file, "r", encoding="utf-8") as f:
            all_providers = json.load(f)

    # Determine user city
    user_city = None
    if intent.location != "unknown":
        user_city = get_city(intent.location)

    if not user_city and recipient_province:
        prov = recipient_province.lower()
        if "sindh" in prov:
            user_city = "karachi"
        elif "islamabad" in prov:
            user_city = "islamabad"
        elif "punjab" in prov:
            loc_text = intent.location.lower()
            if "multan" in loc_text or "gulgasht" in loc_text:
                user_city = "multan"
            elif "rawalpindi" in loc_text or "saddar" in loc_text:
                user_city = "rawalpindi"
            else:
                user_city = "lahore"

    # --- Resolve coordinates for distance measurement ---
    resolved_coords = None
    if intent.location != "unknown":
        if intent.location in ISLAMABAD_SECTORS:
            resolved_coords = ISLAMABAD_SECTORS[intent.location]
        else:
            # Geocode the location name to support non-Islamabad locations (e.g., Karachi, Lahore)
            coords = forward_geocode_location(intent.location)
            if coords:
                resolved_coords = {"lat": coords[0], "lng": coords[1]}
                if not user_city:
                    try:
                        addr = reverse_geocode_location(coords[0], coords[1])
                        user_city = get_city(addr)
                    except Exception:
                        pass

    lat_val = user_lat if user_lat is not None else (resolved_coords["lat"] if resolved_coords else None)
    lng_val = user_lng if user_lng is not None else (resolved_coords["lng"] if resolved_coords else None)
    if not user_city and lat_val is not None and lng_val is not None:
        if 24.7 <= lat_val <= 25.4 and 66.8 <= lng_val <= 67.5:
            user_city = "karachi"
        elif 31.3 <= lat_val <= 31.6 and 74.2 <= lng_val <= 74.5:
            user_city = "lahore"
        elif 33.5 <= lat_val <= 33.8 and 72.8 <= lng_val <= 73.2:
            user_city = "islamabad"
        elif 30.15 <= lat_val <= 30.25 and 71.4 <= lng_val <= 71.6:
            user_city = "multan"

    if resolved_coords is not None:
        user_coords = resolved_coords
        location_source = f"geocoded ({intent.location})"
    elif user_lat is not None and user_lng is not None:
        user_coords = {"lat": user_lat, "lng": user_lng}
        location_source = f"GPS ({intent.location})"
    else:
        user_coords = None
        location_source = f"text match ({intent.location})"

    # --- Filter by service category & compute distances ---
    NEARBY_KM   = 50   # prefer providers within this radius
    MAX_RESULTS = 6    # cap list size — only show what matters

    all_service: List[Provider] = []
    for p in all_providers:
        if p["service_category"].strip().lower() != intent.service.strip().lower():
            continue

        # Strict city boundaries filtering
        p_city = get_city(p.get("location", ""))
        if user_city:
            if user_city == "karachi" and p_city != "karachi":
                continue
            elif user_city == "lahore" and p_city != "lahore":
                continue
            elif user_city == "multan" and p_city != "multan":
                continue
            elif user_city in ["islamabad", "rawalpindi"] and p_city not in ["islamabad", "rawalpindi"]:
                continue

        p_coords = p.get("coordinates", DEFAULT_COORDS)
        
        if user_coords is not None:
            dist = calculate_distance(
                user_coords["lat"], user_coords["lng"],
                p_coords["lat"],   p_coords["lng"],
            )
        else:
            # Fallback to textual match if we have no coordinates at all
            p_loc = p["location"].lower()
            i_loc = intent.location.lower()
            if i_loc in p_loc or p_loc in i_loc:
                dist = 2.0  # arbitrary close distance
            else:
                dist = 999.0 # far away

        if dist < 0.05:
            dist = 0.3

        # Generate deterministic contact number and services count
        pid_num = int(p["id"].replace("p", "")) if p["id"].replace("p", "").replace("_","").isdigit() else 1
        phone_num = f"0312{1000000 + (pid_num * 13579) % 8999999}"
        services_count = 15 + (pid_num * 7) % 150

        # Calculate prompt matching score in any field
        match_score = 0.0
        if query:
            import re
            q_lower = query.lower()
            p_name = p["provider_name"].lower()
            p_loc = p["location"].lower()
            p_cat = p["service_category"].lower()
            p_id = p["id"].lower()

            # 1. Direct name match
            if p_name in q_lower or q_lower in p_name:
                match_score += 15.0
            else:
                q_words = set(re.findall(r'\w+', q_lower))
                p_words = set(re.findall(r'\w+', p_name))
                overlap = q_words.intersection(p_words)
                overlap = {w for w in overlap if len(w) > 2 or w in ['ac', 'fix']}
                match_score += len(overlap) * 4.0

            # 2. Location match
            if p_loc in q_lower or q_lower in p_loc:
                match_score += 8.0
            else:
                q_words = set(re.findall(r'\w+', q_lower))
                l_words = set(re.findall(r'\w+', p_loc))
                overlap = q_words.intersection(l_words)
                overlap = {w for w in overlap if len(w) > 2}
                match_score += len(overlap) * 3.0

            # 3. Category match
            if p_cat in q_lower or q_lower in p_cat:
                match_score += 5.0

            # 4. ID match
            if p_id in q_lower or q_lower in p_id:
                match_score += 20.0

        all_service.append(Provider(
            id=p["id"],
            provider_name=p["provider_name"],
            service_category=p["service_category"],
            location=p["location"],
            rating=p["rating"],
            available=p["available"],
            response_time_mins=p["response_time_mins"],
            distance_km=dist,
            estimated_arrival=estimated_arrival_str(dist, p["response_time_mins"]),
            phone_number=phone_num,
            total_services=services_count,
            match_score=match_score
        ))

    # Sort by prioritized matching rules:
    # 1. Location closest (distance_km ascending)
    # 2. Available or not (available first)
    # 3. Rating (rating descending)
    # 4. Overall service / reviews (total_services descending)
    def provider_sort_key(prov):
        dist = prov.distance_km if prov.distance_km is not None else 999.0
        avail_val = -1 if prov.available else 0
        rating_val = -prov.rating if prov.rating is not None else 0.0
        services_val = -getattr(prov, 'total_services', 0)
        return (dist, avail_val, rating_val, services_val)

    all_service.sort(key=provider_sort_key)

    # Keep only providers that are geographically nearby (within 50 km).
    # If none exist, we return an empty list so that the app displays "No Providers Found"
    # instead of fallback matching providers from other provinces.
    nearby = [p for p in all_service if p.distance_km <= NEARBY_KM]
    discovered = nearby[:MAX_RESULTS]

    return discovered, location_source
