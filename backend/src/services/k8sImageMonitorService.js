const { KubeConfig, CoreV1Api } = require('@kubernetes/client-node');
const { getK8sClient, getTargetNamespace } = require('../config/k8s-client');
const { db } = require('../config/drizzle-client');
const { tracked_images, image_vulnerabilities } = require('../schema/schema'); // Added image_vulnerabilities
const { eq, and, isNull, desc, sql } = require('drizzle-orm');
const { scanImage } = require('./trivyScanService'); // Import scanImage

const STALE_SCAN_THRESHOLD_DAYS = 7;

let k8sClient;
let targetNamespace;

// Initialize Kubernetes client and namespace
try {
  k8sClient = getK8sClient();
  targetNamespace = getTargetNamespace();
  console.log(`Kubernetes Image Monitor Service initialized for namespace: "${targetNamespace}"`);
} catch (error) {
  console.error('Failed to initialize Kubernetes client for image monitoring:', error);
  // k8sClient will be undefined, and monitoring functions should handle this.
}

/**
 * Parses an image string (e.g., "nginx:1.21.0" or "myrepo/myapp:v1.2.3-abcdef" or "nginx")
 * into its name and tag components.
 * @param {string} imageString - The image string.
 * @returns {{ name: string, tag: string | null }}
 */
function parseImageNameAndTag(imageString) {
  if (!imageString) return { name: 'unknown', tag: null };

  const parts = imageString.split('/');
  const imageNameWithTag = parts[parts.length - 1]; // Get the last part (e.g., "myapp:v1.2.3" or "nginx")

  const tagSeparatorIndex = imageNameWithTag.lastIndexOf(':');
  if (tagSeparatorIndex > 0 && tagSeparatorIndex < imageNameWithTag.length - 1 && !imageNameWithTag.substring(tagSeparatorIndex + 1).includes('/')) {
    // Ensure ':' is not part of a port number if the image name is from a private repo with a port
    // e.g. myrepo.com:5000/image:tag - lastIndexOf(':') would be in the repo part for image:tag
    // A simple check: if there's a '/' after the last ':', it's likely part of the repo name or a port.
    // A more robust solution might involve regex for image name structure.
    const name = imageString; // Full path as name
    const tag = imageNameWithTag.substring(tagSeparatorIndex + 1);
    // To get just the image base name, not the full path:
    // const baseName = imageNameWithTag.substring(0, tagSeparatorIndex);
    // For now, using full path as name for uniqueness from different repos
    return { name: name.substring(0, name.lastIndexOf(':')), tag };
  }
  return { name: imageString, tag: 'latest' }; // Default to 'latest' if no tag specified or format is unusual
}


/**
 * Parses an imageID string (e.g., "docker-pullable://ubuntu@sha256:digest" or "docker://image-id@sha256:digest")
 * to extract the digest.
 * @param {string} imageID - The imageID string from container status.
 * @returns {string | null} The digest (e.g., "sha256:digest") or null if not found.
 */
functionparseImageDigest(imageID) {
  if (!imageID) return null;
  const atSymbolIndex = imageID.lastIndexOf('@');
  if (atSymbolIndex > 0 && imageID.substring(atSymbolIndex + 1).startsWith('sha256:')) {
    return imageID.substring(atSymbolIndex + 1);
  }
  // Sometimes imageID might just be the digest itself if not pullable, or other formats
  if (imageID.startsWith('sha256:')) {
    return imageID;
  }
  return null;
}

/**
 * Fetches details of running images from containers in the target Kubernetes namespace.
 * @returns {Promise<Array<{name: string, tag: string | null, digest: string | null, podName: string, containerName: string}>>} A list of unique image objects.
 */
