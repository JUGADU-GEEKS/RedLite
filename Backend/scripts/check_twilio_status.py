import os
import sys
import json
from dotenv import load_dotenv

# Load .env from project root (Backend/.env)
env_path = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '.env'))
load_dotenv(env_path)

TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN')

if not (TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN):
    print(json.dumps({'error': 'Twilio credentials missing in .env'}))
    sys.exit(2)

sids = sys.argv[1:]
if not sids:
    print('Usage: check_twilio_status.py <SID1> [SID2 ...]')
    sys.exit(1)

try:
    from twilio.rest import Client
except Exception as e:
    print(json.dumps({'error': f'Failed to import twilio: {e}'}))
    sys.exit(2)

client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
out = []
for sid in sids:
    try:
        msg = client.messages(sid).fetch()
        out.append({
            'sid': sid,
            'status': getattr(msg, 'status', None),
            'to': getattr(msg, 'to', None),
            'from': getattr(msg, 'from_', None),
            'error_code': getattr(msg, 'error_code', None),
            'error_message': getattr(msg, 'error_message', None),
            'date_sent': getattr(msg, 'date_sent', None),
            'body': getattr(msg, 'body', None)[:200] if getattr(msg, 'body', None) else None
        })
    except Exception as e:
        out.append({'sid': sid, 'error': str(e)})

print(json.dumps({'result': out}, default=str, indent=2))
