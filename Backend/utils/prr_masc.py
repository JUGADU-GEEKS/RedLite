from typing import Dict, List
import time
from core.config import LANES, DURATIONS_BY_RANK, YELLOW_TIME, DEFAULT_INTERSECTION_ID

def prr_cycle_fixed(density: Dict[str, int], ages_snapshot: Dict[str, int]) -> Dict:
    """
    Calculates the priority order and durations for a traffic light cycle
    based on vehicle density and lane age.
    
    Priority logic:
    - If any lane has age > 60, prioritize by age (DESC), then density (DESC)
    - Otherwise, prioritize by density (DESC), then age (DESC) for tie-breaking
    - Fallback order: ["north","south","east","west"]
    """
    
    # Check if any lane has age > 60
    max_age = max(ages_snapshot.values()) if ages_snapshot else 0
    age_priority_mode = max_age > 60
    
    if age_priority_mode:
        # Priority by age (DESC), then density (DESC) for tie-breaking
        priority_order = sorted(
            LANES,
            key=lambda l: (ages_snapshot.get(l, 0), density.get(l, 0)),
            reverse=True
        )
    else:
        # Priority by density (DESC), then age (DESC) for tie-breaking
        priority_order = sorted(
            LANES,
            key=lambda l: (density.get(l, 0), ages_snapshot.get(l, 0)),
            reverse=True
        )
    
    # Fallback order if all values are equal
    if len(set((density.get(l, 0), ages_snapshot.get(l, 0)) for l in LANES)) == 1:
        priority_order = LANES.copy()  # Use default order
    
    # Assign durations based on rank (fixed timings)
    durations = {lane: DURATIONS_BY_RANK[i] for i, lane in enumerate(priority_order)}
    
    # Determine initial light states (first lane green, others red)
    final_lights = {lane: "red" for lane in LANES}
    if priority_order:
        final_lights[priority_order[0]] = "green"

    return {
        "intersectionId": DEFAULT_INTERSECTION_ID,
        "timestamp": int(time.time()),
        "priority_order": priority_order,
        "durations": durations,
        "final_lights": final_lights,
        "yellow_time": YELLOW_TIME
    }
