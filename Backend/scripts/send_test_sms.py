#!/usr/bin/env python3
"""Send a single test SMS using Twilio credentials from Backend/.env.

Usage:
  python scripts/send_test_sms.py +917703928478

This script loads environment variables from the project's `.env` file (via python-dotenv)
and attempts to send a simple test message. It prints the Twilio message SID on success
or the full error on failure.
"""
import sys
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

TWILIO_SID = os.getenv('TWILIO_ACCOUNT_SID')
TWILIO_TOKEN = os.getenv('TWILIO_AUTH_TOKEN')
TWILIO_FROM = os.getenv('TWILIO_FROM_NUMBER')

if len(sys.argv) < 2:
    print('Usage: python scripts/send_test_sms.py <E.164_PHONE_NUMBER>')
    sys.exit(1)

to_number = sys.argv[1]

if not (TWILIO_SID and TWILIO_TOKEN and TWILIO_FROM):
    print('Twilio credentials are not configured in Backend/.env')
    sys.exit(2)

try:
    from twilio.rest import Client
except Exception as e:
    print('Twilio package not installed. Install with: pip install twilio')
    print('Error:', e)
    sys.exit(3)

client = Client(TWILIO_SID, TWILIO_TOKEN)

body = (
    '🚨 LANEZY SOS TEST MESSAGE\n'
    'This is a test SMS sent via Twilio for integration verification.\n'
    'If you received this, Twilio integration is working.'
)

print(f'Sending test SMS from {TWILIO_FROM} to {to_number} ...')
try:
    msg = client.messages.create(
        from_=TWILIO_FROM,
        to=to_number,
        body=body
    )
    print('Message sent. SID:', getattr(msg, 'sid', None))
    print('Full message object:', msg)
except Exception as e:
    print('Failed to send message:')
    print(e)
    sys.exit(4)
