from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from services.lane_service import get_lane_service, LaneService
from core.config import DEFAULT_INTERSECTION_ID

router = APIRouter()

@router.websocket("/ws/lane_feed")
async def websocket_endpoint(
    websocket: WebSocket,
    lane_service: LaneService = Depends(get_lane_service)
):
    # Read intersectionId from query param; default to DEFAULT_INTERSECTION_ID
    intersection_id = websocket.query_params.get("intersectionId") or DEFAULT_INTERSECTION_ID
    await lane_service.ws_manager.connect(websocket, intersection_id)
    await lane_service.ensure_loop(intersection_id)
    try:
        while True:
            # Keep the connection alive; no need to process messages here
            await websocket.receive_text()
    except WebSocketDisconnect:
        iid = lane_service.ws_manager.disconnect(websocket)
        if iid:
            lane_service.maybe_stop_loop(iid)
