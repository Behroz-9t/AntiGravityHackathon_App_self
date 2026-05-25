from typing import List
from ..models.schemas import Provider, RankingResult

def rank_providers(providers: List[Provider]) -> RankingResult:
    if not providers:
        return None
        
    # Define prioritized match sort key:
    # 1. Closeness (distance_km ascending)
    # 2. Availability (available first)
    # 3. Rating (rating descending)
    # 4. Overall service / reviews (total_services descending)
    def provider_sort_key(p):
        dist = p.distance_km if p.distance_km is not None else 999.0
        avail_val = -1 if p.available else 0
        rating_val = -p.rating if p.rating is not None else 0.0
        services_val = -getattr(p, 'total_services', 0)
        return (dist, avail_val, rating_val, services_val)

    # Sort the providers list in-place
    providers.sort(key=provider_sort_key)

    # Select the first available provider (closest available)
    best_provider = None
    for p in providers:
        if p.available:
            best_provider = p
            break

    # Fallback to the first provider (even if busy) if absolutely none are available
    if not best_provider and providers:
        best_provider = providers[0]

    # Assign scores for logs/compatibility based on sorted order
    for i, p in enumerate(providers):
        p.score = round(10.0 - i * 0.5, 3)

    if best_provider:
        reasoning = f"Selected {best_provider.provider_name} as the best match. "
        if best_provider.distance_km < 3:
            reasoning += "It is the closest available provider. "
        if best_provider.rating > 4.5:
            reasoning += f"It is highly rated ({best_provider.rating}/5). "
        if best_provider.available:
            reasoning += "It is immediately available."
        else:
            reasoning += "All providers are currently busy; placed in queue."
            
        return RankingResult(
            selected_provider=best_provider,
            reasoning=reasoning
        )
    return None
