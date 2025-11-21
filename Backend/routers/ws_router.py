from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from services.lane_service import lane_service
import logging

router = APIRouter(prefix="/ws", tags=["WebSocket"])
logger = logging.getLogger(__name__)

@router.websocket("/lane_feed")
async def websocket_endpoint(websocket: WebSocket, intersectionId: str = Query(None)):
    await lane_service.connect_ws(websocket)
    try:
        while True:
            # Keep connection open, maybe receive commands if needed
            # For now, just listen for disconnect
            data = await websocket.receive_text()
            # Optional: handle client messages
    except WebSocketDisconnect:
        lane_service.disconnect_ws(websocket)
    except Exception as e:
        logger.error(f"WS Error: {e}")
        lane_service.disconnect_ws(websocket)
