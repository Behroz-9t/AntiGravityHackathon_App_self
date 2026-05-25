from ..models.schemas import BookingResult, FollowUpResult, OrchestrationRequest

def schedule_followup(booking: BookingResult, req: OrchestrationRequest) -> FollowUpResult:
    is_scheduled = (
        req.time_slot
        and req.time_slot.lower() not in ('immediate', 'as soon as possible', 'now')
    )

    # ── Reminder schedule description ───────────────────────────────────────
    if is_scheduled:
        reminder_msg = (
            f"Mobile push notification scheduled 2 hours before '{req.time_slot}'."
        )
    else:
        reminder_msg = (
            f"Immediate booking confirmed. Push notification sent."
        )

    # ── Status field (shown in ReasoningScreen logs) ─────────────────────
    status_msg = f"Provider {booking.provider} is assigned and on track."

    return FollowUpResult(
        reminder=reminder_msg,
        status=status_msg,
    )
