from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.responses import JSONResponse
import os
import json
import time
import asyncio
import uuid
import logging
from math import radians, cos, sin, asin, sqrt
from dotenv import load_dotenv
from fastapi import Request

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sos", tags=["sos"])

# Load environment variables from the project's .env (same technique as send_test_sms.py)
try:
    env_path = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '.env'))
    load_dotenv(env_path)
    logger.info(f"[SOS] Loaded .env from {env_path}")
except Exception:
    logger.debug("[SOS] No .env file loaded or load failed; relying on environment variables")


def haversine(lat1, lon1, lat2, lon2):
    # convert decimal degrees to radians
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    # haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    c = 2 * asin(sqrt(a))
    r = 6371  # Radius of earth in kilometers
    return c * r

# Read verified numbers from env (comma-separated) or fall back to the two provided numbers
VERIFIED_NUMBERS = [n.strip() for n in os.getenv('TWILIO_VERIFIED_NUMBERS', '+917703928478,+919910974301').split(',') if n.strip()]
# Optional: force all SOS sends to a single number (useful for testing)
TWILIO_FORCE_SINGLE = os.getenv('TWILIO_FORCE_SINGLE', '0').lower() in ('1', 'true', 'yes')
TWILIO_FORCE_NUMBER = os.getenv('TWILIO_FORCE_NUMBER', '+917703928478')


