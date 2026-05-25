import uuid
from ..models.schemas import Provider, BookingResult, Intent
from ..database import update_provider_availability

def simulate_booking(provider: Provider, intent: Intent) -> BookingResult:
    booking_id = f"BKG-{str(uuid.uuid4())[:8].upper()}"
    # Mark provider as unavailable in MongoDB
    update_provider_availability(provider.id, False)
    return BookingResult(
        booking_id=booking_id,
        status="CONFIRMED",
        provider=provider.provider_name,
        time_slot=intent.time,
        provider_id=provider.id
    )
