const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = 3000;

// Proxy API requests to backend - keep the /api prefix
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:8001',
  changeOrigin: true,
  // Don't strip /api from the path
  pathRewrite: undefined
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Fallback to index.html for any route not found
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Frontend server running on http://localhost:${PORT}`);
});
