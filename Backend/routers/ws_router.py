from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from services.lane_service import get_lane_service, LaneService

router = APIRouter()

@router.websocket("/ws/lane_feed")
async def websocket_endpoint(
    websocket: WebSocket,
    lane_service: LaneService = Depends(get_lane_service)
):
    await lane_service.ws_manager.connect(websocket)
    try:
        while True:
            # The server will push updates, so we just wait here
            await websocket.receive_text()
    except WebSocketDisconnect:
        lane_service.ws_manager.disconnect(websocket)