@router.post("/send")
async def send_sos(data: dict = Body(...), request: Request = None):
    """Receive SOS POST and notify nearest authorities via Twilio SMS.

    Expected body:
    {
      "userId": "",
      "userName": "",
      "phone": "",
      "vehicle": "",
      "latitude": 0,
      "longitude": 0
    }
    """
    logger.info(f"[SOS] Received payload: {data}")

    # Resolve authenticated user from Bearer token (lazy import to avoid import-time errors)
    user_record = None
    try:
        auth_header = None
        if request:
            auth_header = request.headers.get('authorization') or request.headers.get('Authorization')
        token = None
        if auth_header and auth_header.lower().startswith('bearer '):
            token = auth_header.split(' ', 1)[1]
        if token:
            from services.auth_service import decode_access_token
            payload = decode_access_token(token)
            # lazy import get_db to fetch full user record
            from deps.auth_deps import get_db
            db = await get_db()
            user_record = await db.users.find_one({
                'userId': payload.get('userId'),
                'email': payload.get('email')
            })
    except Exception:
        user_record = None

    # Use authenticated user info primarily; fall back to request body for non-sensitive fields
    user_id = (user_record.get('userId') if user_record else None) or data.get('userId') or data.get('user_id') or 'unknown'
    user_name = (user_record.get('name') if user_record else None) or data.get('userName') or data.get('user') or 'Unknown'
    # Prefer mobile/phone stored on user record; if absent, use payload phone (less trusted)
    phone = (user_record.get('mobile') if user_record else None) or (user_record.get('phone') if user_record else None) or data.get('phone') or 'Not provided'
    vehicle = (user_record.get('vehicle') if user_record else None) or (user_record.get('vehicleId') if user_record else None) or data.get('vehicle') or data.get('vehicleId') or 'not provided'

    # Parse coordinates safely; allow None and handle later
    def _to_float(v):
        try:
            if v is None:
                return None
            return float(v)
        except Exception:
            return None

    lat = _to_float(data.get('latitude') or data.get('lat') or (data.get('coords')[0] if isinstance(data.get('coords'), (list, tuple)) else None))
    lon = _to_float(data.get('longitude') or data.get('lon') or (data.get('coords')[1] if isinstance(data.get('coords'), (list, tuple)) else None))

    # Require realtime coordinates from the request (do not accept hard-coded fallback)
    if lat is None or lon is None:
        logger.warning(f"[SOS] Latitude/longitude missing or invalid in payload; lat={lat}, lon={lon}.")
        raise HTTPException(status_code=400, detail="latitude and longitude are required and must be valid numbers")

    # Load authorities DB
    auth_db_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'authorities.json')
    auth_db_path = os.path.normpath(auth_db_path)
    try:
        with open(auth_db_path, 'r', encoding='utf-8') as f:
            authorities = json.load(f)
    except Exception as e:
        return JSONResponse({'status': 'error', 'message': f'Failed to load authorities DB: {e}'}, status_code=500)

    # Compute distances
    for a in authorities:
        try:
            a_lat = float(a.get('lat'))
            a_lon = float(a.get('lng') if a.get('lng') is not None else a.get('lon') or a.get('long') or 0)
            a['distance_km'] = haversine(lat, lon, a_lat, a_lon)
        except Exception:
            a['distance_km'] = 1e6

    # Select nearest 8 authorities (compute distances first)
    authorities_sorted = sorted(authorities, key=lambda x: x.get('distance_km', 1e6))
    nearby = authorities_sorted[:8]

    # Prefer sending only to known verified numbers while keeping the nearest-authority calculation intact.
    # Find the nearest authority entries that map to each verified number (preserves proximity semantics).
    selected = []
    seen_phones = set()
    for v in VERIFIED_NUMBERS:
        for a in nearby:
            phone = a.get('phone') or a.get('contact') or a.get('tel')
            if not phone:
                continue
            if phone == v and phone not in seen_phones:
                selected.append(a)
                seen_phones.add(phone)
                break

    # If for some reason none of the nearby authorities matched a verified number,
    # fall back to including the verified numbers as raw targets (without authority metadata).
    to_notify = selected
    if not to_notify:
        logger.warning('[SOS] No nearby authority entries matched verified numbers; falling back to verified numbers directly')
        for v in VERIFIED_NUMBERS:
            to_notify.append({'name': 'Verified Number', 'phone': v, 'lat': None, 'lng': None, 'distance_km': None})

    # If configured, force sending only to a single number (useful for debugging/delivery testing).
    if TWILIO_FORCE_SINGLE:
        logger.info(f"[SOS] TWILIO_FORCE_SINGLE enabled; forcing notifications to only {TWILIO_FORCE_NUMBER}")
        to_notify = [{'name': 'Forced Target', 'phone': TWILIO_FORCE_NUMBER, 'lat': None, 'lng': None, 'distance_km': None}]

    # If TWILIO_FORCE_SINGLE is enabled we already forced `to_notify` above.
    # For delivery reliability, when forcing to a single number send a concise SMS body.

    # Debug: show the nearby authorities considered (name, phone, distance)
    logger.info(f"[SOS] Nearby authorities (nearest 8): {[{'name':a.get('name'),'phone':a.get('phone'),'dist_km':a.get('distance_km')} for a in nearby]}")
    logger.info(f"[SOS] Incoming SOS from {data.get('userName')} ({data.get('userId')}) -> {len(to_notify)} authorities to notify")
    logger.info(f"[SOS] Selected authorities: {[{'name':a.get('name'),'phone':a.get('phone'),'dist_km':a.get('distance_km')} for a in to_notify]}")

    # Prepare Twilio client (only if enabled)
    twilio_sid = os.getenv('TWILIO_ACCOUNT_SID')
    twilio_token = os.getenv('TWILIO_AUTH_TOKEN')
    twilio_from = os.getenv('TWILIO_FROM_NUMBER')
    twilio_send_enabled = os.getenv('TWILIO_SEND_ENABLED', '0').lower() in ('1', 'true', 'yes')

    sms_results = []
    client = None
    if twilio_send_enabled:
        if not (twilio_sid and twilio_token and twilio_from):
            logger.error('[SOS] TWILIO_SEND_ENABLED is true but Twilio credentials are missing in environment/.env')
        else:
            try:
                from twilio.rest import Client
                client = Client(twilio_sid, twilio_token)
                logger.info('[SOS] Twilio client initialised')
            except Exception as e:
                client = None
                logger.error(f'[SOS] Failed to import/initialise Twilio client: {e}')

    server_time = time.strftime('%Y-%m-%d %H:%M:%S')
    case_id = uuid.uuid4().hex

    # Build message
    # Build a concise, delivery-friendly SMS body containing the requested fields
    # Fields: User (name), Location (lat,lon), Vehicle, Contact number, Case ID
    base_message = (
        f"LANEZY SOS\n"
        f"User: {user_name}\n"
        f"Contact: {phone}\n"
        f"Vehicle: {vehicle}\n"
        f"Location: {lat},{lon}\n"
    )

    for auth in to_notify:
        auth_phone = auth.get('phone') or auth.get('contact') or auth.get('tel')
        auth_name = auth.get('name') or 'Authority'
        sms_status = {'name': auth_name, 'phone': auth_phone, 'status': 'skipped', 'sid': None}
        if client and twilio_from and auth_phone:
            try:
                msg = client.messages.create(
                    from_=twilio_from,
                    body=base_message,
                    to=auth_phone
                )
                sms_status['status'] = 'sent'
                sms_status['sid'] = getattr(msg, 'sid', None)
            except Exception as e:
                sms_status['status'] = 'failed'
                sms_status['error'] = str(e)
                logger.error(f"[SOS] Failed to send SMS to {auth_phone}: {e}")
        else:
            # If Twilio is disabled or not configured, record as 'skipped' to avoid errors during development
            if not twilio_send_enabled:
                sms_status['status'] = 'skipped (dev)'
            else:
                sms_status['status'] = 'skipped'
        sms_results.append(sms_status)

    # If forced single mode is enabled and there's a second verified number,
    # send the same concise message to the second verified number after a short delay.
    if TWILIO_FORCE_SINGLE and len(VERIFIED_NUMBERS) > 1:
        second = VERIFIED_NUMBERS[1]
        logger.info(f"[SOS] TWILIO_FORCE_SINGLE: will send to second verified number {second} after 5s")
        try:
            await asyncio.sleep(5)
            sms_status = {'name': 'Secondary Verified', 'phone': second, 'status': 'skipped', 'sid': None}
            if client and twilio_from and second:
                try:
                    msg = client.messages.create(from_=twilio_from, body=base_message, to=second)
                    sms_status['status'] = 'sent'
                    sms_status['sid'] = getattr(msg, 'sid', None)
                except Exception as e:
                    sms_status['status'] = 'failed'
                    sms_status['error'] = str(e)
                    logger.error(f"[SOS] Failed to send SMS to secondary {second}: {e}")
            else:
                if not twilio_send_enabled:
                    sms_status['status'] = 'skipped (dev)'
                else:
                    sms_status['status'] = 'skipped'
            sms_results.append(sms_status)
        except Exception as e:
            logger.error(f"[SOS] Error during delayed secondary send: {e}")

    logger.info(f"[SOS] SMS results: {sms_results}")

    # Persist SOS record to MongoDB (and fall back to file if DB unavailable)
    record = {
        'caseId': case_id,
        'timestamp': server_time,
        'userId': user_id,
        'userName': user_name,
        'phone': phone,
        'vehicle': vehicle,
        'latitude': lat,
        'longitude': lon,
        'status': 'Pending',
        'authorities': to_notify,
        'sms': sms_results
    }

    db_saved = False
    try:
        from ..deps.auth_deps import get_db
        db = await get_db()
        res = await db.sos.insert_one(record)
        record['_id'] = str(res.inserted_id)
        db_saved = True

        # Also push a lightweight entry into the user's document for quick profile view
        if user_id and user_id != 'unknown':
            try:
                summary = {'caseId': case_id, 'timestamp': server_time, 'status': 'Pending'}
                await db.users.update_one({'userId': user_id}, {'$push': {'sos_history': summary}})
            except Exception as e:
                logger.error(f"[SOS] Failed to push sos_history into user document: {e}")
    except Exception as e:
        logger.warning(f"[SOS] Failed to persist SOS to MongoDB, falling back to file: {e}")

    # Fallback: persist to local file as a secondary store (keeps compatibility)
    sos_db_path = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'data', 'sos_db.json'))
    try:
        if not os.path.exists(sos_db_path):
            with open(sos_db_path, 'w', encoding='utf-8') as f:
                json.dump([], f)

        with open(sos_db_path, 'r+', encoding='utf-8') as f:
            try:
                existing = json.load(f)
            except Exception:
                existing = []
            existing.append(record)
            f.seek(0)
            json.dump(existing, f, indent=2)
            f.truncate()
    except Exception as e:
        logger.error(f"[SOS] Failed to persist SOS record to local file: {e}")

    notified = [{'name': r['name'], 'phone': r['phone'], 'status': r['status']} for r in sms_results]

    result = {'status': 'success', 'caseId': case_id, 'notified': notified, 'sms': sms_results}
    if db_saved:
        result['stored'] = 'db'
    else:
        result['stored'] = 'file'
    return result


