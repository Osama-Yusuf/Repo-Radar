const http = require('http');
const https = require('https');

const REQUEST_TIMEOUT_MS = 15000; // 15 seconds

/**
 * Performs an HTTP(S) GET request to check the status of a URL.
 * @param {string} targetUrl - The URL to check (e.g., "http://example.com", "https://example.com").
 * @returns {Promise<{statusCode: number | null, statusOk: boolean, responseTimeMs: number, errorMessage: string | null}>}
 *          A promise that resolves with an object containing the check result.
 */
async function checkUrl(targetUrl) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let endTime;

    const protocol = targetUrl.startsWith('https://') ? https : http;
    const parsedUrl = new URL(targetUrl);

    const options = {
      method: 'GET',
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (protocol === https ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      timeout: REQUEST_TIMEOUT_MS,
    };

    const req = protocol.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk; // Consume response data
      });

      res.on('end', () => {
        endTime = Date.now();
        const responseTimeMs = endTime - startTime;
        const statusCode = res.statusCode;
        const statusOk = statusCode >= 200 && statusCode < 400;
        
        resolve({
          statusCode,
          statusOk,
          responseTimeMs,
          errorMessage: null,
        });
      });
    });

    req.on('error', (error) => {
      endTime = Date.now();
      const responseTimeMs = endTime - startTime;
      resolve({
        statusCode: null,
        statusOk: false,
        responseTimeMs,
        errorMessage: error.message,
      });
    });

    req.on('timeout', () => {
      endTime = Date.now();
      const responseTimeMs = endTime - startTime; // Or simply REQUEST_TIMEOUT_MS
      req.destroy(); // Destroy the request to ensure no further activity
      resolve({
        statusCode: null,
        statusOk: false,
        responseTimeMs,
        errorMessage: 'Request timed out',
      });
    });

    req.end();
  });
}

module.exports = {
  checkUrl,
};
