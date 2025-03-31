/**
 * Generates a colorized layer based on a mask and base image shading.
 * @param hexColor The hex color string (e.g., '#ff0000') or 'transparent'.
 * @param intensityPercent Intensity percentage (0-100).
 * @param maskBitmap The ImageBitmap of the rim mask (white on black).
 * @param baseBitmap The ImageBitmap to derive shading from (e.g., original image or car-only image).
 * @param width The width of the bitmaps.
 * @param height The height of the bitmaps.
 * @returns An OffscreenCanvas containing the colorized layer with transparency.
 */
export const generateColorizedLayer = async (
    hexColor: string,
    intensityPercent: number,
    maskBitmap: ImageBitmap,
    baseBitmap: ImageBitmap,
    width: number,
    height: number
): Promise<OffscreenCanvas> => {
    // If no color or zero intensity, return a blank (transparent) canvas immediately
    if (hexColor === 'transparent' || intensityPercent === 0) {
        const emptyCanvas = new OffscreenCanvas(width, height);
        // Ensure it's truly empty/transparent
        emptyCanvas.getContext('2d')?.clearRect(0, 0, width, height);
        return emptyCanvas;
    }

    const colorizedCanvas = new OffscreenCanvas(width, height);
    const colorizedCtx = colorizedCanvas.getContext('2d');
    if (!colorizedCtx) throw new Error("Could not get context for colorized canvas");

    // Canvas for base image shading
    const baseCanvas = new OffscreenCanvas(width, height);
    const baseCtx = baseCanvas.getContext('2d');
    if (!baseCtx) throw new Error("Could not get 2D context for base canvas");
    baseCtx.drawImage(baseBitmap, 0, 0, width, height);
    const baseData = baseCtx.getImageData(0, 0, width, height);

    // Canvas for mask
    const maskCanvas = new OffscreenCanvas(width, height);
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) throw new Error("Could not get 2D context for mask canvas");
    maskCtx.drawImage(maskBitmap, 0, 0, width, height);
    const maskData = maskCtx.getImageData(0, 0, width, height);

    // Prepare output data
    const outputData = colorizedCtx.createImageData(width, height);
    const outputPixels = outputData.data;

    // Parse color
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);

    const intensity = intensityPercent / 100.0; // Convert percentage to 0.0-1.0
    const boost = 1.5; // Factor to make colors pop slightly based on luminosity

    for (let i = 0; i < maskData.data.length; i += 4) {
        const maskAlpha = maskData.data[i];

        if (maskAlpha > 0) {
            const original = {
                r: baseData.data[i],
                g: baseData.data[i + 1],
                b: baseData.data[i + 2]
            };

            // Calculate the fully colorized pixel based on luminosity
            const luminosity = 0.299 * original.r + 0.587 * original.g + 0.114 * original.b;
            const factor = luminosity / 255.0;
            const colored = {
                r: Math.min(255, r * factor * boost),
                g: Math.min(255, g * factor * boost),
                b: Math.min(255, b * factor * boost)
            };

            // Interpolate between original and fully colored based on intensity slider
            outputPixels[i]     = Math.round(original.r * (1 - intensity) + colored.r * intensity);
            outputPixels[i + 1] = Math.round(original.g * (1 - intensity) + colored.g * intensity);
            outputPixels[i + 2] = Math.round(original.b * (1 - intensity) + colored.b * intensity);
            outputPixels[i + 3] = maskAlpha;
        } else {
            outputPixels[i + 3] = 0;
        }
    }

    colorizedCtx.putImageData(outputData, 0, 0);
    return colorizedCanvas;
};