async function getRunningImages() {
  if (!k8sClient) {
    console.error('Kubernetes client not initialized. Cannot fetch running images.');
    return [];
  }

  console.log(`Fetching running images from namespace: "${targetNamespace}"...`);
  const uniqueImages = new Map(); // Using a Map to store unique images based on a composite key

  try {
    const res = await k8sClient.listNamespacedPod(targetNamespace);
    const pods = res.body.items;
    console.log(`Found ${pods.length} pods in namespace "${targetNamespace}".`);

    for (const pod of pods) {
      const podName = pod.metadata.name;

      const processContainer = (container, containerStatus) => {
        if (!container || !container.image) return;

        const imageNameAndTag = parseImageNameAndTag(container.image);
        let digest = null;
        let resolvedImageName = container.image; // Fallback

        if (containerStatus && containerStatus.imageID) {
          digest = parseImageDigest(containerStatus.imageID);
          resolvedImageName = containerStatus.image || resolvedImageName; // Prefer status.image if available
           // Re-parse name and tag from resolved image name if it's different and more specific
          if (containerStatus.image && containerStatus.image !== container.image) {
            const resolvedImageNameAndTag = parseImageNameAndTag(containerStatus.image);
            imageNameAndTag.name = resolvedImageNameAndTag.name;
            imageNameAndTag.tag = resolvedImageNameAndTag.tag;
          }
        }
        
        const imageKey = `${imageNameAndTag.name}:${imageNameAndTag.tag}@${digest || 'nodigest'}`;
        if (!uniqueImages.has(imageKey)) {
          uniqueImages.set(imageKey, {
            name: imageNameAndTag.name,
            tag: imageNameAndTag.tag,
            digest: digest,
            podName: podName,
            containerName: container.name,
            sourceImageString: container.image, // Original string from spec
            resolvedImageString: resolvedImageName // Resolved image string from status
          });
        }
      };

      // Process standard containers
      (pod.spec.containers || []).forEach(container => {
        const status = (pod.status.containerStatuses || []).find(cs => cs.name === container.name);
        processContainer(container, status);
      });

      // Process init containers
      (pod.spec.initContainers || []).forEach(container => {
        const status = (pod.status.initContainerStatuses || []).find(cs => cs.name === container.name);
        processContainer(container, status);
      });
      
      // Process ephemeral containers (if relevant and exist)
      (pod.spec.ephemeralContainers || []).forEach(container => {
         // Ephemeral containers might not have statuses in the same way or might not be relevant for vulnerability scanning
         // For now, let's assume they might appear in containerStatuses if running or completed.
        const status = (pod.status.containerStatuses || []).find(cs => cs.name === container.name); // Check regular statuses
        processContainer(container, status);
      });
    }
  } catch (error) {
    console.error(`Error fetching or processing pods from namespace "${targetNamespace}":`, error.message, error.stack ? `\nStack: ${error.stack}` : '');
    // Rethrow or handle as per application's error handling strategy
    throw error; // Rethrowing to be caught by monitoringTick or calling function
  }

  const resultList = Array.from(uniqueImages.values());
  console.log(`Found ${resultList.length} unique images running in namespace "${targetNamespace}".`);
  return resultList;
}

/**
 * Starts a polling mechanism to periodically fetch and log running Kubernetes images.
 * @param {number} intervalMs - The interval in milliseconds for polling. Defaults to 60000ms (1 minute).
 */
function startMonitoring(intervalMs = 60000) {
  if (!k8sClient) {
    console.warn('Kubernetes client not initialized. Monitoring will not start.');
    return;
  }

  console.log(`Starting Kubernetes image monitoring for namespace "${targetNamespace}" with interval ${intervalMs}ms.`);
  
  const monitoringTick = async () => {
    console.log('Image monitoring tick started...');
    if (!k8sClient) {
      console.warn('Kubernetes client not available, skipping Kubernetes discovery part of monitoring tick.');
      // Allow scanPendingImages to run even if K8s client fails, as pending images might be from previous discovery
    } else {
      try {
        const discoveredImages = await getRunningImages();
        console.log(`Discovered ${discoveredImages.length} unique images in namespace "${targetNamespace}".`);

        for (const image of discoveredImages) {
          await processDiscoveredImage(image); // This marks images as 'pending' if new or needing rescan
        }
      } catch (error) {
        console.error('Error during Kubernetes image discovery part of monitoring tick:', error.message, error.stack ? `\nStack: ${error.stack}` : '');
      }
    }

    // Always try to scan pending images
    try {
      await scanPendingImages(); // This scans images marked 'pending' and updates results
    } catch (error) {
      console.error('Error during pending image scanning part of monitoring tick:', error.message, error.stack ? `\nStack: ${error.stack}` : '');
    }
    console.log('Image monitoring tick finished.');
  };

  // Initial call
  monitoringTick();

  setInterval(monitoringTick, intervalMs);
}


