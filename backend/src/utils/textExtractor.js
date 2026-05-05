import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
const officeparser = require('officeparser');

import axios from 'axios';

/**
 * Extracts text from a buffer based on file extension.
 * @param {Buffer} buffer - The file buffer.
 * @param {string} fileName - The name of the file (to determine type).
 * @returns {Promise<string>} - The extracted text.
 */
export async function extractTextFromBuffer(buffer, fileName) {
    if (!buffer) return '';
    const ext = String(fileName || '').split('.').pop().toLowerCase();
    
    try {
        if (ext === 'pdf') {
            const data = await pdf(buffer);
            return data.text || '';
        } else if (['pptx', 'ppt', 'docx', 'doc', 'xlsx', 'xls'].includes(ext)) {
            // officeparser handles these formats
            return new Promise((resolve, reject) => {
                officeparser.parseBinary(buffer, (data, err) => {
                    if (err) return reject(err);
                    resolve(data || '');
                });
            });
        }
    } catch (error) {
        console.error(`[TextExtractor] Error extracting from ${fileName}:`, error.message);
    }
    
    return '';
}

/**
 * Downloads a file from a URL and extracts its text.
 * @param {string} url - The public URL of the file.
 * @returns {Promise<string>} - The extracted text.
 */
export async function extractTextFromUrl(url) {
    if (!url) return '';
    
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);
        const fileName = url.split('/').pop() || 'document.pdf';
        return await extractTextFromBuffer(buffer, fileName);
    } catch (error) {
        console.error(`[TextExtractor] Error fetching from URL ${url}:`, error.message);
        return '';
    }
}
