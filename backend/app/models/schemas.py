# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from typing import List, Optional, Any

class OrchestrationRequest(BaseModel):
    user_id: str
    query: str
    user_lat: Optional[float] = None
    user_lng: Optional[float] = None
    user_phone: Optional[str] = None
    recipient_name: Optional[str] = None
    recipient_phone: Optional[str] = None
    recipient_address: Optional[str] = None
    recipient_province: Optional[str] = None
    time_slot: Optional[str] = None
    
class Intent(BaseModel):
    service: str
    location: str
    time: str
    confidence: float

class Provider(BaseModel):
    id: str
    provider_name: str
    service_category: str
    location: str
    rating: float
    available: bool
    response_time_mins: int
    distance_km: Optional[float] = None
    estimated_arrival: Optional[str] = None
    score: Optional[float] = None
    phone_number: Optional[str] = None
    total_services: Optional[int] = None
    match_score: Optional[float] = 0.0

class RankingResult(BaseModel):
    selected_provider: Provider
    reasoning: str

class BookingResult(BaseModel):
    booking_id: str
    status: str
    provider: str
    time_slot: str
    provider_id: Optional[str] = None

class FollowUpResult(BaseModel):
    reminder: str
    status: str

class OrchestrationResponse(BaseModel):
    query: str
    intent: Optional[Intent] = None
    discovered_providers: List[Provider] = []
    ranking: Optional[RankingResult] = None
    booking: Optional[BookingResult] = None
    follow_up: Optional[FollowUpResult] = None
    logs: List[dict] = []
    final_result: str
    user_lat: Optional[float] = None
    user_lng: Optional[float] = None
    is_for_other: Optional[bool] = False

class UserProfile(BaseModel):
    id: str
    name: str
    email: str
    phone: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    phone: str
    password: str

class LoginRequest(BaseModel):
    identifier: str
    password: str

class AuthResponse(BaseModel):
    success: bool
    error: Optional[str] = None
    user: Optional[UserProfile] = None

