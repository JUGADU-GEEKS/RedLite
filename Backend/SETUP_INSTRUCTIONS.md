# RedLite2.0 Backend Setup Instructions

## Environment Variables Setup

To enable call alerts via Omnidim SDK, create a `.env` file in the Backend directory with the following variables:

```env
# Omnidim SDK Configuration
# Get these values from your Omnidim dashboard
API_KEY=your_api_key_here
AGENT_ID=123456
FROM_NUMBER_ID=789012
TO_NUMBER=+1234567890
```

### How to get these values:

1. **API_KEY**: Your Omnidim API key from the dashboard
2. **AGENT_ID**: The ID of your agent in Omnidim (integer)
3. **FROM_NUMBER_ID**: The ID of the phone number to call from (integer)
4. **TO_NUMBER**: The phone number to call (string with country code, e.g., +1234567890)

### Without these variables:

The system will still work for:
- Traffic light control
- Ambulance detection and override
- Vehicle counting
- Email alerts

But call alerts will be disabled and you'll see a warning message in the logs.

## Running the Backend

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the server:
   ```bash
   python main.py
   ```

The server will start on `http://localhost:8000` and show configuration status in the logs.
