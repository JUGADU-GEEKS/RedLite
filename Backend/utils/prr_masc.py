from typing import Dict, List, Any
import time
from core.config import LANES, DURATIONS_BY_RANK, YELLOW_TIME

def prr_cycle_fixed(density: Dict[str, int], ages_snapshot: Dict[str, int], intersection_id: str) -> Dict[str, Any]:
    """
    Computes the priority order and durations for a traffic cycle.
    
    Args:
        density: Dictionary of vehicle counts per lane.
        ages_snapshot: Dictionary of current age (waiting time score) per lane.
        intersection_id: ID of the intersection.
        
    Returns:
        State dictionary containing priority order, durations, etc.
    """
    
    # Ranking logic:
    # Sort lanes by density (descending), then by age (descending) as tie-breaker.
    # Note: In Python sort is stable, so we can sort by secondary key first then primary.
    # Or use a tuple key.
    # We want higher density first. If density equal, higher age first.
    
    # Ensure all lanes are present in density and ages, default to 0
    safe_density = {l: density.get(l, 0) for l in LANES}
    safe_ages = {l: ages_snapshot.get(l, 0) for l in LANES}
    
    priority_order = sorted(
        LANES,
        key=lambda l: (safe_density[l], safe_ages[l]),
        reverse=True
    )
    
    # Assign durations based on rank
    durations = {}
    for i, lane in enumerate(priority_order):
        if i < len(DURATIONS_BY_RANK):
            durations[lane] = DURATIONS_BY_RANK[i]
        else:
            durations[lane] = 15 # Default fallback
            
    state = {
        "intersectionId": intersection_id,
        "timestamp": time.time(),
        "priority_order": priority_order,
        "durations": durations,
        "yellow_time": YELLOW_TIME,
        "ages_snapshot": safe_ages,
        "density_snapshot": safe_density
    }
    
    return state
