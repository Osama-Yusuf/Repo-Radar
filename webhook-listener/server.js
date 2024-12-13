const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');

const app = express();
const port = 3002; // Different from main app port

// Middleware
app.use(bodyParser.json());
app.use(morgan('dev')); // Logs HTTP requests

// Webhook endpoint
app.post('/webhook', (req, res) => {
    console.log('\n🔔 Webhook received!');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('\nBody:', JSON.stringify(req.body, null, 2));
    
    // Send success response
    res.json({
        status: 'success',
        message: 'Webhook received successfully',
        timestamp: new Date().toISOString()
    });
});

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Webhook listener is running',
        usage: {
            endpoint: '/webhook',
            method: 'POST',
            contentType: 'application/json'
        }
    });
});

app.listen(port, () => {
    console.log(`
🚀 Webhook listener is running!
📍 URL: http://localhost:${port}/webhook
ℹ️  Send POST requests to test your webhooks
    `);
});