async function scanPendingImages() {
  const logPrefix = '[ScanPendingImages]';
  console.log(`${logPrefix} Starting scan for pending images.`);
  let pendingImagesToScan;
  try {
    pendingImagesToScan = await db.select()
      .from(tracked_images)
      .where(eq(tracked_images.scan_status, 'pending'))
      .orderBy(desc(tracked_images.updated_at)) // Process most recently marked as pending first
      .execute();
  } catch (dbError) {
    console.error(`${logPrefix} Error fetching pending images from DB:`, dbError);
    return; // Exit if we can't fetch images
  }

  if (pendingImagesToScan.length === 0) {
    console.log(`${logPrefix} No images currently pending scan.`);
    return;
  }

  console.log(`${logPrefix} Found ${pendingImagesToScan.length} images to scan.`);

  for (const pendingImage of pendingImagesToScan) {
    const imageLogPrefix = `[ImageScan ID: ${pendingImage.id} - ${pendingImage.image_name}:${pendingImage.image_tag}${pendingImage.image_digest ? '@'+pendingImage.image_digest.substring(0,10) : ''}]`;
    console.log(`${imageLogPrefix} Starting scan process.`);

    try {
      // 1. Update status to 'scanning'
      await db.update(tracked_images)
        .set({ scan_status: 'scanning', updated_at: new Date() })
        .where(eq(tracked_images.id, pendingImage.id))
        .execute();
      console.log(`${imageLogPrefix} Status updated to 'scanning'.`);

      // 2. Call scanImage
      const scanResult = await scanImage(pendingImage.image_name, pendingImage.image_tag, pendingImage.image_digest);

      let finalScanStatus = 'failed'; // Default to failed
      let rawOutputToStore = scanResult.rawOutput || scanResult.details || scanResult.error || null;
      
      if (scanResult.success) {
        finalScanStatus = 'success';
        rawOutputToStore = scanResult.data; // Store the parsed JSON

        console.log(`${imageLogPrefix} Scan successful. TrivyExitCode: ${scanResult.trivyExitCode}. Storing vulnerabilities.`);

        // 3. Clear Old Vulnerabilities
        await db.delete(image_vulnerabilities)
          .where(eq(image_vulnerabilities.tracked_image_id, pendingImage.id))
          .execute();
        console.log(`${imageLogPrefix} Old vulnerabilities cleared.`);
        
        // 4. Store New Vulnerabilities
        // Trivy JSON output can be an array of results (if multiple targets scanned, though we do one by one)
        // or a single object with a "Results" array, or directly a "Vulnerabilities" array.
        // The trivyScanService returns the parsed JSON directly as scanResult.data.
        // We assume scanResult.data is the top-level object/array from Trivy.
        let vulnerabilitiesToInsert = [];
        const results = Array.isArray(scanResult.data) ? scanResult.data : [scanResult.data]; // Handle if data is a single obj or array

        for (const result of results) {
            if (result && result.Vulnerabilities && Array.isArray(result.Vulnerabilities)) {
                result.Vulnerabilities.forEach(vuln => {
                    vulnerabilitiesToInsert.push({
                        tracked_image_id: pendingImage.id,
                        vulnerability_cve_id: vuln.VulnerabilityID,
                        pkgName: vuln.PkgName,
                        installedVersion: vuln.InstalledVersion,
                        fixedVersion: vuln.FixedVersion,
                        severity: vuln.Severity,
                        title: vuln.Title,
                        description: vuln.Description,
                        datasource: vuln.DataSource ? vuln.DataSource.Name : null, // Adjust based on actual Trivy output structure for datasource
                        created_at: new Date(),
                    });
                });
            } else if (result && Array.isArray(result.Vulnerabilities)) { // Some older Trivy versions might nest it differently
                 console.warn(`${imageLogPrefix} Found Vulnerabilities directly under a result item, processing.`);
                 // Similar processing as above
            }
        }
        
        if (vulnerabilitiesToInsert.length > 0) {
          await db.insert(image_vulnerabilities).values(vulnerabilitiesToInsert).execute();
          console.log(`${imageLogPrefix} ${vulnerabilitiesToInsert.length} new vulnerabilities stored.`);
        } else {
          console.log(`${imageLogPrefix} No vulnerabilities found or reported in scan result.`);
        }

      } else {
        // Scan failed or Trivy reported an issue
        // Example: 'Image not found by Trivy', 'Trivy scanner initialization or database error', 'Scan timed out'
        // These specific errors come from trivyScanService's error messages.
        if (scanResult.error && scanResult.error.toLowerCase().includes("image not found")) {
            finalScanStatus = 'image_not_found_in_registry';
        } else if (scanResult.error && scanResult.error.toLowerCase().includes("timeout")) {
            finalScanStatus = 'scan_timeout';
        } else {
            finalScanStatus = 'failed'; // Generic failure
        }
        console.error(`${imageLogPrefix} Scan failed. Error: ${scanResult.error}. Details: ${scanResult.details}`);
      }

      // 5. Update tracked_images record with final status
      await db.update(tracked_images)
        .set({
          scan_status: finalScanStatus,
          last_scanned_at: new Date(),
          raw_trivy_output: rawOutputToStore, // Stored as JSONB
          updated_at: new Date(),
        })
        .where(eq(tracked_images.id, pendingImage.id))
        .execute();
      console.log(`${imageLogPrefix} Final status updated to '${finalScanStatus}'. Scan process complete.`);

    } catch (error) {
      console.error(`${imageLogPrefix} Unhandled error during scan processing for image ID ${pendingImage.id}:`, error.message, error.stack ? `\nStack: ${error.stack}` : '');
      // Optionally, mark the image as 'failed' to prevent it from being stuck in 'scanning'
      try {
        await db.update(tracked_images)
          .set({ scan_status: 'failed', updated_at: new Date(), last_scanned_at: new Date() })
          .where(eq(tracked_images.id, pendingImage.id))
          .execute();
        console.error(`${imageLogPrefix} Marked image as 'failed' due to unhandled error in processing loop.`);
      } catch (dbUpdateError) {
        console.error(`${imageLogPrefix} Failed to mark image as 'failed' after unhandled error:`, dbUpdateError);
      }
    }
  } // end for loop
  console.log(`${logPrefix} Finished processing all pending images.`);
}


