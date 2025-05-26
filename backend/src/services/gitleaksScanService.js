const { spawn } = require('child_process');

// Define a timeout for the scan process (e.g., 15 minutes)
const SCAN_TIMEOUT_MS = 15 * 60 * 1000;

/**
 * Scans a Git repository using Gitleaks.
 * @param {string} repoUrl - The URL of the repository to scan.
 * @param {string} githubToken - GitHub PAT for accessing the repository.
 * @param {string | null} [branchName=null] - Optional specific branch to scan.
 * @returns {Promise<{success: boolean, findings: Array<Object> | null, error: string | null, rawOutput: string | null, gitleaksExitCode: number | null}>}
 *          A promise that resolves with the scan result.
 *          `success: true` means Gitleaks ran and produced parsable JSON output (even if 0 findings).
 *          `success: false` indicates an issue with Gitleaks execution, timeout, or unparsable output.
 */
async function scanRepository(repoUrl, githubToken, branchName = null) {
  const logSuffix = branchName ? `#${branchName}` : '';
  const logPrefix = `[GitleaksScanService Scan: ${repoUrl}${logSuffix}]`;
  console.log(`${logPrefix} Starting scan.`);

  const gitleaksArgs = [
    'git', // Changed from 'detect'
    repoUrl, // Target is now repoUrl directly for 'git' command
    '--report-format', 'json',
    '--verbose' // For detailed output, including errors in JSON if possible
  ];

  // Only add --github-pat if a token is provided
  if (githubToken) {
    gitleaksArgs.push('--github-pat', githubToken);
  }

  // If branchName is provided, add --log-opts for branch-specific scanning
  if (branchName) {
    gitleaksArgs.push('--log-opts', branchName);
  }

  console.log(`${logPrefix} Executing Gitleaks command: gitleaks ${gitleaksArgs.join(' ')}`);

  return new Promise((resolve) => {
    let stdoutData = '';
    let stderrData = '';
    let scanTimeoutId;

    const gitleaksProcess = spawn('gitleaks', gitleaksArgs);

    scanTimeoutId = setTimeout(() => {
      console.error(`${logPrefix} Scan timed out after ${SCAN_TIMEOUT_MS / 1000} seconds.`);
      gitleaksProcess.kill('SIGKILL'); // Forcefully terminate the process
      resolve({
        success: false,
        findings: null,
        error: 'Scan timed out',
        rawOutput: stdoutData.trim() || null,
        gitleaksExitCode: -1, // Indicate timeout
      });
    }, SCAN_TIMEOUT_MS);

    gitleaksProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    gitleaksProcess.stderr.on('data', (data) => {
      const chunk = data.toString();
      // Gitleaks uses stderr for progress and non-finding related errors
      console.log(`${logPrefix} stderr chunk: ${chunk}`);
      stderrData += chunk;
    });

    gitleaksProcess.on('error', (spawnError) => {
      clearTimeout(scanTimeoutId);
      console.error(`${logPrefix} Failed to start Gitleaks process: ${spawnError.message}`, spawnError);
      resolve({
        success: false,
        findings: null,
        error: `Failed to start Gitleaks process: ${spawnError.message}`,
        rawOutput: null,
        gitleaksExitCode: -1, // Indicate spawn error
      });
    });

    gitleaksProcess.on('close', (code) => {
      clearTimeout(scanTimeoutId);
      console.log(`${logPrefix} Gitleaks process exited with code ${code}.`);
      console.log(`${logPrefix} Total stdout length: ${stdoutData.length}`);
      console.log(`${logPrefix} Total stderr length: ${stderrData.length}`);

      const trimmedStdout = stdoutData.trim();

      if (trimmedStdout) {
        try {
          const parsedJson = JSON.parse(trimmedStdout);
          // Gitleaks returns an array of findings.
          // If code is non-zero but we have JSON, it might be an error report from Gitleaks itself.
          // Or, it could be that gitleaks found secrets and exited with a specific code (e.g. 1 or 2).
          // We consider it a "successful" scan if we get parsable JSON.
          let currentError = null;
          if (code !== 0 && stderrData.trim()) {
            // If gitleaks exits non-zero and there's stderr, capture it.
            console.warn(`${logPrefix} Gitleaks exited with code ${code}. Stderr: ${stderrData.trim()}`);
            // We don't set `success: false` here as per instructions, as long as JSON is parsable.
            // The `error` field can convey warnings from stderr if necessary, or this can be logged/handled by caller.
          }
          
          resolve({
            success: true,
            findings: parsedJson, // This is expected to be an array
            error: currentError, 
            rawOutput: trimmedStdout,
            gitleaksExitCode: code,
          });
        } catch (parseError) {
          const outputSnippet = trimmedStdout.substring(0, 500);
          console.error(`${logPrefix} Error parsing Gitleaks JSON output: ${parseError.message}. Output snippet: "${outputSnippet}"`, parseError);
          resolve({
            success: false,
            findings: null,
            error: 'Failed to parse Gitleaks JSON output.',
            rawOutput: trimmedStdout,
            gitleaksExitCode: code,
          });
        }
      } else {
        // No stdout data, or only whitespace
        let errorMsg = `Gitleaks produced no parsable output (exit code ${code}).`;
        if (stderrData.trim()) {
            errorMsg += ` Stderr: ${stderrData.trim()}`;
        }
        console.warn(`${logPrefix} ${errorMsg}`);
        resolve({
          success: false,
          findings: null,
          error: errorMsg,
          rawOutput: null,
          gitleaksExitCode: code,
        });
      }
    });
  });
}

module.exports = {
  scanRepository,
};
