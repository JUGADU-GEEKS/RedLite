import os
import time
import json
import logging
from fastapi.responses import JSONResponse
from fastapi import Request

logger = logging.getLogger(__name__)

# Helper to resolve user's phone similar to send_sos
async def _resolve_user_phone(record=None, req: Request = None):
    try:
        auth_header = None
        if req:
            auth_header = req.headers.get('authorization') or req.headers.get('Authorization')
        token = None
        if auth_header and auth_header.lower().startswith('bearer '):
            token = auth_header.split(' ', 1)[1]
        if token:
            from services.auth_service import decode_access_token
            payload = decode_access_token(token)
            from deps.auth_deps import get_db
            db = await get_db()
            u = await db.users.find_one({'userId': payload.get('userId'), 'email': payload.get('email')})
            if u:
                return u.get('mobile') or u.get('phone')
    except Exception:
        pass

    try:
        if record:
            p = record.get('phone')
            if p and p != 'Not provided':
                return p
    except Exception:
        pass

    try:
        if record and record.get('userId'):
            from deps.auth_deps import get_db
            db = await get_db()
            u = await db.users.find_one({'userId': record.get('userId')})
            if u:
                return u.get('mobile') or u.get('phone')
    except Exception:
        pass

    return None


async def _init_twilio_client():
    twilio_sid = os.getenv('TWILIO_ACCOUNT_SID')
    twilio_token = os.getenv('TWILIO_AUTH_TOKEN')
    twilio_from = os.getenv('TWILIO_FROM_NUMBER')
    twilio_send_enabled = os.getenv('TWILIO_SEND_ENABLED', '0').lower() in ('1', 'true', 'yes')

    client = None
    if twilio_send_enabled:
        if not (twilio_sid and twilio_token and twilio_from):
            logger.error('[ACK] TWILIO_SEND_ENABLED is true but Twilio credentials are missing')
        else:
            try:
                from twilio.rest import Client
                client = Client(twilio_sid, twilio_token)
                logger.info('[ACK] Twilio client initialised')
            except Exception as e:
                client = None
                logger.error(f'[ACK] Failed to initialise Twilio client: {e}')
    return client, twilio_from, twilio_send_enabled


async def _send_short_ack_sms(client, twilio_from, user_phone, case_id, new_status):
    if not client or not twilio_from or not user_phone:
        return None
    try:
        short_msg = f"LANEZY: Your SOS ({case_id}) has been {new_status}. Assistance will follow."
        msg = client.messages.create(from_=twilio_from, body=short_msg, to=user_phone)
        return {'status': 'sent', 'sid': getattr(msg, 'sid', None), 'phone': user_phone}
    except Exception as e:
        logger.error(f"[ACK] Failed to send ack SMS to {user_phone}: {e}")
        return {'status': 'failed', 'error': str(e), 'phone': user_phone}


