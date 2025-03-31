import Replicate from 'replicate';
import sharp from 'sharp';
import { PassThrough } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// Configuration
const config = {
    wheelPrompt: 'wheel',
    carPrompt: 'car',  // Keep car prompt for potential background removal.
    rimBrightnessThreshold: 30,
    modelId: 'tmappdev/lang-segment-anything:891411c38a6ed2d44c004b7b9e44217df7a5b07848f29ddefd2e28bc7cbf93bc',
    maxImageSize: 4096,
    supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
    blurSigma: 2.0,  // Gaussian blur
    unsharpRadius: 1,
    unsharpSigma: 0.5,
    unsharpAmount: 0.5,
};

// Utility functions
function isValidHexColor(color) {
    return /^#[0-9A-F]{6}$/i.test(color);
}

function isValidRGBString(color) {
    const parts = color.split(',').map(Number);
    return parts.length === 3 && parts.every(p => !isNaN(p) && p >= 0 && p <= 255);
}

function parseColor(color) {
    if (isValidHexColor(color)) {
        return {
            r: parseInt(color.slice(1, 3), 16),
            g: parseInt(color.slice(3, 5), 16),
            b: parseInt(color.slice(5, 7), 16)
        };
    }
    if (isValidRGBString(color)) {
        return {
            r: parseInt(color.split(',')[0], 10),
            g: parseInt(color.split(',')[1], 10),
            b: parseInt(color.split(',')[2], 10)
        }
    }
    throw new Error('Invalid color format. Use either hex (#RRGGBB) or RGB (r,g,b) format.');
}

function errorResponse(message, status = 400) {
    return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}

async function validateImage(imageBuffer) {
    try {
        const metadata = await sharp(imageBuffer).metadata();

        const formatMimeMap = {
            'jpeg': 'image/jpeg',
            'jpg': 'image/jpeg',
            'png': 'image/png',
            'webp': 'image/webp'
        };

        const detectedFormat = metadata.format ? formatMimeMap[metadata.format.toLowerCase()] : null;
        console.log(`Image format detected: ${metadata.format}, mapped to MIME: ${detectedFormat}`);

        if (!detectedFormat || !config.supportedFormats.includes(detectedFormat)) {
            throw new Error(`Unsupported image format: ${metadata.format}. Supported formats: ${config.supportedFormats.join(', ')}`);
        }

        if (metadata.width > config.maxImageSize || metadata.height > config.maxImageSize) {
            throw new Error(`Image dimensions too large. Maximum allowed: ${config.maxImageSize}x${config.maxImageSize}`);
        }
        return metadata;

    } catch (error) {
        console.error('Error validating image:', error);
        throw error;
    }
}

async function convertToJpg(imageBuffer) {
    try {
        const metadata = await validateImage(imageBuffer);
        console.log(`Converting image from ${metadata.format} to JPG format...`);
        const buffer = await sharp(imageBuffer)
            .flatten({ background: { r: 255, g: 255, b: 255 } }) // White background for JPG
            .jpeg({ quality: 90 })
            .toBuffer();
        console.log(`Conversion complete. Output size: ${buffer.length} bytes`);
        return buffer;
    } catch (error) {
        console.error('Error converting image to JPG:', error);
        throw error; // Re-throw to be caught by the caller
    }
}

