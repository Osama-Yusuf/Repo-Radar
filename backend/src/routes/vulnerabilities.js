const express = require('express');
const router = express.Router();
const { db } = require('../config/drizzle-client');
const { tracked_images, image_vulnerabilities } = require('../schema/schema');
const { eq, and, isNull, desc, sql } = require('drizzle-orm');

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

        console.log(`Fetching vulnerabilities for image: ${imageName}`);

        // Parse image name and tag
        let name = imageName;
        let tag = 'latest';

        // Check if image name contains a tag
        if (imageName.includes(':')) {
            const parts = imageName.split(':');
            name = parts[0];
            tag = parts[1];
        }

        console.log(`Parsed image name: ${name}, tag: ${tag}`);

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
            return res.status(404).json({
                message: `Image ${imageName} not found in database`,
                imageDetails: { name, tag }
            });
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
            vulnerabilities: vulnerabilities.map(vuln => ({
                id: vuln.id,
                cveId: vuln.vulnerability_cve_id,
                packageName: vuln.pkgName,
                installedVersion: vuln.installedVersion,
                fixedVersion: vuln.fixedVersion,
                severity: vuln.severity,
                title: vuln.title,
                description: vuln.description,
                datasource: vuln.datasource
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
        console.error('Error fetching vulnerabilities:', error);
        return res.status(500).json({ message: 'Error fetching vulnerabilities', error: error.message });
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