async def acknowledge_case(case_id: str, action: str = 'ack', ack_by: str = 'authority', request: Request = None):
    action = (action or 'ack').lower()
    new_status = 'Acknowledged' if action == 'ack' else 'Reported'

    # init twilio
    client, twilio_from, twilio_send_enabled = await _init_twilio_client()

    # Try DB first
    try:
        from deps.auth_deps import get_db
        db = await get_db()
        record = await db.sos.find_one({'caseId': case_id})
        if not record:
            record = None
        else:
            # update record
            await db.sos.update_one({'caseId': case_id}, {'$set': {'status': new_status, 'ack_time': time.strftime('%Y-%m-%d %H:%M:%S'), 'ack_by': ack_by}})

            sms_result = None
            # Only send SMS for 'ack' action
            if action == 'ack':
                verified_number = os.getenv('TWILIO_FORCE_NUMBER', '+917703928478')
                logger.info(f"[ACK] Forcing ACK SMS to verified number: {verified_number} for case={case_id}")
                if client and twilio_from and verified_number:
                    # More informative SMS body for authority
                    short_msg = f"LANEZY ALERT:\nSOS case {case_id} has been ACKNOWLEDGED by authority.\nUser: {record.get('userName', 'Unknown')}\nContact: {record.get('phone', 'N/A')}\nVehicle: {record.get('vehicle', 'N/A')}\nLocation: {record.get('latitude', 'N/A')},{record.get('longitude', 'N/A')}\nTime: {record.get('timestamp', 'N/A')}\nPlease proceed with necessary action."
                    from twilio.rest import Client
                    try:
                        msg = client.messages.create(from_=twilio_from, body=short_msg, to=verified_number)
                        sms_result = {'status': 'sent', 'sid': getattr(msg, 'sid', None), 'phone': verified_number}
                    except Exception as e:
                        logger.error(f"[ACK] Failed to send ack SMS to {verified_number}: {e}")
                        sms_result = {'status': 'failed', 'error': str(e), 'phone': verified_number}
                # Overwrite the record's sms array to contain only the ack send result
                try:
                    new_sms_arr = [sms_result] if sms_result is not None else []
                    await db.sos.update_one({'caseId': case_id}, {'$set': {'sms': new_sms_arr}})
                except Exception:
                    pass
            # For 'report', do NOT send SMS

            # Fault tolerance logic for report action
            try:
                user_id = record.get('userId')
                user_name = record.get('userName')
                user_email = record.get('email', None)
                logger.info(f"[REPORT] Attempting fault count update for userId={user_id}, userName={user_name}, email={user_email}")
                if user_id and user_id != 'unknown':
                    summary = {'caseId': case_id, 'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'), 'status': new_status}
                    await db.users.update_one({'userId': user_id}, {'$push': {'sos_history': summary}})
                    if action == 'report':
                        user_doc = await db.users.find_one({'userId': user_id})
                        if not user_doc:
                            # If user not found, create with fault_count 1 and suspended False
                            await db.users.update_one({'userId': user_id}, {'$set': {'fault_count': 1, 'suspended': False}}, upsert=True)
                            logger.warning(f"[REPORT] User {user_id} not found, created with fault_count=1.")
                        else:
                            fault_count = int(user_doc.get('fault_count', 0)) + 1
                            suspended = fault_count >= 3
                            await db.users.update_one({'userId': user_id}, {'$set': {'fault_count': fault_count, 'suspended': suspended}})
                            logger.info(f"[REPORT] User {user_id} fault_count incremented to {fault_count}, suspended={suspended}")
                else:
                    logger.error(f"[REPORT] Could not update fault count: userId missing in SOS record (caseId={case_id})")
            except Exception as e:
                logger.error(f"[ACK] Failed to update user's sos_history or fault count: {e}")

            return {'status': 'success', 'caseId': case_id, 'stored': 'db', 'ack': new_status, 'sms': sms_result}
    except Exception as e:
        logger.warning(f"[ACK] DB unavailable for acknowledge, falling back to file: {e}")

    # fallback to file
    sos_db_path = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'data', 'sos_db.json'))
    try:
        if not os.path.exists(sos_db_path):
            return JSONResponse({'status': 'error', 'message': 'No records'}, status_code=404)
        with open(sos_db_path, 'r+', encoding='utf-8') as f:
            try:
                items = json.load(f)
            except Exception:
                items = []
            found = False
            sms_result = None
            for r in items:
                if r.get('caseId') == case_id:
                    r['status'] = new_status
                    r['ack_time'] = time.strftime('%Y-%m-%d %H:%M:%S')
                    r['ack_by'] = ack_by
                    user_phone = await _resolve_user_phone(r, request)
                    found = True
                    if action == 'ack' and client and twilio_from and user_phone:
                        sms_result = await _send_short_ack_sms(client, twilio_from, user_phone, case_id, new_status)
                        # Replace any prior sms entries for this case with ack result only
                        r['sms'] = [sms_result] if sms_result is not None else []
                    elif action == 'report':
                        # Increment fault_count in a local user file (if exists)
                        user_db_path = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'data', 'users.json'))
                        try:
                            if os.path.exists(user_db_path):
                                with open(user_db_path, 'r+', encoding='utf-8') as uf:
                                    try:
                                        users = json.load(uf)
                                    except Exception:
                                        users = []
                                    for user in users:
                                        if user.get('userId') == r.get('userId'):
                                            user['fault_count'] = int(user.get('fault_count', 0)) + 1
                                            user['suspended'] = user['fault_count'] >= 3
                                            break
                                    uf.seek(0)
                                    json.dump(users, uf, indent=2)
                                    uf.truncate()
                        except Exception as e:
                            logger.error(f"[ACK] Failed to update fault_count in fallback user file: {e}")
                    break
            if not found:
                return JSONResponse({'status': 'error', 'message': 'caseId not found'}, status_code=404)
            f.seek(0)
            json.dump(items, f, indent=2)
            f.truncate()
        return {'status': 'success', 'caseId': case_id, 'stored': 'file', 'ack': new_status, 'sms': sms_result}
    except Exception as e:
        logger.error(f"[ACK] Failed to persist acknowledgement: {e}")
        return JSONResponse({'status': 'error', 'message': str(e)}, status_code=500)
