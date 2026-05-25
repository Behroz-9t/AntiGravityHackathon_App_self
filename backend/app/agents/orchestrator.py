from ..models.schemas import OrchestrationRequest, OrchestrationResponse
from .intent import extract_intent
from .discovery import discover_providers, reverse_geocode_location, forward_geocode_location
from .ranking import rank_providers
from .booking import simulate_booking
from .followup import schedule_followup

def orchestrate_request(req: OrchestrationRequest) -> OrchestrationResponse:
    logs = []
    
    # 1. Intent Understanding
    logs.append({"agent": "Intent Agent", "action": "Analyzing request", "status": "Started"})
    intent = extract_intent(req.query)
    if req.time_slot:
        intent.time = req.time_slot
    logs.append({"agent": "Intent Agent", "action": "Extracted intent", "status": "Completed", "data": intent.model_dump()})

    # 1b. Location Resolution
    resolved_lat = req.user_lat
    resolved_lng = req.user_lng

    if req.recipient_address:
        # Book for other mode: Geocode target recipient address
        search_address = req.recipient_address
        if req.recipient_province:
            prov = req.recipient_province.strip()
            if prov.lower() not in search_address.lower():
                search_address = f"{search_address}, {prov}, Pakistan"

        logs.append({"agent": "Location Agent", "action": f"Geocoding recipient address: {search_address}", "status": "Started"})
        coords = forward_geocode_location(search_address)
        if coords:
            resolved_lat, resolved_lng = coords
            intent.location = req.recipient_address
            logs.append({
                "agent": "Location Agent",
                "action": f"Recipient location resolved: {req.recipient_address}",
                "status": "Completed",
                "data": {"gps": {"lat": resolved_lat, "lng": resolved_lng}, "resolved_location": req.recipient_address},
            })
        else:
            intent.location = req.recipient_address
            logs.append({
                "agent": "Location Agent",
                "action": f"Geocoding failed for recipient address. Using as text: {req.recipient_address}",
                "status": "Warning",
            })
    elif intent.location == "unknown" and req.user_lat is not None and req.user_lng is not None:
        logs.append({"agent": "Location Agent", "action": "No location in query — fetching real location via GPS", "status": "Started"})
        area_name = reverse_geocode_location(req.user_lat, req.user_lng)
        intent.location = area_name
        intent.confidence = min(intent.confidence + 0.15, 0.96)
        logs.append({
            "agent": "Location Agent",
            "action": f"Live location resolved: {area_name}",
            "status": "Completed",
            "data": {"gps": {"lat": req.user_lat, "lng": req.user_lng}, "resolved_location": area_name},
        })

    if intent.service == "unknown":
        logs.append({"agent": "Orchestrator", "action": "Failed to understand service", "status": "Failed"})
        return OrchestrationResponse(
            query=req.query,
            intent=intent,
            logs=logs,
            final_result="Could not determine the required service. Please be more specific."
        )

    # 2. Provider Discovery
    logs.append({"agent": "Provider Agent", "action": "Searching providers", "status": "Started"})
    providers, location_source = discover_providers(
        intent,
        user_lat=resolved_lat,
        user_lng=resolved_lng,
        query=req.query,
        recipient_province=req.recipient_province
    )

    logs.append({"agent": "Provider Agent", "action": f"Found {len(providers)} providers (location: {location_source})", "status": "Completed", "data": [p.model_dump() for p in providers]})
    
    if not providers:
        logs.append({"agent": "Orchestrator", "action": "No providers found", "status": "Failed"})
        return OrchestrationResponse(
            query=req.query,
            intent=intent,
            discovered_providers=[],
            logs=logs,
            final_result="No providers found for the requested service and location."
        )
        
    # 3. Provider Ranking
    logs.append({"agent": "Ranking Agent", "action": "Ranking providers", "status": "Started"})
    ranking_result = rank_providers(providers)
    logs.append({"agent": "Ranking Agent", "action": "Selected best provider", "status": "Completed", "data": ranking_result.model_dump()})
    
    # 4. Booking Simulation
    logs.append({"agent": "Booking Agent", "action": "Creating booking", "status": "Started"})
    booking_result = simulate_booking(ranking_result.selected_provider, intent)
    logs.append({"agent": "Booking Agent", "action": "Booking confirmed", "status": "Completed", "data": booking_result.model_dump()})
    
    # 5. Follow-Up
    logs.append({"agent": "Follow-Up Agent", "action": "Scheduling follow-up workflows", "status": "Started"})
    followup_result = schedule_followup(booking_result, req)
    

    # Traceable log for Mobile Reminder
    if req.time_slot and req.time_slot.lower() != 'immediate':
        logs.append({
            "agent": "Follow-Up Agent",
            "action": f"Scheduling upcoming reminder notification on mobile device for slot: {req.time_slot}",
            "status": "Completed",
            "data": {"notification_status": "SCHEDULED", "time_slot": req.time_slot}
        })
    else:
        logs.append({
            "agent": "Follow-Up Agent",
            "action": "Triggering immediate start push notification on mobile",
            "status": "Completed",
            "data": {"notification_status": "SENT_IMMEDIATE"}
        })

    logs.append({"agent": "Follow-Up Agent", "action": "Follow-up workflows configured", "status": "Completed", "data": followup_result.model_dump()})
    
    logs.append({"agent": "Orchestrator", "action": "Workflow complete", "status": "Completed"})
    
    return OrchestrationResponse(
        query=req.query,
        intent=intent,
        discovered_providers=providers,
        ranking=ranking_result,
        booking=booking_result,
        follow_up=followup_result,
        logs=logs,
        final_result=f"Booking confirmed for {booking_result.provider}.",
        user_lat=resolved_lat,
        user_lng=resolved_lng,
        is_for_other=req.recipient_address is not None
    )
