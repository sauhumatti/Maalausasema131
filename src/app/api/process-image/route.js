import Replicate from 'replicate';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// Configuration
const config = {
    wheelPrompt: 'wheel',
    carPrompt: 'car',
    rimBrightnessThreshold: 50,
    modelId: 'tmappdev/lang-segment-anything:891411c38a6ed2d44c004b7b9e44217df7a5b07848f29ddefd2e28bc7cbf93bc',
    maxImageSize: 4096,
    supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
    blurSigma: 2.0, // Gaussian blur sigma (adjust as needed) - Applied to extracted car
    unsharpRadius: 1,  // Optional unsharp mask (very gentle)
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

async function extractCar(imageBuffer, maskBuffer) {
    try {
        console.log("Extracting car using mask...");
        const extractedMask = await sharp(maskBuffer)
            .extractChannel(0)
            .toBuffer();

        //ensure the input image is rgba before joining the channels.
        const carOnlyBuffer = await sharp(imageBuffer)
            .ensureAlpha()
            .joinChannel(extractedMask)
            .png()
            .toBuffer(); //keep as png.
        console.log(`Car extraction complete.`);
        return carOnlyBuffer;

    } catch (error) {
        console.error('Error extracting car:', error);
        throw error;
    }
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

async function extractBrightParts(wheelImageBuffer, brightnessThreshold, jpgConvertedImageBuffer) {
    try {
        console.log(`Extracting bright parts with threshold ${brightnessThreshold}...`);

        const brightnessMaskBuffer = await sharp(wheelImageBuffer)
            .flatten({ background: { r: 0, g: 0, b: 0 } })
            .grayscale()
            .threshold(brightnessThreshold)
            .jpeg()
            .toBuffer();

        console.log(`Brightness mask created.`);

        const { resolvedLabels, regionSizes, width, height } = await connectedComponentsLabeling(brightnessMaskBuffer, brightnessThreshold);

        const sortedRegions = Object.entries(regionSizes)
            .sort(([, sizeA], [, sizeB]) => sizeB - sizeA)
            .map(([label]) => parseInt(label));

        const keepLabels = new Set(sortedRegions.slice(0, 2));

        const newMaskBuffer = Buffer.alloc(width * height);
        for (let i = 0; i < resolvedLabels.length; i++) {
            newMaskBuffer[i] = keepLabels.has(resolvedLabels[i]) ? 255 : 0;
        }

        const filteredMaskBuffer = await sharp(newMaskBuffer, {
            raw: {
                width: width,
                height: height,
                channels: 1
            }
        })
            .jpeg()
            .toBuffer();

        console.log(`Filtered brightness mask created.`);

        const extractedMask = await sharp(filteredMaskBuffer)
            .grayscale()
            .extractChannel(0)
            .toBuffer();

        const rimsOnlyBuffer = await sharp(jpgConvertedImageBuffer)
            .joinChannel(extractedMask)
            .toBuffer();

        console.log(`Rim extraction complete.`);
        return rimsOnlyBuffer;

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
        const color = formData.get('color');
        const removeBackgroundParam = formData.get('removeBackground');

        const shouldRemoveBackground = removeBackgroundParam === 'true';
        console.log(`Remove background: ${shouldRemoveBackground}`);

        if (!imageFile) {
            return errorResponse('No image uploaded.');
        }
        if (!color) {
            return errorResponse('Color parameter is required.');
        }

        let rimColor;
        try {
            rimColor = parseColor(color);
        } catch (error) {
            return errorResponse(error.message);
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

            // Extract the car using the mask
            carOnlyBuffer = await extractCar(jpgImageBuffer, carMaskBuffer);

            // --- Apply edge blur to the car image ---
            console.log("Applying edge blur to car cutout...");

            // Approach for applying edge blur and sharpening
            try {
                // 1. Extract the alpha channel
                const metadata = await sharp(carOnlyBuffer).metadata();
                console.log(`Image dimensions: ${metadata.width}x${metadata.height}`);

                // 2. Extract the alpha channel (transparency mask)
                const alphaChannel = await sharp(carOnlyBuffer)
                    .extractChannel(3) // Alpha channel
                    .toBuffer();

                // 3. Create a smoothed version of the alpha channel
                const smoothedAlpha = await sharp(alphaChannel)
                    .blur(config.blurSigma)
                    .toBuffer();

                // 4. Extract RGB channels from the car image
                const rgbChannels = await sharp(carOnlyBuffer)
                    .removeAlpha() // Keep only RGB channels
                    .toBuffer();

                // 5. Apply sharpening to the RGB channels to enhance details
                const sharpenedRgb = await sharp(rgbChannels)
                    .sharpen({
                        sigma: 0.2,  // Radius of the Gaussian in pixels (default: 1.0)
                        flat: 1.0,   // Flat/plateau area (default: 1.0)
                        jagged: 5.0  // Jagged edge contrast (default: 2.0)
                    })
                    .toBuffer();

                // 6. Join the sharpened RGB channels with the smoothed alpha channel
                carOnlyBuffer = await sharp(sharpenedRgb)
                    .joinChannel(smoothedAlpha)
                    .png()
                    .toBuffer();
                console.log("Edge blur and sharpening successfully applied");

            } catch (error) {
                console.error("Error applying edge blur and sharpening:", error);
                // Continue with the original car buffer if processing fails
                console.log("Continuing with the original car cutout...");
            }
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

        const rimsOnlyBuffer = await extractBrightParts(wheelsOnlyBuffer, config.rimBrightnessThreshold, jpgImageBuffer);

        // Create TRANSPARENT colored rims.
        const coloredRimsBuffer = await createTransparentColoredRims(rimsOnlyBuffer, rimColor);

        // --- Composite (Conditional) ---
        let finalResultBuffer;
        if (shouldRemoveBackground) {
            // Composite colored rims *onto* the extracted car
            console.log("Compositing colored rims onto extracted car...");
            finalResultBuffer = await sharp(carOnlyBuffer)
                .composite([{ input: coloredRimsBuffer, blend: 'over' }])
                .png() // Ensure PNG output
                .toBuffer();
        } else {
            //original image composited with colored rims.
            console.log("Compositing colored rims with original image...");
            finalResultBuffer = await sharp(jpgImageBuffer)
                .composite([{ input: coloredRimsBuffer, blend: 'over' }])
                .png() // Ensure PNG output.
                .toBuffer();
        }

        // --- Output ---
        return new Response(finalResultBuffer, {
            headers: { 'Content-Type': 'image/png' }
        });

    } catch (error) {
        console.error('Error in processing:', error);
        return errorResponse(error.message || 'Internal Server Error', 500);
    }
}