@router.get('/list')
def list_sos():
    """Return all SOS records (most recent first). Uses DB if available, else file."""
    try:
        # try DB
        from ..deps.auth_deps import get_db
        # cannot await in sync function; return a helpful message to call /sos/list-async for DB-backed listing in this deployment
        return JSONResponse({'status': 'error', 'message': 'Use /sos/list-async for DB-backed listing in this deployment'}, status_code=400)
    except Exception:
        sos_db_path = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'data', 'sos_db.json'))
        try:
            if not os.path.exists(sos_db_path):
                return {'status': 'success', 'items': []}
            with open(sos_db_path, 'r', encoding='utf-8') as f:
                items = json.load(f)
                items = list(reversed(items))
                return {'status': 'success', 'items': items}
        except Exception as e:
            logger.error(f"[SOS] Failed to read sos_db.json: {e}")
            return JSONResponse({'status': 'error', 'message': str(e)}, status_code=500)


@router.get('/user')
async def user_sos(request: Request):
    """Return SOS records for the authenticated user.

    This endpoint performs lazy token decode at runtime to avoid import-time
    dependency resolution which can fail when optional heavy packages are
    unavailable during application startup.
    """
    # Resolve authenticated user from Bearer token (lazy)
    user_record = None
    try:
        auth_header = request.headers.get('authorization') or request.headers.get('Authorization')
        token = None
        if auth_header and auth_header.lower().startswith('bearer '):
            token = auth_header.split(' ', 1)[1]
        if token:
            from services.auth_service import decode_access_token
            payload = decode_access_token(token)
            # lazy import get_db to fetch full user record
            from deps.auth_deps import get_db
            db = await get_db()
            user_record = await db.users.find_one({
                'userId': payload.get('userId'),
                'email': payload.get('email')
            })
    except Exception:
        user_record = None

    user_id = user_record.get('userId') if user_record else None
    if not user_id:
        raise HTTPException(status_code=401, detail='Not authenticated')

    # Prefer DB-backed records
    try:
        from ..deps.auth_deps import get_db
        db = await get_db()
        items = await db.sos.find({'userId': user_id}).to_list(length=1000)
        # Most recent first: rely on insertion order; reverse for latest-first
        items = list(reversed(items))
        # Convert ObjectId to string if present
        for it in items:
            if '_id' in it:
                try:
                    it['_id'] = str(it['_id'])
                except Exception:
                    pass
        return {'status': 'success', 'items': items}
    except Exception as e:
        logger.warning(f"[SOS] DB unavailable for user_sos, falling back to file: {e}")
        sos_db_path = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'data', 'sos_db.json'))
        try:
            if not os.path.exists(sos_db_path):
                return {'status': 'success', 'items': []}
            with open(sos_db_path, 'r', encoding='utf-8') as f:
                items = json.load(f)
                user_items = [r for r in items if r.get('userId') == user_id]
                user_items = list(reversed(user_items))
                return {'status': 'success', 'items': user_items}
        except Exception as e:
            logger.error(f"[SOS] Failed to read sos_db.json for user: {e}")
            return JSONResponse({'status': 'error', 'message': str(e)}, status_code=500)


