const express = require('express');
const router = express.Router();
const { db } = require('../config/drizzle-client');
const { tracked_images, image_vulnerabilities } = require('../schema/schema');
const { eq, and, isNull, desc, sql } = require('drizzle-orm');
const { processDiscoveredImage } = require('../services/k8sImageMonitorService');

/**
 * @route GET /api/vulnerabilities/scan/:imageName
 * @description Get vulnerability scan results for a specific image
 * @param {string} imageName - The name of the image (can include tag)
 * @returns {Object} Vulnerability data for the image
 */
router.get('/scan/:imageName', async (req, res) => {
    try {
        const { imageName } = req.params;

        if (!imageName) {
            return res.status(400).json({ message: 'Image name is required' });
        }

        // console.log(`Fetching vulnerabilities for image: ${imageName}`);

        // Parse image name and tag
        let name = imageName;
        let tag = 'latest';

        // Check if image name contains a tag
        if (imageName.includes(':')) {
            const parts = imageName.split(':');
            name = parts[0];
            tag = parts[1];
        }

        // console.log(`Parsed image name: ${name}, tag: ${tag}`);

        // Find the tracked image in the database
        const trackedImage = await db.select()
            .from(tracked_images)
            .where(and(
                eq(tracked_images.image_name, name),
                eq(tracked_images.image_tag, tag)
            ))
            .limit(1)
            .execute();

        if (!trackedImage || trackedImage.length === 0) {
            // Image not found in database - trigger an on-demand scan
            console.log(`Image ${imageName} not found in database. Triggering on-demand scan.`);

            try {
                // Create a discovery object in the format expected by processDiscoveredImage
                const discoveryObject = {
                    name: name,
                    tag: tag,
                    digest: null,
                    podName: 'on-demand-scan',
                    containerName: 'on-demand-scan',
                    namespace: 'on-demand' // Add namespace information
                };

                // Process the image (this will add it to the database and queue it for scanning)
                await processDiscoveredImage(discoveryObject);

                // Get the newly added image to get its ID
                const newImage = await db.select()
                    .from(tracked_images)
                    .where(and(
                        eq(tracked_images.image_name, name),
                        eq(tracked_images.image_tag, tag)
                    ))
                    .orderBy(desc(tracked_images.id))
                    .limit(1)
                    .execute();

                if (newImage && newImage.length > 0) {
                    // Import the scanImage function directly here to avoid circular dependencies
                    const { scanImage } = require('../services/trivyScanService');

                    // Trigger an immediate scan
                    console.log(`Immediately scanning newly added image ${name}:${tag}`);

                    // Update status to scanning
                    await db.update(tracked_images)
                        .set({
                            scan_status: 'scanning',
                            updated_at: new Date()
                        })
                        .where(eq(tracked_images.id, newImage[0].id))
                        .execute();

                    // Start the scan in the background without waiting for it to complete
                    // Pass the actual image name and tag instead of just the ID
                    scanImage(name, tag, newImage[0].image_digest).catch(err => {
                        console.error(`Background scan for ${name}:${tag} failed:`, err);
                    });
                }

                // Return a response indicating the scan has been triggered
                return res.status(202).json({
                    message: `Image ${imageName} has been queued for scanning. Please check back in a few minutes.`,
                    imageDetails: { name, tag },
                    status: 'scanning'
                });
            } catch (scanError) {
                console.error(`Error triggering scan for ${imageName}:`, scanError);
                return res.status(500).json({
                    message: `Error triggering scan for ${imageName}`,
                    imageDetails: { name, tag },
                    error: scanError.message
                });
            }
        }

        const image = trackedImage[0];

        // Get vulnerabilities for the image
        const vulnerabilities = await db.select()
            .from(image_vulnerabilities)
            .where(eq(image_vulnerabilities.tracked_image_id, image.id))
            .execute();

        // Prepare response data
        const response = {
            imageDetails: {
                id: image.id,
                name: image.image_name,
                tag: image.image_tag,
                digest: image.image_digest,
                lastScanned: image.last_scanned_at,
                scanStatus: image.scan_status
            },
            vulnerabilities: vulnerabilities.map(v => ({
                id: v.id,
                cveId: v.vulnerability_cve_id,
                packageName: v.pkgName,
                installedVersion: v.installedVersion,
                fixedVersion: v.fixedVersion,
                severity: v.severity,
                title: v.title,
                description: v.description,
                datasource: v.datasource
            })),
            summary: {
                total: vulnerabilities.length,
                severityCounts: vulnerabilities.reduce((counts, vuln) => {
                    const severity = vuln.severity || 'UNKNOWN';
                    counts[severity] = (counts[severity] || 0) + 1;
                    return counts;
                }, {})
            }
        };

        return res.json(response);
    } catch (error) {
        console.error('Error fetching vulnerability data:', error);
        return res.status(500).json({ message: 'Error fetching vulnerability data', error: error.message });
    }
});

/**
 * @route GET /api/vulnerabilities/images
 * @description Get a list of all tracked images with their scan status
 * @returns {Array} List of tracked images
 */
router.get('/images', async (req, res) => {
    try {
        const images = await db.select()
            .from(tracked_images)
            .orderBy(desc(tracked_images.last_seen_at))
            .execute();

        return res.json(images.map(image => ({
            id: image.id,
            name: image.image_name,
            tag: image.image_tag,
            digest: image.image_digest,
            lastScanned: image.last_scanned_at,
            scanStatus: image.scan_status,
            lastSeen: image.last_seen_at
        })));
    } catch (error) {
        console.error('Error fetching tracked images:', error);
        return res.status(500).json({ message: 'Error fetching tracked images', error: error.message });
    }
});

module.exports = router;
