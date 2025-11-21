from typing import Dict, List
import time
from core.config import LANES, DURATIONS_BY_RANK, YELLOW_TIME, DEFAULT_INTERSECTION_ID

def prr_cycle_fixed(density: Dict[str, int], ages_snapshot: Dict[str, int]) -> Dict:
    """
    Calculates the priority order and durations for a traffic light cycle
    based on vehicle density and lane age.
    """
    
    # Rank lanes based on density (desc) and age (desc) for tie-breaking
    priority_order = sorted(
        LANES,
        key=lambda l: (density.get(l, 0), ages_snapshot.get(l, 0)),
        reverse=True
    )
    
    # Assign durations based on rank
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
