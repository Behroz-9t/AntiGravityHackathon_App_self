from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.models.schemas import (
    OrchestrationRequest, OrchestrationResponse,
    RegisterRequest, LoginRequest, AuthResponse
)
from app.agents.orchestrator import orchestrate_request
from app.database import create_user, authenticate_user, update_provider_availability

app = FastAPI(title="AI Service Orchestrator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/v1/auth/register", response_model=AuthResponse)
async def register(req: RegisterRequest):
    res = create_user(req.name, req.email, req.phone, req.password)
    return AuthResponse(
        success=res["success"],
        error=res.get("error"),
        user=res.get("user")
    )

@app.post("/api/v1/auth/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    res = authenticate_user(req.identifier, req.password)
    return AuthResponse(
        success=res["success"],
        error=res.get("error"),
        user=res.get("user")
    )

@app.post("/api/v1/orchestrate", response_model=OrchestrationResponse)
async def orchestrate(req: OrchestrationRequest):
    return orchestrate_request(req)

@app.get("/api/v1/health")
async def health_check():
    return {"status": "ok"}

from pydantic import BaseModel

class CancelBookingRequest(BaseModel):
    provider_id: str
    reason: str

class StartBookingRequest(BaseModel):
    provider_id: str

class CompleteBookingRequest(BaseModel):
    provider_id: str

@app.post("/api/v1/bookings/cancel")
async def cancel_booking(req: CancelBookingRequest):
    res = update_provider_availability(req.provider_id, True)
    print(f"[NOTIFICATION] Booking cancelled. Provider {req.provider_id} released.")
    return {"success": res}

@app.post("/api/v1/bookings/start")
async def start_booking(req: StartBookingRequest):
    res = update_provider_availability(req.provider_id, False)
    print(f"[NOTIFICATION] Booking started. Provider {req.provider_id} is now busy.")
    return {"success": res, "message": "Booking started notification received."}

@app.post("/api/v1/bookings/complete")
async def complete_booking(req: CompleteBookingRequest):
    res = update_provider_availability(req.provider_id, True)
    print(f"[NOTIFICATION] Booking completed. Provider {req.provider_id} is now available.")
    return {"success": res, "message": "Booking completed notification received."}

@app.get("/")
async def root():
    return {"message": "Welcome to AI Service Orchestrator API. Visit /docs for Swagger UI."}