function getBase64(imageBuffer) {
    return `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
}

async function processStream(stream) {
    const reader = stream.getReader();
    const chunks = [];
    console.log("Processing stream...");
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
    }
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combinedData = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
        combinedData.set(chunk, offset);
        offset += chunk.length;
    }
    console.log("Stream processing complete.");
    return Buffer.from(combinedData);
}

async function applyMask(imageBuffer, maskBuffer) {
    const extractedMask = await sharp(maskBuffer)
        .extractChannel(0)
        .toBuffer();

    return await sharp(imageBuffer)
        .ensureAlpha()  // Make sure the image has an alpha channel
        .joinChannel(extractedMask)
        .png()
        .toBuffer();
}

async function extractWheels(imageBuffer, maskBuffer) {
    try {
        console.log("Extracting wheels using mask...");
        const extractedMask = await sharp(maskBuffer)
            .extractChannel(0)
            .toBuffer();
        const resultBuffer = await sharp(imageBuffer)
            .joinChannel(extractedMask)
            .toBuffer();
        console.log(`Wheel extraction complete.`);
        return resultBuffer;
    } catch (error) {
        console.error('Error extracting wheels:', error);
        throw error;
    }
}

async function connectedComponentsLabeling(imageBuffer, threshold) {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const width = metadata.width;
    const height = metadata.height;

    const grayscaleBuffer = await image
        .grayscale()
        .raw()
        .toBuffer();

    let labels = Array(width * height).fill(0);
    let nextLabel = 1;
    let equivalencies = {};

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = y * width + x;
            if (grayscaleBuffer[index] >= threshold) {
                const neighbors = [];
                if (x > 0) neighbors.push(labels[index - 1]);
                if (y > 0) neighbors.push(labels[index - width]);

                const neighborLabels = neighbors.filter(label => label !== 0);

                if (neighborLabels.length === 0) {
                    labels[index] = nextLabel;
                    nextLabel++;
                } else {
                    const minLabel = Math.min(...neighborLabels);
                    labels[index] = minLabel;
                    for (const label of neighborLabels) {
                        if (label !== minLabel) {
                            equivalencies[label] = minLabel;
                        }
                    }
                }
            }
        }
    }

    function find(label) {
        if (equivalencies[label] === undefined) {
            return label;
        }
        return equivalencies[label] = find(equivalencies[label]);
    }

    const resolvedLabels = [];
    const regionSizes = {};

    for (let i = 0; i < labels.length; i++) {
        const originalLabel = labels[i];
        if (originalLabel === 0) {
            resolvedLabels.push(0);
        } else {
            const resolvedLabel = find(originalLabel);
            resolvedLabels.push(resolvedLabel);
            regionSizes[resolvedLabel] = (regionSizes[resolvedLabel] || 0) + 1;
        }
    }

    return { resolvedLabels, regionSizes, width, height };
}

async function extractBrightParts(wheelImageBuffer, initialThreshold, jpgConvertedImageBuffer) {
    try {
        console.log(`Processing with multiple thresholds (30, 50, 80)...`);

        // 1. Get image dimensions and wheel pixel count (keep your existing code)
        const jpgMetadata = await sharp(jpgConvertedImageBuffer).metadata();
        let wheelPixelsCount = 0;
        let wheelWidth, wheelHeight;
        
        try {
            const wheelMetadata = await sharp(wheelImageBuffer).metadata();
            wheelWidth = wheelMetadata.width;
            wheelHeight = wheelMetadata.height;
            
            const wheelPixels = await sharp(wheelImageBuffer)
                .grayscale()
                .raw()
                .toBuffer();
            
            for (let i = 0; i < wheelPixels.length; i++) {
                if (wheelPixels[i] > 10) wheelPixelsCount++;
            }
            console.log(`Wheel Mask Dimensions: ${wheelWidth}x${wheelHeight}, Actual Wheel Pixels: ${wheelPixelsCount}`);
        } catch (error) {
            console.error('Error calculating wheel mask area:', error);
            throw new Error("Could not determine wheel mask area. Aborting bright part extraction.");
        }
        
        // 2. Process with multiple thresholds (20-100, step 5)
        const thresholds = [];
        for (let t = 20; t <= 100; t += 5) {
            thresholds.push(t);
        }
        console.log(`Processing with thresholds: ${thresholds.join(', ')}...`);
        const results = {};
        
        for (const threshold of thresholds) {
            console.log(`Processing with threshold: ${threshold}`);
            
            const brightnessMaskBuffer = await sharp(wheelImageBuffer)
                .flatten({ background: { r: 0, g: 0, b: 0 } })
                .grayscale()
                .threshold(threshold)
                .png() // Use PNG for better quality mask before labeling
                .toBuffer();
                
            const { resolvedLabels, regionSizes, width, height } = await connectedComponentsLabeling(brightnessMaskBuffer, threshold);

            const sortedRegions = Object.entries(regionSizes)
                .sort(([, sizeA], [, sizeB]) => sizeB - sizeA)
                .map(([label]) => parseInt(label));

            const keepLabels = new Set(sortedRegions.slice(0, 2));
            const rimArea = Array.from(keepLabels).reduce((sum, label) => sum + (regionSizes[label] || 0), 0);

            const rimPercentage = (rimArea / wheelPixelsCount) * 100;
            console.log(`Threshold ${threshold}: Rim area ${rimArea} pixels (${rimPercentage.toFixed(2)}% of wheel)`);

            // Create mask
            const newMaskBuffer = Buffer.alloc(width * height);
            for (let i = 0; i < resolvedLabels.length; i++) {
                newMaskBuffer[i] = keepLabels.has(resolvedLabels[i]) ? 255 : 0;
            }

            const filteredMaskBuffer = await sharp(newMaskBuffer, {
                raw: { width, height, channels: 1 }
            })
                .png()
                .toBuffer();

            const extractedMask = await sharp(filteredMaskBuffer)
                .grayscale()
                .extractChannel(0)
                .toBuffer();
                
            // Create rim-only image for this threshold
            const rimsBuffer = await sharp(jpgConvertedImageBuffer)
                .joinChannel(extractedMask)
                .toBuffer();
                
            // Store mask for this threshold
            const pngMaskBuffer = await sharp(extractedMask)
                .png()
                .toBuffer();
                
            results[threshold] = {
                rimMask: `data:image/png;base64,${pngMaskBuffer.toString('base64')}`,
                rimPercentage
            };
        }
        
        // Default mask (same as original functionality)
        const defaultThreshold = 50;
        const defaultMask = await sharp(jpgConvertedImageBuffer)
            .joinChannel(Buffer.from(results[defaultThreshold].rimMask.split(',')[1], 'base64'))
            .toBuffer();
            
        return {
            defaultBuffer: defaultMask,
            allMasks: results
        };
    } catch (error) {
        console.error('Error extracting bright parts:', error);
        throw error;
    }
}

// MODIFIED FUNCTION:  Creates transparent colored rims.
async function createTransparentColoredRims(rimsOnlyBuffer, color) {
    try {
        console.log(`Creating transparent colored rims with RGB(${color.r},${color.g},${color.b})...`);

        // 1. Extract the alpha channel from rimsOnlyBuffer (this is our mask).
        const rimMask = await sharp(rimsOnlyBuffer)
            .extractChannel(0)
            .toBuffer();

        // 2. Tint the rimsOnlyBuffer (which is still black and white).
        const coloredRims = await sharp(rimsOnlyBuffer)
            .tint(color)
            .toBuffer();

        // 3. Use the rim mask as the alpha channel for the colored rims.
        const transparentColoredRims = await sharp(coloredRims)
            .ensureAlpha()
            .joinChannel(rimMask)
            .png() //ensure output
            .toBuffer();
        console.log("Transparent colored rims created.");
        return transparentColoredRims;

    } catch (error) {
        console.error('Error creating transparent colored rims:', error);
        throw error;
    }
}

// API endpoint
export async function POST(request) {
    try {
        const formData = await request.formData();
        const imageFile = formData.get('image');
        // Remove color parameter requirement
        const removeBackgroundParam = formData.get('removeBackground');

        const shouldRemoveBackground = removeBackgroundParam === 'true';
        console.log(`Remove background: ${shouldRemoveBackground}`);

        if (!imageFile) {
            return errorResponse('No image uploaded.');
        }

        const imageBuffer = await imageFile.arrayBuffer().then(Buffer.from);
        const jpgImageBuffer = await convertToJpg(imageBuffer);

        const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
        if (!process.env.REPLICATE_API_TOKEN) {
            return errorResponse('Replicate API token not configured', 500);
        }

        // --- Car Segmentation (Conditional) ---
        let carOnlyBuffer = null;
        if (shouldRemoveBackground) {
            console.log(`Running car segmentation on original image with prompt "${config.carPrompt}"...`);
            const carInput = { image: getBase64(jpgImageBuffer), text_prompt: config.carPrompt };
            const carOutput = await replicate.run(config.modelId, { input: carInput });

            if (!carOutput.getReader || typeof carOutput.getReader !== 'function') {
                return errorResponse('Unexpected response type from API (car segmentation)', 500);
            }

            // Process the car segmentation stream to get the mask
            const carMaskBuffer = await processStream(carOutput);
            carOnlyBuffer = await applyMask(jpgImageBuffer, carMaskBuffer);
        }

        // --- Wheel and Rim Processing (Always) ---
        console.log(`Running wheel segmentation with prompt "${config.wheelPrompt}"...`);
        const wheelInput = { image: getBase64(jpgImageBuffer), text_prompt: config.wheelPrompt };
        const wheelOutput = await replicate.run(config.modelId, { input: wheelInput });

        if (!wheelOutput.getReader || typeof wheelOutput.getReader !== 'function') {
            return errorResponse('Unexpected response type from API (wheel segmentation)', 500);
        }

        const wheelMaskBuffer = await processStream(wheelOutput);
        const wheelsOnlyBuffer = await extractWheels(jpgImageBuffer, wheelMaskBuffer);
        
        // Get multiple threshold masks
        const { defaultBuffer, allMasks } = await extractBrightParts(
            wheelsOnlyBuffer, 
            config.rimBrightnessThreshold, 
            jpgImageBuffer
        );

        // Ensure consistent image formats for the frontend
        // Original image stays as JPEG
        const originalImageBase64 = `data:image/jpeg;base64,${jpgImageBuffer.toString('base64')}`;

        // Default mask (threshold 50)
        const defaultMaskBuffer = await sharp(defaultBuffer)
            .extractChannel(0)
            .toFormat('png')
            .toBuffer();
        const defaultMaskBase64 = `data:image/png;base64,${defaultMaskBuffer.toString('base64')}`;
        
        // Car image should be PNG with transparency
        const carImageBase64 = carOnlyBuffer ? 
            `data:image/png;base64,${carOnlyBuffer.toString('base64')}` : null;

        // Return response with all needed data for frontend processing
        return new Response(JSON.stringify({
            originalImage: originalImageBase64,
            rimMask: defaultMaskBase64,           // Default mask (for backward compatibility)
            rimMasks: allMasks,                   // All threshold masks for frontend selection
            defaultThreshold: 50,                 // Default threshold used
            carImage: carImageBase64,
            shouldRemoveBackground: shouldRemoveBackground,
            // Add this for compatibility with existing frontend
            resultImage: carOnlyBuffer ? 
                `data:image/png;base64,${carOnlyBuffer.toString('base64')}` : 
                originalImageBase64
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error in processing:', error);
        return errorResponse(error.message || 'Internal Server Error', 500);
    }
}