@router.get('/status')
def sos_status(caseId: str):
    """Return status for a caseId."""
    sos_db_path = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'data', 'sos_db.json'))
    try:
        if not os.path.exists(sos_db_path):
            return JSONResponse({'status': 'error', 'message': 'No records'}, status_code=404)
        with open(sos_db_path, 'r', encoding='utf-8') as f:
            items = json.load(f)
            for r in items:
                if r.get('caseId') == caseId:
                    return {'status': 'success', 'caseId': caseId, 'recordStatus': r.get('status', 'Pending')}
        return JSONResponse({'status': 'error', 'message': 'caseId not found'}, status_code=404)
    except Exception as e:
        logger.error(f"[SOS] Failed to read sos_db.json for status: {e}")
        return JSONResponse({'status': 'error', 'message': str(e)}, status_code=500)
@router.post('/acknowledge')
async def acknowledge_sos(data: dict = Body(...), request: Request = None):
    """Acknowledge or report a SOS case by delegating to the ack_service.

    This wrapper keeps ack logic separate from send_sos so the SOS send
    logic remains untouched. It calls `services.ack_service.acknowledge_case`.
    """
    case_id = data.get('caseId')
    if not case_id:
        return JSONResponse({'status': 'error', 'message': 'caseId required'}, status_code=400)

    action = data.get('action') or 'ack'
    ack_by = data.get('ackBy') or 'authority'

    try:
        from services.ack_service import acknowledge_case
        res = await acknowledge_case(case_id=case_id, action=action, ack_by=ack_by, request=request)
        return res
    except Exception as e:
        logger.error(f"[SOS] ack wrapper failed: {e}")
        return JSONResponse({'status': 'error', 'message': str(e)}, status_code=500)