async function processDiscoveredImage(discoveredImage) {
  const { name, tag, digest } = discoveredImage;
  const logPrefix = `Image [${name}:${tag}${digest ? ('@' + digest.substring(0,15)) : ''}]:`;

  try {
    // Ensure logPrefix is defined at the start of the function for consistent use, even in error paths.
    // const logPrefix = `Image [${name}:${tag}${digest ? ('@' + digest.substring(0,15)) : ''}]:`; // Already defined

    let existingImageEntries = [];
    let queryDescription = "";

    // Prioritize query by name, tag, and digest if digest is available
    if (digest) {
      queryDescription = `by name, tag, and digest (${digest})`;
      existingImageEntries = await db.select()
        .from(tracked_images)
        .where(and(
          eq(tracked_images.image_name, name),
          eq(tracked_images.image_tag, tag),
          eq(tracked_images.image_digest, digest)
        ))
        .limit(1)
        .execute();
    }

    // If not found by full N/T/D, or if digest wasn't available, try by name and tag only.
    // This helps find records that might need their digest updated or were added without one.
    if (existingImageEntries.length === 0) {
      if (digest) {
         // This means we have a digest, but didn't find an exact match.
         // Look for name/tag where digest is NULL (potential update) or a different digest (also an update).
        queryDescription = `by name and tag (current digest: ${digest}, looking for existing with different or NULL digest)`;
      } else {
        queryDescription = `by name and tag (no current digest)`;
      }
      existingImageEntries = await db.select()
        .from(tracked_images)
        .where(and(
          eq(tracked_images.image_name, name),
          eq(tracked_images.image_tag, tag)
        ))
        // If we have a digest now, we might be updating an old record that had a different digest or no digest.
        // If we don't have a digest now, we prefer matching an existing record that also has no digest.
        // .orderBy(digest ? desc(tracked_images.image_digest) : asc(tracked_images.image_digest), desc(tracked_images.id)) // Complex: prefer non-null if current is non-null
        .orderBy(desc(tracked_images.id)) // Get the latest entry if multiple match by name/tag
        .limit(1)
        .execute();
    }
    
    const existingImageEntry = existingImageEntries[0];

    if (!existingImageEntry) {
      console.log(`${logPrefix} New image. Adding to database with scan_status 'pending'.`);
      await db.insert(tracked_images).values({
        image_name: name,
        image_tag: tag,
        image_digest: digest, // Will be null if not available
        scan_status: 'pending',
        last_seen_at: new Date(),
        // last_scanned_at will be set upon scan completion
        created_at: new Date(),
        updated_at: new Date(),
      }).execute();
    } else {
      console.log(`${logPrefix} Found existing entry in DB (ID: ${existingImageEntry.id}). Query: ${queryDescription}`);
      let needsRescan = false;
      let reasonForRescan = "";
      const updates = {
        last_seen_at: new Date(),
        updated_at: new Date(),
      };

      // Sub-Case 2a: Digest Mismatch or New Digest for an existing Name/Tag entry
      if (digest && existingImageEntry.image_digest !== digest) {
        updates.image_digest = digest;
        updates.scan_status = 'pending';
        // updates.raw_trivy_output = null; // Drizzle specific for JSONB null. Handled by scan service.
        updates.last_scanned_at = null; // Reset last_scanned_at for the new digest
        needsRescan = true;
        reasonForRescan = `new digest detected ('${digest.substring(0,15)}' vs old '${existingImageEntry.image_digest ? existingImageEntry.image_digest.substring(0,15) : 'NULL'}')`;
      } else if (!digest && existingImageEntry.image_digest) {
        // We saw it with a digest before, but now it appears without one (e.g. K8s API not returning digest yet).
        // This is less common. For now, we'll log. A rescan might not be needed unless it's stale.
        console.log(`${logPrefix} Image previously had digest '${existingImageEntry.image_digest.substring(0,15)}', now observed without one. Keeping existing digest for now.`);
      }


      // Sub-Case 2b: Scan Previously Failed or Stale (only if not already marked for rescan due to digest change)
      if (!needsRescan) {
        const failedOrNotFound = ['failed', 'image_not_found_in_registry'].includes(existingImageEntry.scan_status);
        let isStale = false;
        if (existingImageEntry.scan_status === 'success' && existingImageEntry.last_scanned_at) {
          const staleDate = new Date();
          staleDate.setDate(staleDate.getDate() - STALE_SCAN_THRESHOLD_DAYS);
          if (new Date(existingImageEntry.last_scanned_at) < staleDate) {
            isStale = true;
          }
        }

        if (failedOrNotFound) {
          updates.scan_status = 'pending';
          needsRescan = true;
          reasonForRescan = `previous scan status was '${existingImageEntry.scan_status}'`;
        } else if (isStale) {
          updates.scan_status = 'pending';
          needsRescan = true;
          reasonForRescan = `scan results are stale (last scanned on ${existingImageEntry.last_scanned_at})`;
        }
      }
      
      if (Object.keys(updates).length > 2) { // more than just last_seen_at and updated_at
         console.log(`${logPrefix} Updating DB entry. Changes: ${JSON.stringify(updates)}`);
         await db.update(tracked_images)
          .set(updates)
          .where(eq(tracked_images.id, existingImageEntry.id))
          .execute();
      } else {
         // Only last_seen_at and updated_at would be updated
         await db.update(tracked_images)
          .set({ last_seen_at: new Date(), updated_at: new Date() })
          .where(eq(tracked_images.id, existingImageEntry.id))
          .execute();
         console.log(`${logPrefix} Image known and up-to-date. Updated last_seen_at.`);
      }

      if (needsRescan) {
        console.log(`${logPrefix} Marked for scan. Reason: ${reasonForRescan}.`);
      }
    }
  } catch (error) {
    console.error(`${logPrefix} Error processing image and interacting with DB:`, error.message, error.stack ? `\nStack: ${error.stack}` : '');
  }
}

module.exports = {
  getRunningImages,
  startMonitoring,
  processDiscoveredImage, // Exporting for potential direct use or testing
  parseImageNameAndTag, 
  parseImageDigest 
};
