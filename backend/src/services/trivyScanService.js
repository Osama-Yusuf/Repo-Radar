const { spawn } = require('child_process');

// Define a timeout for the scan process (e.g., 10 minutes)
const SCAN_TIMEOUT_MS = 10 * 60 * 1000; 

/**
 * Scans a container image using Trivy.
 * @param {string} imageName - The name of the image (e.g., "nginx", "myrepo/myapp").
 * @param {string} imageTag - The tag of the image (e.g., "latest", "1.21.0").
 * @param {string} [imageDigest] - The digest of the image (e.g., "sha256:abcdef..."). Preferred for accuracy.
 * @returns {Promise<{success: boolean, data?: any, error?: string, details?: string, trivyExitCode?: number, rawOutput?: string}>}
 *          A promise that resolves with the scan result.
 *          `success: true` means Trivy ran and produced parsable JSON output.
 *          `success: false` indicates an issue with Trivy execution, timeout, or unparsable output.
 */
async function scanImage(imageName, imageTag, imageDigest) {
  let imageStringToScan;
  if (imageDigest) {
    imageStringToScan = `${imageName}@${imageDigest}`;
  } else if (imageTag) {
    imageStringToScan = `${imageName}:${imageTag}`;
  } else {
    // Fallback, though our DB schema implies tag or digest should generally be available
    imageStringToScan = imageName; 
    console.warn(`[TrivyScanService] Scanning image "${imageName}" without a specific tag or digest. This might lead to unpredictable results.`);
  }

  const logPrefix = `[TrivyScanService Scan: ${imageStringToScan}]`;
  console.log(`${logPrefix} Starting scan.`);

  const trivyArgs = [
    'image',
    '--format', 'json',
    '--quiet', // Suppresses progress bar and non-JSON output to stderr if successful
    '--severity', 'CRITICAL,HIGH,MEDIUM,LOW,UNKNOWN', // Include UNKNOWN severity
    imageStringToScan
  ];

  console.log(`${logPrefix} Executing Trivy command: trivy ${trivyArgs.join(' ')}`);

  return new Promise((resolve) => {
    let stdoutData = '';
    let stderrData = '';
    let scanTimeoutId;

    const trivyProcess = spawn('trivy', trivyArgs);

    // Set up timeout
    scanTimeoutId = setTimeout(() => {
      console.error(`${logPrefix} Scan timed out after ${SCAN_TIMEOUT_MS / 1000} seconds.`);
      trivyProcess.kill('SIGKILL'); // Forcefully terminate the process
      // The 'close' event will eventually fire, or 'error' if kill fails, which will trigger resolution.
      // To ensure timely resolution on timeout if 'close' is delayed:
      resolve({
        success: false,
        error: 'Scan timed out',
        details: `Trivy process killed after ${SCAN_TIMEOUT_MS / 1000}s timeout. Stderr: ${stderrData}`,
        trivyExitCode: -1, // Indicate timeout
        rawOutput: stdoutData
      });
    }, SCAN_TIMEOUT_MS);

    trivyProcess.stdout.on('data', (data) => {
      const chunk = data.toString();
      // console.log(`${logPrefix} stdout chunk: ${chunk.substring(0,100)}...`); // Can be very verbose
      stdoutData += chunk;
    });

    trivyProcess.stderr.on('data', (data) => {
      const chunk = data.toString();
      console.log(`${logPrefix} stderr chunk: ${chunk}`);
      stderrData += chunk;
    });

    trivyProcess.on('error', (spawnError) => {
      clearTimeout(scanTimeoutId);
      console.error(`${logPrefix} Failed to start Trivy process: ${spawnError.message}`, spawnError);
      resolve({
        success: false,
        error: 'Failed to start Trivy process',
        details: spawnError.message,
        trivyExitCode: -1, // Indicate spawn error
        rawOutput: stdoutData
      });
    });

    trivyProcess.on('close', (code) => {
      clearTimeout(scanTimeoutId);
      console.log(`${logPrefix} Trivy process exited with code ${code}.`);
      console.log(`${logPrefix} Total stdout length: ${stdoutData.length}`);
      console.log(`${logPrefix} Total stderr length: ${stderrData.length}`);

      if (stdoutData.trim()) {
        try {
          const parsedJson = JSON.parse(stdoutData);
          // Even if code is non-zero, if we got JSON, it might contain partial results or specific error messages from Trivy.
          // For example, Trivy might output JSON detailing why an image couldn't be scanned and exit > 0.
          if (code !== 0) {
             console.warn(`${logPrefix} Trivy exited with code ${code} but produced JSON output. Treating as success with potential issues in data.`);
          }
          resolve({
            success: true, // Trivy ran and we got parsable data
            data: parsedJson,
            trivyExitCode: code, // Include exit code for context
            details: stderrData // Include stderr for warnings or additional info
          });
        } catch (parseError) {
          const outputSnippet = stdoutData.substring(0, 200); // Get a snippet of the output
          console.error(`${logPrefix} Error parsing Trivy JSON output: ${parseError.message}. Output snippet: "${outputSnippet}"`, parseError);
          resolve({
            success: false,
            error: 'Failed to parse Trivy JSON output',
            details: stderrData || parseError.message,
            trivyExitCode: code,
            rawOutput: stdoutData
          });
        }
      } else {
        // No stdout data, or only whitespace
        let errorMsg = 'Trivy produced no parsable output.';
        if (code !== 0) {
          errorMsg = `Trivy exited with code ${code} and no parsable output.`;
        }
        // Check stderr for common Trivy errors if stdout is empty
        if (stderrData.toLowerCase().includes("image not found") || stderrData.toLowerCase().includes("cannot find image")) {
            errorMsg = "Image not found by Trivy";
        } else if (stderrData.toLowerCase().includes("failed to initialize a scanner") || stderrData.toLowerCase().includes("vulnerability database error")) {
            errorMsg = "Trivy scanner initialization or database error";
        }
        
        resolve({
          success: false,
          error: errorMsg,
          details: stderrData,
          trivyExitCode: code,
          rawOutput: stdoutData
        });
      }
    });
  });
}

module.exports = {
  scanImage,
};