@router.get('/debug/resolve/{caseId}')
async def debug_resolve_phone(caseId: str, request: Request = None):
    """Debug helper: show the SOS record and the phone that would be resolved for ack.

    Returns: { record: {...}, resolved_phone: "+919..." }
    """
    try:
        from services.ack_service import _resolve_user_phone
        # Try DB first
        try:
            from deps.auth_deps import get_db
            db = await get_db()
            rec = await db.sos.find_one({'caseId': caseId})
            resolved = await _resolve_user_phone(rec, request)
            return {'status': 'success', 'record': rec, 'resolved_phone': resolved}
        except Exception:
            # fallback to file
            sos_db_path = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'data', 'sos_db.json'))
            if not os.path.exists(sos_db_path):
                return JSONResponse({'status': 'error', 'message': 'No records'}, status_code=404)
            with open(sos_db_path, 'r', encoding='utf-8') as f:
                items = json.load(f)
                for r in items:
                    if r.get('caseId') == caseId:
                        resolved = await _resolve_user_phone(r, request)
                        return {'status': 'success', 'record': r, 'resolved_phone': resolved}
            return JSONResponse({'status': 'error', 'message': 'caseId not found'}, status_code=404)
    except Exception as e:
        logger.error(f"[SOS] debug_resolve_phone failed: {e}")
        return JSONResponse({'status': 'error', 'message': str(e)}, status_code=500)


@router.get('/twilio-status/{caseId}')
async def twilio_status(caseId: str):
    """Return Twilio delivery status for every Message SID recorded for a caseId.

    Response: { status: 'success', items: [{ sid, phone, twilio_status, error_code, error_message }] }
    """
    # Load record from DB or file
    record = None
    try:
        from deps.auth_deps import get_db
        db = await get_db()
        record = await db.sos.find_one({'caseId': caseId})
    except Exception:
        try:
            sos_db_path = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'data', 'sos_db.json'))
            if not os.path.exists(sos_db_path):
                return JSONResponse({'status': 'error', 'message': 'No records'}, status_code=404)
            with open(sos_db_path, 'r', encoding='utf-8') as f:
                items = json.load(f)
                for r in items:
                    if r.get('caseId') == caseId:
                        record = r
                        break
        except Exception as e:
            logger.error(f"[SOS] twilio_status failed to load record: {e}")
            return JSONResponse({'status': 'error', 'message': str(e)}, status_code=500)

    if not record:
        return JSONResponse({'status': 'error', 'message': 'caseId not found'}, status_code=404)

    # Collect SIDs
    sids = []
    for s in record.get('sms', []) or []:
        sid = s.get('sid')
        phone = s.get('phone') or s.get('to')
        if sid:
            sids.append({'sid': sid, 'phone': phone})

    if not sids:
        return {'status': 'success', 'items': [], 'message': 'No Twilio SIDs recorded for this case'}

    # Init Twilio client
    tw_sid = os.getenv('TWILIO_ACCOUNT_SID')
    tw_token = os.getenv('TWILIO_AUTH_TOKEN')
    if not (tw_sid and tw_token):
        return JSONResponse({'status': 'error', 'message': 'Twilio credentials not configured'}, status_code=500)

    try:
        from twilio.rest import Client
        client = Client(tw_sid, tw_token)
    except Exception as e:
        logger.error(f"[SOS] Failed to init Twilio client for status check: {e}")
        return JSONResponse({'status': 'error', 'message': str(e)}, status_code=500)

    loop = asyncio.get_event_loop()
    results = []
    for item in sids:
        sid = item['sid']
        phone = item.get('phone')

        def _fetch(sid_local):
            try:
                m = client.messages(sid_local).fetch()
                return {
                    'status': getattr(m, 'status', None),
                    'error_code': getattr(m, 'error_code', None),
                    'error_message': getattr(m, 'error_message', None),
                    'to': getattr(m, 'to', None),
                    'from': getattr(m, 'from_', None)
                }
            except Exception as e:
                return {'status': 'error', 'error': str(e)}

        tw = await loop.run_in_executor(None, _fetch, sid)
        results.append({'sid': sid, 'phone': phone, 'twilio': tw})

    return {'status': 'success', 'items': results}


@router.post('/admin/test-ack')
async def admin_test_ack(data: dict = Body(...), request: Request = None):
    """Admin test endpoint: trigger an ACK flow for a given caseId targeting the user's phone.

    Body: { caseId: string }
    Returns the same payload as `acknowledge_case`.
    """
    case_id = data.get('caseId')
    if not case_id:
        return JSONResponse({'status': 'error', 'message': 'caseId required'}, status_code=400)

    try:
        from services.ack_service import acknowledge_case
        # Use ack_by='admin' to mark this as a manual test
        res = await acknowledge_case(case_id=case_id, action='ack', ack_by='admin', request=request)
        return res
    except Exception as e:
        logger.error(f"[SOS] admin_test_ack failed for {case_id}: {e}")
        return JSONResponse({'status': 'error', 'message': str(e)}, status_code=500)
