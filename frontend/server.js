/**
 * ConnectSphere POC Frontend Server
 * Simple Express server for serving the demo UI
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname)));

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'connectsphere-poc-frontend'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 ConnectSphere POC Frontend running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 Backend API should be running on http://localhost:3002`);
});

module.exports = app;