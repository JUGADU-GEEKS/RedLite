import os
import sys
import logging
from dotenv import load_dotenv

# Load .env from backend folder
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_ack_sms")

TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN')
TWILIO_FROM_NUMBER = os.getenv('TWILIO_FROM_NUMBER')
FORCED_NUMBER = os.getenv('TWILIO_FORCE_NUMBER', '+917703928478')

if not (TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER):
    logger.error("Twilio credentials missing in .env")
    sys.exit(1)

try:
    from twilio.rest import Client
    client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    logger.info("Twilio client initialized")
except Exception as e:
    logger.error(f"Failed to initialize Twilio client: {e}")
    sys.exit(1)

case_id = "TESTCASE-" + os.urandom(4).hex()
msg_body = f"LANEZY: Your SOS ({case_id}) has been Acknowledged. Assistance will follow."

try:
    logger.info(f"Sending test ACK SMS to {FORCED_NUMBER} from {TWILIO_FROM_NUMBER}")
    msg = client.messages.create(from_=TWILIO_FROM_NUMBER, body=msg_body, to=FORCED_NUMBER)
    logger.info(f"Twilio SID: {getattr(msg, 'sid', None)} Status: {getattr(msg, 'status', None)}")
    print(f"SMS sent to {FORCED_NUMBER}. SID: {getattr(msg, 'sid', None)}")
except Exception as e:
    logger.error(f"Failed to send SMS: {e}")
    print(f"ERROR: {e}")
