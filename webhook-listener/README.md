# Webhook Listener

A simple webhook listener for testing Repo Radar webhooks.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

## Usage

1. The server will start on http://localhost:3002
2. Use http://localhost:3002/webhook as your webhook URL in Repo Radar
3. When a webhook is received, it will display:
   - Request headers
   - Request body
   - Timestamp

## Testing

You can test it manually using curl:
```bash
curl -X POST http://localhost:3002/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "Hello World!"}'
```
