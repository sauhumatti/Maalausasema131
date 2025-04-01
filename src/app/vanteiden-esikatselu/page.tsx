'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { generateColorizedLayer } from '@/utils/colorUtils';

export default function VanteidenEsikatselu() {
    const [image, setImage] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [color, setColor] = useState('#ff0000');
    const [colorIntensity, setColorIntensity] = useState(100);
    const [isProcessingImage, setIsProcessingImage] = useState(false); // For initial image processing
    const [isApplyingChange, setIsApplyingChange] = useState(false); // For updates after initial load
    const [removeBackground, setRemoveBackground] = useState(true);
    const [isInitialProcessingDone, setIsInitialProcessingDone] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [originalImageDimensions, setOriginalImageDimensions] = useState<{ width: number, height: number } | null>(null);

    const [originalImageBitmap, setOriginalImageBitmap] = useState<ImageBitmap | null>(null);
    const [rimMaskBitmap, setRimMaskBitmap] = useState<ImageBitmap | null>(null); // Will hold the *current* mask bitmap
    const [carOnlyImageBitmap, setCarOnlyImageBitmap] = useState<ImageBitmap | null>(null);

    // --- NEW State Variables ---
    const [availableThresholds, setAvailableThresholds] = useState<{ [key: string]: any } | null>(null); // Populated on 2nd req
    const [currentThreshold, setCurrentThreshold] = useState<number>(50); // Default, used by slider later
    const [thresholdPercentages, setThresholdPercentages] = useState<{ [key: string]: number }>({}); // Populated on 2nd req
    const [detailedThresholdsCalculated, setDetailedThresholdsCalculated] = useState(false);
    const [showThresholdSlider, setShowThresholdSlider] = useState(false);
    const [isCalculatingThresholds, setIsCalculatingThresholds] = useState(false); // For second API call
    // --- End NEW State Variables ---

    const [selectedBackground, setSelectedBackground] = useState<string | null>(null);
    const [availableBackgrounds, setAvailableBackgrounds] = useState<{ name: string, path: string | null }[]>([]);
    const [isBackgroundSectionOpen, setIsBackgroundSectionOpen] = useState(false);
    const [defaultMaskPercentage, setDefaultMaskPercentage] = useState<number | null>(null); // Store initial percentage

    // --- Quote Modal State ---
    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
    const [quoteName, setQuoteName] = useState('');
    const [quotePhone, setQuotePhone] = useState('');
    const [quoteEmail, setQuoteEmail] = useState('');
    const [quotePreference, setQuotePreference] = useState<'call' | 'email'>('email');
    const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);
    const [quoteSubmissionStatus, setQuoteSubmissionStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [quoteError, setQuoteError] = useState<string | null>(null);

// Quote Modal Handler Functions
const handleOpenQuoteModal = () => {
    if (!resultImage) {
        alert("Viimeistele vanteen esikatselu ennen tarjouspyynnön lähettämistä.");
        return;
    }
    setQuoteName('');
    setQuotePhone('');
    setQuoteEmail('');
    setQuotePreference('email');
    setQuoteSubmissionStatus('idle');
    setQuoteError(null);
    setIsQuoteModalOpen(true);
};

const handleCloseQuoteModal = () => {
    if (!isSubmittingQuote) {
        setIsQuoteModalOpen(false);
    }
};

const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resultImage) {
        setQuoteError("Esikatselukuvaa ei löytynyt.");
        setQuoteSubmissionStatus('error');
        return;
    }
    if (!quoteName || !quotePhone || !quoteEmail) {
        setQuoteError("Täytä kaikki vaaditut kentät (Nimi, Puhelin, Sähköposti).");
        setQuoteSubmissionStatus('error');
        return;
    }

    setIsSubmittingQuote(true);
    setQuoteSubmissionStatus('idle');
    setQuoteError(null);

    try {
        const payload = {
            name: quoteName,
            phone: quotePhone,
            email: quoteEmail,
            preference: quotePreference,
            resultImage: resultImage,
            color: color,
            intensity: colorIntensity,
            threshold: currentThreshold,
            backgroundRemoved: removeBackground,
            selectedBackgroundPath: selectedBackground,
        };

        const response = await fetch('/api/send-quote', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.error || `Palvelinvirhe: ${response.status}`);
        }

        setQuoteSubmissionStatus('success');
        setTimeout(() => {
            handleCloseQuoteModal();
        }, 3000);

    } catch (error) {
        console.error("Quote submission error:", error);
        setQuoteError(error instanceof Error ? error.message : "Lähetys epäonnistui tuntemattomasta syystä.");
        setQuoteSubmissionStatus('error');
    } finally {
        setIsSubmittingQuote(false);
    }
};

// Function to fetch available backgrounds
const fetchAvailableBackgrounds = async () => {
    try {
        const response = await fetch('/api/backgrounds');
        const data = await response.json();
        
        if (data.backgrounds && Array.isArray(data.backgrounds)) {
            setAvailableBackgrounds([
                { name: 'Ei taustaa', path: null },
                ...data.backgrounds
            ]);
        }
    } catch (error) {
        console.error('Failed to fetch backgrounds:', error);
        // Fallback to default backgrounds
        setAvailableBackgrounds([
            { name: 'Ei taustaa', path: null },
            { name: 'Tausta 1', path: '/images/taustat/tausta1.png' },
            { name: 'Tausta 2', path: '/images/taustat/tausta2.png' }
        ]);
    }
};

// Fetch backgrounds when needed
useEffect(() => {
    if (isInitialProcessingDone && removeBackground) {
        fetchAvailableBackgrounds();
    }
}, [isInitialProcessingDone, removeBackground]);

// Get initial image dimensions for canvas operations.
useEffect(() => {
    if (image) {
        const img = new window.Image();
        img.onload = () => {
            setOriginalImageDimensions({ width: img.width, height: img.height });
        };
        img.src = image;
    } else {
        setOriginalImageDimensions(null);
    }
}, [image]);

const presetColors = [
    { name: 'Ei väriä', value: 'transparent' },
    { name: 'Punainen', value: '#ff0000' },
    { name: 'Sininen', value: '#0000ff' },
    { name: 'Vihreä', value: '#00ff00' },
    { name: 'Kulta', value: '#ffd700' },
    { name: 'Musta', value: '#000000' },
    { name: 'Hopea', value: '#c0c0c0' },
];

const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target) {
                // Reset ALL states
                setImage(event.target.result as string);
                setIsProcessingImage(false);
                setIsCalculatingThresholds(false);
                setIsApplyingChange(false);
                setIsInitialProcessingDone(false);
                setResultImage(null);
                setColor('#ff0000');
                setColorIntensity(100);
                setRemoveBackground(true);

                // Reset threshold-related states
                setAvailableThresholds(null);
                setCurrentThreshold(50); // Reset slider default
                setThresholdPercentages({});
                setDetailedThresholdsCalculated(false);
                setShowThresholdSlider(false);
                setIsCalculatingThresholds(false);
                setDefaultMaskPercentage(null);

                // Clear image bitmaps
                setOriginalImageBitmap(null);
                setRimMaskBitmap(null);
                setCarOnlyImageBitmap(null);
                setOriginalImageDimensions(null);

                // Backgrounds
                setSelectedBackground(null);
                setIsBackgroundSectionOpen(false);

                // Clean up any object URLs
                if (resultImage) {
                    URL.revokeObjectURL(resultImage);
                }
            }
        };
        reader.readAsDataURL(file);
    }
};

const triggerFileInput = () => {
    fileInputRef.current?.click();
};


// MODIFIED: Initial Image Processing
const processImage = async () => {
    if (!image || isProcessingImage || isInitialProcessingDone) return; // Prevent reprocessing

    setIsProcessingImage(true);
    // Reset states for a fresh run in case of retry, except for the input image itself
    setResultImage(null);
    setIsApplyingChange(false);
    setIsCalculatingThresholds(false);
    setAvailableThresholds(null);
    setThresholdPercentages({});
    setDetailedThresholdsCalculated(false);
    setShowThresholdSlider(false);
    setIsCalculatingThresholds(false);
    setOriginalImageBitmap(null);
    setRimMaskBitmap(null);
    setCarOnlyImageBitmap(null);
    setOriginalImageDimensions(null);
    setDefaultMaskPercentage(null);


    try {
        const initialColor = '#ff0000';
        setColor(initialColor);

        const imageBlob = await fetch(image).then((r) => r.blob());
        const formData = new FormData();
        formData.append('image', imageBlob, 'image.jpg');
        formData.append('removeBackground', removeBackground.toString());

        console.log("Sending initial processing request...");
        const response = await fetch('/api/process-image', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            // ... (keep your existing error handling for response.ok)
             const errorText = await response.text();
             try {
                 const errorData = JSON.parse(errorText);
                 throw new Error(errorData.error || `Palvelinvirhe: ${response.status}`);
             } catch (parseError) {
                 throw new Error(errorText || `Palvelinvirhe: ${response.status}`);
             }
         }

        const data = await response.json();
        console.log("Initial processing response received:", data);

        // --- Step 1: Fetch Blobs ---
        let fetchedOriginalBlob: Blob | null = null;
        let fetchedCarBlob: Blob | null = null;

        try {
            if (data.originalImage && typeof data.originalImage === 'string' && data.originalImage.startsWith('data:image/')) {
                fetchedOriginalBlob = await fetch(data.originalImage).then(r => r.blob());
                console.log("Fetched original image blob.");
            } else {
                throw new Error("Invalid or missing data.originalImage URL");
            }

            if (data.carImage && typeof data.carImage === 'string' && data.carImage.startsWith('data:image/')) {
                fetchedCarBlob = await fetch(data.carImage).then(r => r.blob());
                console.log("Fetched car image blob.");
            } else if (removeBackground) {
                // Log if car image was expected but not received correctly
                console.warn("data.carImage was missing or invalid in API response, but background removal was requested.");
            } else {
                console.log("data.carImage not present (background removal not requested or failed server-side).");
            }
        } catch (fetchError) {
            console.error("Error fetching image blobs from data URLs:", fetchError);
            throw new Error(`Failed to load image data. ${fetchError instanceof Error ? fetchError.message : ''}`);
        }

        // --- Step 2: Create Bitmaps Sequentially ---
        let createdBaseBitmap: ImageBitmap | null = null;
        let createdCarBitmap: ImageBitmap | null = null;
        let createdMaskBitmap: ImageBitmap | null = null; // Add mask bitmap creation here too

        try {
            if (fetchedOriginalBlob) {
                createdBaseBitmap = await createImageBitmap(fetchedOriginalBlob);
                setOriginalImageBitmap(createdBaseBitmap); // Set state
                setOriginalImageDimensions({ width: createdBaseBitmap.width, height: createdBaseBitmap.height });
                console.log("Successfully created originalImageBitmap");
            } else {
                throw new Error("Original image blob was null."); // Should be caught earlier, but good check
            }

            if (fetchedCarBlob) {
                createdCarBitmap = await createImageBitmap(fetchedCarBlob);
                setCarOnlyImageBitmap(createdCarBitmap); // Set state
                console.log("Successfully created carOnlyImageBitmap");
            }
            // Add mask bitmap creation here for consistency
            if (data.rimMask && typeof data.rimMask === 'string' && data.rimMask.startsWith('data:image/')) {
                 const maskBlob = await fetch(data.rimMask).then(r => r.blob());
                 createdMaskBitmap = await createImageBitmap(maskBlob);
                 setRimMaskBitmap(createdMaskBitmap); // Set state
                 console.log("Successfully created rimMaskBitmap");
                 if (data.rimPercentage !== undefined) {
                     setDefaultMaskPercentage(data.rimPercentage);
                 }
             } else {
                 throw new Error("Default rim mask missing or invalid from initial response");
             }

        } catch (bitmapError) {
            console.error("Error creating ImageBitmaps:", bitmapError);
            if (!createdBaseBitmap) {
                throw new Error(`Failed to create essential base image bitmap. ${bitmapError instanceof Error ? bitmapError.message : ''}`);
            }
            if (!createdMaskBitmap) {
                 throw new Error(`Failed to create essential rim mask bitmap. ${bitmapError instanceof Error ? bitmapError.message : ''}`);
            }
             // If only car bitmap failed, warn but allow continuation if possible
            if (fetchedCarBlob && !createdCarBitmap) {
                console.warn("Failed to create car-only image bitmap. Background removal might not work as expected.");
                setCarOnlyImageBitmap(null); // Ensure state is null
            }
            // If mask creation failed after fetching, it's critical
        }


        // --- Step 3: Determine Base for Display and Apply Color ---
        // Use the bitmaps created in the step above
        const baseDisplayBitmap = removeBackground && createdCarBitmap ? createdCarBitmap : createdBaseBitmap;

        if (!baseDisplayBitmap) {
            // This error should ideally be caught during bitmap creation now
            console.error("CRITICAL: Could not determine baseDisplayBitmap. Base:", createdBaseBitmap, "Car:", createdCarBitmap, "Mask:", createdMaskBitmap);
            throw new Error("An unexpected error occurred selecting the base image for display.");
        }
        if (!createdMaskBitmap) {
             // This error should ideally be caught during bitmap creation now
             console.error("CRITICAL: Rim mask bitmap is not available.");
             throw new Error("Rim mask is missing, cannot apply color.");
        }

        console.log(`Applying initial color using base: ${baseDisplayBitmap === createdCarBitmap ? 'Car Image' : 'Original Image'}`);

        const { width, height } = baseDisplayBitmap; // Now safe

        const colorizedCanvas = await generateColorizedLayer(
            initialColor,
            colorIntensity,
            createdMaskBitmap, // Use the created mask bitmap
            baseDisplayBitmap, // Use the determined base display bitmap
            width,
            height
        );

        // --- Step 4: Composite Final Image ---
        const mainCanvas = new OffscreenCanvas(width, height);
        const mainCtx = mainCanvas.getContext('2d');
        if (!mainCtx) throw new Error("Could not get 2D context for final composition");

        mainCtx.drawImage(baseDisplayBitmap, 0, 0); // Draw base (car or original)
        mainCtx.drawImage(colorizedCanvas, 0, 0); // Overlay color

        const finalBlob = await mainCanvas.convertToBlob({ type: 'image/png' });
        if (resultImage) URL.revokeObjectURL(resultImage); // Clean previous if any
        setResultImage(URL.createObjectURL(finalBlob));

        setIsInitialProcessingDone(true); // Mark initial processing complete

    } catch (error) {
        console.error("Error during initial processing:", error);
        alert(`Error processing image: ${error instanceof Error ? error.message : String(error)}`);
        // Reset relevant states on error
        setIsInitialProcessingDone(false);
        setResultImage(null); // Clear result on error
    } finally {
        setIsProcessingImage(false);
    }
};

// --- NEW Function: Calculate Detailed Thresholds ---
const calculateDetailedThresholds = async () => {
    if (!image || isCalculatingThresholds || detailedThresholdsCalculated) return;

    setIsCalculatingThresholds(true);
    setShowThresholdSlider(false); // Hide slider while calculating

    try {
        const imageBlob = await fetch(image).then((r) => r.blob());
        const formData = new FormData();
        formData.append('image', imageBlob, 'image.jpg');
        formData.append('calculateAllThresholds', 'true'); // IMPORTANT FLAG

        console.log("Sending request for detailed thresholds...");
        const response = await fetch('/api/process-image', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
             const errorText = await response.text();
             try {
                 const errorData = JSON.parse(errorText);
                 throw new Error(errorData.error || `Palvelinvirhe: ${response.status}`);
             } catch (parseError) {
                 throw new Error(errorText || `Palvelinvirhe: ${response.status}`);
             }
         }

        const data = await response.json();
        console.log("Detailed thresholds response received:", data);

        if (data.rimMasks) {
            setAvailableThresholds(data.rimMasks); // Store all mask data

            const percentages: { [key: string]: number } = {};
            Object.keys(data.rimMasks).forEach(threshold => {
                percentages[threshold] = data.rimMasks[threshold].rimPercentage;
            });
            setThresholdPercentages(percentages);

             // Set the current mask to the default one initially after calculation
            const defaultThresholdKey = String(data.defaultThreshold || 50);
            if (data.rimMasks[defaultThresholdKey]) {
                const maskBlob = await fetch(data.rimMasks[defaultThresholdKey].rimMask).then(r => r.blob());
                const newMaskBitmap = await createImageBitmap(maskBlob);
                setRimMaskBitmap(newMaskBitmap);
                setCurrentThreshold(Number(defaultThresholdKey)); // Ensure slider starts at default
            }

            setDetailedThresholdsCalculated(true);
            setShowThresholdSlider(true); // Show slider now
        } else {
            throw new Error("Detailed rim masks missing from response");
        }

    } catch (error) {
        console.error("Error calculating detailed thresholds:", error);
        alert(`Error calculating detailed thresholds: ${error instanceof Error ? error.message : String(error)}`);
        setDetailedThresholdsCalculated(false); // Reset on error
        setShowThresholdSlider(false);
    } finally {
        setIsCalculatingThresholds(false);
    }
};

// MODIFIED: applyColorWithMask needs to use the *current* rimMaskBitmap state
const applyColorWithMask = useCallback(async (
    newColor: string,
    removeBgOverride?: boolean,
    newIntensity?: number,
    maskOverride?: ImageBitmap // Add optional mask override parameter
) => {
    // Use override if provided, otherwise use state
    const maskToUse = maskOverride || rimMaskBitmap;
    if (!image || !maskToUse || !originalImageDimensions || (!originalImageBitmap && !carOnlyImageBitmap)) {
            console.error("Missing required data for color change (state).", { image, rimMaskBitmap, originalImageDimensions, originalImageBitmap, carOnlyImageBitmap });
            return;
        }

    const currentRemoveBackground = removeBgOverride !== undefined ? removeBgOverride : removeBackground;
    const baseBitmap = currentRemoveBackground ? carOnlyImageBitmap : originalImageBitmap;
    const intensity = newIntensity ?? colorIntensity;

        if (!baseBitmap) {
            console.error("Base bitmap (original or car-only) is missing.");
            return;
        }

    // No need to update color state here if called directly by slider/picker
    // setColor(newColor); // Removed this line

    try {
        const { width, height } = originalImageDimensions;

        const mainCanvas = new OffscreenCanvas(width, height);
        const mainCtx = mainCanvas.getContext('2d');
        if (!mainCtx) throw new Error("Could not get 2D context for main canvas");

        mainCtx.drawImage(baseBitmap, 0, 0);

            const colorizedCanvas = await generateColorizedLayer(
                newColor,
                intensity,
                maskToUse, // Use the determined mask
                baseBitmap, // Use the correct base for shading
                width,
                height
            );

        mainCtx.drawImage(colorizedCanvas, 0, 0);

        const finalBlob = await mainCanvas.convertToBlob({ type: 'image/png' });
        const finalDataURL = URL.createObjectURL(finalBlob);

        if (resultImage) {
            URL.revokeObjectURL(resultImage);
        }

        setResultImage(finalDataURL);
    } catch (error) {
        console.error("Error applying color with mask:", error);
        // Optionally revert color state if needed, though it's complex
        throw error; // Re-throw for calling function to handle
    }
}, [image, rimMaskBitmap, originalImageDimensions, originalImageBitmap, carOnlyImageBitmap, removeBackground, colorIntensity]); // Removed resultImage

const applyBackground = async (backgroundPath: string | null) => {
    if (!isInitialProcessingDone || !carOnlyImageBitmap || !rimMaskBitmap) {
        console.warn("Cannot apply background, initial processing not done or missing data.");
        return;
    }

    setIsApplyingChange(true);
    setSelectedBackground(backgroundPath);

    try {
        // Apply the background using the current color state
        await applyBackgroundWithColor(backgroundPath, color);
    } catch (error) {
        console.error("Error applying background:", error);
        alert('Virhe taustan käsittelyssä. Yritä uudelleen.');
        // Optionally revert selectedBackground state
    } finally {
        setIsApplyingChange(false);
    }
};

const createColorizedRim = async (newColor: string, maskBitmap: ImageBitmap, width: number, height: number, shadingBitmap?: ImageBitmap) => {
    // If no color is requested, return empty canvas
    if (newColor === 'transparent') {
        const emptyCanvas = new OffscreenCanvas(width, height);
        return emptyCanvas;
    }
    
    // This is a more complete version that preserves shading
    const colorizedCanvas = new OffscreenCanvas(width, height);
    const colorizedCtx = colorizedCanvas.getContext('2d');
    if (!colorizedCtx) throw new Error("Could not get context for colorized canvas");
    
    // We need the original image for shading details
    const originalCanvas = new OffscreenCanvas(width, height);
    const originalCtx = originalCanvas.getContext('2d');
    if (!originalCtx) throw new Error("Could not get 2D context for original canvas");
    
    // Use the shadingBitmap if provided, fall back to originalImageBitmap
    if (shadingBitmap) {
        originalCtx.drawImage(shadingBitmap, 0, 0);
    } else if (originalImageBitmap) {
        originalCtx.drawImage(originalImageBitmap, 0, 0);
    }
    
    // Create mask canvas
    const maskCanvas = new OffscreenCanvas(width, height);
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) throw new Error("Could not get 2D context for mask canvas");
    maskCtx.drawImage(maskBitmap, 0, 0);
    
    // Get pixel data
    const maskData = maskCtx.getImageData(0, 0, width, height);
    const origData = originalCtx.getImageData(0, 0, width, height);
    
    // Create new colorized data
    const colorizedData = new ImageData(width, height);
    const colorizedPixels = colorizedData.data;
    
    // Parse color
    const r = parseInt(newColor.slice(1, 3), 16);
    const g = parseInt(newColor.slice(3, 5), 16);
    const b = parseInt(newColor.slice(5, 7), 16);
    
    // Apply colorization preserving luminosity - same algorithm as in applyColorWithMask
    for (let i = 0; i < maskData.data.length; i += 4) {
    const maskIntensity = maskData.data[i];
    
    if (maskIntensity > 0) {
        // Get original pixel for shading details
        const original = {
        r: origData.data[i],
        g: origData.data[i+1],
        b: origData.data[i+2]
        };
        
        // Calculate luminosity to preserve shadows and highlights
        const luminosity = 0.299 * original.r + 0.587 * original.g + 0.114 * original.b;
        const factor = luminosity / 255;
        
        // Apply the color with shading preserved
        colorizedPixels[i] = Math.min(255, r * factor * 1.5);
        colorizedPixels[i+1] = Math.min(255, g * factor * 1.5);
        colorizedPixels[i+2] = Math.min(255, b * factor * 1.5);
        colorizedPixels[i+3] = maskIntensity;
    } else {
        // Keep fully transparent for non-rim areas
        colorizedPixels[i+3] = 0;
    }
    }
    
    // Apply the data to the canvas
    colorizedCtx.putImageData(colorizedData, 0, 0);
    return colorizedCanvas;
};
// Then update the changeColor function to use this helper
const applyBackgroundWithColor = useCallback(async (
    backgroundPath: string | null,
    colorToApply: string,
    newIntensity?: number,
    maskOverride?: ImageBitmap // Add optional mask override parameter
) => {
    // Use override if provided, otherwise use state
    const maskToUse = maskOverride || rimMaskBitmap;
    if (!isInitialProcessingDone || !carOnlyImageBitmap || !maskToUse || !originalImageDimensions) {
         console.warn("Cannot apply background with color, missing data.");
         return;
     }

    try {
        const { width, height } = originalImageDimensions;
        const intensity = newIntensity ?? colorIntensity;

        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Could not get canvas context");

        // Base layer: Background or transparent
        if (backgroundPath) {
            const backgroundImg = new window.Image();
            await new Promise<void>((resolve, reject) => {
                backgroundImg.onload = () => resolve();
                backgroundImg.onerror = reject;
                backgroundImg.src = backgroundPath;
            });
            ctx.drawImage(backgroundImg, 0, 0, width, height);
        } else {
            ctx.clearRect(0, 0, width, height); // Start with transparent if no background path
        }

        // Car layer
        ctx.drawImage(carOnlyImageBitmap, 0, 0);

        // Colorized rims layer
         const colorizedCanvas = await generateColorizedLayer(
             colorToApply,
             intensity,
             maskToUse, // Use the determined mask
             carOnlyImageBitmap, // Shading from car image
             width,
             height
         );
        ctx.drawImage(colorizedCanvas, 0, 0);

        // Final result
        const finalBlob = await canvas.convertToBlob({ type: 'image/png' });
        if (resultImage) {
            URL.revokeObjectURL(resultImage);
        }
        setResultImage(URL.createObjectURL(finalBlob));

    } catch (error) {
        console.error("Error applying background with color:", error);
        throw error; // Re-throw
    }
}, [isInitialProcessingDone, carOnlyImageBitmap, rimMaskBitmap, originalImageDimensions, colorIntensity]); // Removed resultImage

const handleThresholdChange = useCallback(async (threshold: number) => {
    // Ensure detailed thresholds are loaded and we have the data
    if (!detailedThresholdsCalculated || !availableThresholds || !availableThresholds[threshold]) {
        console.warn("Cannot change threshold, detailed data not available yet.", { detailedThresholdsCalculated, availableThresholds, threshold });
        return;
    }

    setIsApplyingChange(true);
    setCurrentThreshold(threshold);

    try {
        // Get the new mask URL for this threshold
        const maskUrl = availableThresholds[threshold].rimMask;
        const maskBlob = await fetch(maskUrl).then(r => r.blob());
        const newMaskBitmap = await createImageBitmap(maskBlob);

        // Update the mask bitmap state
        setRimMaskBitmap(newMaskBitmap);

        // Apply the current color using the new mask bitmap DIRECTLY
        if (removeBackground && selectedBackground !== null) {
            await applyBackgroundWithColor(selectedBackground, color, colorIntensity, newMaskBitmap);
        } else {
            await applyColorWithMask(color, removeBackground, colorIntensity, newMaskBitmap);
        }

    } catch (error) {
        console.error("Error changing threshold:", error);
        alert('Error changing rim coverage. Please try again.');
    } finally {
        setIsApplyingChange(false);
    }
}, [detailedThresholdsCalculated, availableThresholds, color, removeBackground, selectedBackground, applyColorWithMask, applyBackgroundWithColor]); // Dependencies updated




// Color change handlers
const changeColor = useCallback(async (newColor: string, removeBackgroundOverride?: boolean) => {
    if (!rimMaskBitmap || !isInitialProcessingDone) {
        console.error("Cannot change color: Initial processing not done or mask missing.");
        return;
    }

    const oldColor = color;
    setColor(newColor);
    setIsApplyingChange(true);

    try {
        const currentRemoveBackground = removeBackgroundOverride !== undefined ?
            removeBackgroundOverride : removeBackground;
        
        if (currentRemoveBackground && selectedBackground !== null) {
            if (!carOnlyImageBitmap) {
                throw new Error("Car image data unavailable for background composition.");
            }
            await applyBackgroundWithColor(selectedBackground, newColor, colorIntensity);
        } else {
            if (!currentRemoveBackground && !originalImageBitmap) {
                throw new Error("Original image data unavailable for color application.");
            }
            await applyColorWithMask(newColor, currentRemoveBackground, colorIntensity);
        }
    } catch (error) {
        console.error("Error changing color:", error);
        alert('Error changing color. Please try again.');
        setColor(oldColor);
    } finally {
        setIsApplyingChange(false);
    }
}, [
    rimMaskBitmap,
    isInitialProcessingDone,
    color,
    removeBackground,
    selectedBackground,
    colorIntensity,
    carOnlyImageBitmap,
    originalImageBitmap,
    applyBackgroundWithColor,
    applyColorWithMask
]);

const debouncedIntensityUpdate = useCallback(async (newIntensity: number) => {
    if (color === 'transparent' || !isInitialProcessingDone || !rimMaskBitmap || isApplyingChange || isCalculatingThresholds || isProcessingImage) {
        return;
    }
    setIsApplyingChange(true);
    try {
        // Always use current mask state for intensity updates
        if (removeBackground && selectedBackground !== null) {
            await applyBackgroundWithColor(selectedBackground, color, newIntensity);
        } else {
            await applyColorWithMask(color, removeBackground, newIntensity);
        }
    } catch (error) {
        console.error("Error applying intensity change:", error);
        alert('Värin voimakkuuden muuttaminen epäonnistui.');
    } finally {
        setIsApplyingChange(false);
    }
}, [color, isInitialProcessingDone, rimMaskBitmap, removeBackground, selectedBackground, applyBackgroundWithColor, applyColorWithMask]);

useEffect(() => {
    const timeoutId = setTimeout(() => {
        if (isInitialProcessingDone && rimMaskBitmap) {
            debouncedIntensityUpdate(colorIntensity);
        }
    }, 100);
    return () => clearTimeout(timeoutId);
}, [colorIntensity, debouncedIntensityUpdate, isInitialProcessingDone, rimMaskBitmap]);

const handleIntensityChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newIntensity = Number(event.target.value);
    setColorIntensity(newIntensity);
}, []);

const handleColorButtonClick = (newColor: string) => {
    if (isInitialProcessingDone) {
        changeColor(newColor);
    } else {
        setColor(newColor);
    }
};

const handleColorInputChange = (newColor: string) => {
    // Validate hex format here optionally if desired
    if (isInitialProcessingDone) {
        changeColor(newColor);
    } else {
        setColor(newColor);
    }
};

const handleRemoveBackgroundChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;

    if (isInitialProcessingDone) {
        if (isApplyingChange || isCalculatingThresholds || isProcessingImage) {
            console.warn("Cannot toggle background removal: Component busy");
            return;
        }

        setIsApplyingChange(true);
        try {
            setRemoveBackground(newValue);

            let needsProcessing = false;
            if (newValue && !carOnlyImageBitmap) {
                needsProcessing = true;
            } else if (!newValue && !originalImageBitmap) {
                console.warn("Original image bitmap missing, re-processing needed");
                needsProcessing = true;
            }

            if (needsProcessing) {
                setIsApplyingChange(false); // Reset before processImage
                await processImage(); // This handles its own isProcessingImage flag
            } else {
                await changeColor(color, newValue); // Uses isApplyingChange internally
            }
        } catch (error) {
            console.error("Error toggling background removal:", error);
            alert('Error changing background settings. Please try again.');
            setRemoveBackground(!newValue);
        } finally {
            setIsApplyingChange(false);
        }
    } else {
        // If initial processing is not done yet, just update the state
        setRemoveBackground(newValue);
    }
};

return (
    <div className="bg-primary-800"> {/* Outer div with the background color */}
        <div className="container mx-auto px-4 py-16 max-w-5xl">
            <h1 className="text-4xl font-bold mb-8 text-center text-white">Vanteiden Esikatselu</h1>

            {/* Main Content Card */}
            <div className="bg-primary-50 p-6 md:p-8 rounded-xl shadow-sm mb-12">
                <p className="text-lg mb-6 text-center text-gray-700">
                    Lataa kuva autostasi ja valitse haluamasi vanteen väri nähdäksesi, miltä
                    lopputulos voisi näyttää.
                </p>

                <div className="max-w-3xl mx-auto">
                    {/* Step 1: Image Upload Section */}
                    <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
                        <h2 className="text-xl font-semibold mb-4 text-gray-900">1. Valitse kuva</h2>
                        <div className="flex flex-col md:flex-row gap-4 items-stretch">
                            {/* File Input Area */}
                            <div className="flex-grow">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
                                <button
                                    onClick={triggerFileInput}
                                    // Disable button during any processing
                                    disabled={isProcessingImage || isCalculatingThresholds || isApplyingChange}
                                    className="w-full h-full min-h-[80px] flex items-center justify-center gap-2 py-3 px-4 bg-white border-2 border-dashed border-gray-300 hover:border-primary rounded-lg text-gray-700 hover:text-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:border-gray-300"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    {image ? 'Vaihda kuva' : 'Lataa kuva autostasi'}
                                </button>
                            </div>

                            {/* Image Thumbnail */}
                            {image && (
                                <div className="md:w-1/4 flex-shrink-0">
                                    <div className="relative h-[80px] rounded-lg overflow-hidden border border-gray-200">
                                        <Image
                                            src={image}
                                            alt="Kuvan esikatselu"
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Process Button (Only show if image loaded and not processed yet) */}
                            {image && !isInitialProcessingDone && (
                                <div className="md:w-1/4 flex-shrink-0">
                                    <button
                                        onClick={processImage}
                                        disabled={isProcessingImage} // Disable only during initial processing
                                        className={`w-full h-full min-h-[80px] py-2 px-4 rounded-lg font-medium text-white transition-colors flex items-center justify-center ${isProcessingImage
                                            ? 'bg-gray-400 cursor-not-allowed'
                                            : 'bg-primary hover:bg-primary-700'
                                            }`}
                                    >
                                        {isProcessingImage ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Käsitellään...
                                            </span>
                                        ) : 'Prosessoi Kuva'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div> {/* End Step 1 */}

                    {/* Step 2: Result Preview Section */}
                    <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
                        <h2 className="text-xl font-semibold mb-4 text-gray-900">
                            {isInitialProcessingDone ? '2.' : '2.'} Esikatselu
                        </h2>
                        <div className="relative min-h-[300px] md:min-h-[400px] bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center text-gray-500">
                             {!image ? (
                                 <p className="text-center px-4">Lataa kuva yllä.</p>
                             ) : !isInitialProcessingDone && !isProcessingImage && !resultImage ? (
                                 <div className="text-center px-4">
                                     <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                                     </svg>
                                     <p className="mt-2 text-gray-400">Paina "Prosessoi Kuva".</p>
                                 </div>
                             ) : isProcessingImage && !isInitialProcessingDone ? ( // Loading during initial processing
                                 <div className="text-center">
                                     <svg className="animate-spin mx-auto h-10 w-10 text-primary mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                     </svg>
                                     Käsitellään kuvaa...
                                 </div>
                             ) : resultImage ? (
                                 <Image src={resultImage} alt="Kuva maalatuilla vanteilla" fill className="object-contain" unoptimized />
                             ) : isInitialProcessingDone && !resultImage ? ( // Error/fallback after initial attempt
                                 <p className="text-red-500 text-center px-4">Käsittely epäonnistui tai tulosta ei löytynyt.</p>
                             ) : null /* Should cover all cases */ }
                         </div>
                     </div> {/* End Step 2 */}

                    {/* Step 3: Options Section (Conditionally Rendered) */}
                    {isInitialProcessingDone && (
                        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
                            <h2 className="text-xl font-semibold mb-4 text-gray-900">3. Asetukset</h2>
                            <div className="space-y-8"> {/* Increased spacing */}

                                {/* --- Threshold Calculation Button & Slider --- */}
                                <div>
                                    {/* Button to trigger detailed calculation */}
                                    {!detailedThresholdsCalculated && (
                                        <button
                                            onClick={calculateDetailedThresholds}
                                            disabled={isCalculatingThresholds || isProcessingImage || isApplyingChange} // Disable during any processing
                                            className={`mb-4 w-full sm:w-auto py-2 px-4 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed`}
                                        >
                                            {isCalculatingThresholds ? (
                                                <span className="flex items-center justify-center">
                                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Lasketaan...
                                                </span>
                                            ) : (
                                                'Tarkenna vanteen tunnistusta' // Shorter text maybe?
                                            )}
                                        </button>
                                    )}
                                    {detailedThresholdsCalculated && !showThresholdSlider && !isCalculatingThresholds && (
                                        <p className="text-sm text-green-600 mb-4">Tarkemmat asetukset laskettu.</p> // Optional feedback
                                    )}

                                    {/* Slider Section - Show only after detailed calculation */}
                                    {showThresholdSlider && availableThresholds && (
                                        <div className="pt-4 border-t border-gray-100">
                                            <div className="mb-2 flex justify-between items-center">
                                                <label htmlFor="thresholdSlider" className="font-medium text-gray-700">Vanteen tunnistuksen tarkkuus:</label>
                                                <span className="text-sm text-gray-600">
                                                    {thresholdPercentages[currentThreshold] !== undefined
                                                        ? `Peittävyys: ${thresholdPercentages[currentThreshold].toFixed(1)}%`
                                                        : defaultMaskPercentage !== null && currentThreshold === 50
                                                        ? `Peittävyys: ${defaultMaskPercentage.toFixed(1)}%`
                                                        : ''}
                                                </span>
                                            </div>
                                            <input
                                                id="thresholdSlider"
                                                type="range"
                                                min="20" max="100" step="10"
                                                value={currentThreshold}
                                                onChange={(e) => handleThresholdChange(Number(e.target.value))}
                                                disabled={isApplyingChange || isCalculatingThresholds || isProcessingImage} // Disable during ANY processing
                                                className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-primary mb-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            />
                                            <div className="flex justify-between text-xs text-gray-500 px-1">
                                                <span>Enemmän vannetta</span>
                                                <span>Vähemmän rengasta</span>
                                            </div>
                                        </div>
                                    )}
                                </div> {/* End Threshold Section */}

                                {/* --- Color Picker & Intensity --- */}
                                <div className="pt-6 border-t border-gray-100">
                                     <h3 className="text-lg font-medium mb-4 text-gray-800">Vanteen väri</h3>
                                     {/* Preset Colors */}
                                     <div className="flex flex-wrap gap-3 mb-6">
                                         {presetColors.map((preset) => (
                                             <button
                                                 key={preset.value}
                                                 onClick={() => handleColorButtonClick(preset.value)}
                                                 disabled={isApplyingChange || isCalculatingThresholds || isProcessingImage} // Disable during ANY processing
                                                 className={`w-10 h-10 rounded-full border border-gray-200 transition-transform shadow-sm hover:scale-110 ${color === preset.value ? 'scale-110 ring-2 ring-offset-2 ring-primary' : ''} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                                                 style={preset.value === 'transparent' ? { /* ... transparent style ... */ } : { backgroundColor: preset.value }}
                                                 title={preset.name}
                                             />
                                         ))}
                                     </div>
                                     {/* Color Input */}
                                      <div className="flex items-center gap-3 mb-6">
                                         <input
                                             type="color"
                                             value={color}
                                             onChange={(e) => handleColorInputChange(e.target.value)}
                                             disabled={isApplyingChange || isCalculatingThresholds || isProcessingImage} // Disable during ANY processing
                                             className="flex-shrink-0 h-10 w-10 p-0.5 rounded border border-gray-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" // Added flex-shrink-0
                                         />
                                         <input
                                             type="text"
                                             value={color}
                                             onChange={(e) => handleColorInputChange(e.target.value)}
                                             disabled={isApplyingChange || isCalculatingThresholds || isProcessingImage} // Disable during ANY processing
                                             className="border border-gray-300 p-2 rounded-md shadow-sm flex-grow disabled:opacity-50 disabled:cursor-not-allowed text-sm" // Added shadow, text-sm
                                             placeholder="#RRGGBB"
                                         />
                                     </div>
                                     {/* Intensity Slider */}
                                     <div className="mt-4">
                                          <label htmlFor="intensitySliderUI" className="font-medium mb-3 block text-gray-700">
                                             Värin voimakkuus: <span className="font-normal text-gray-600">{colorIntensity}%</span>
                                         </label>
                                          <div className="relative py-2"> {/* Wrapper for better spacing */}
                                            {/* Actual Input */}
                                            <input
                                                type="range"
                                                id="intensitySlider"
                                                min="0" max="100" step="5"
                                                value={colorIntensity}
                                                onChange={handleIntensityChange}
                                                disabled={isApplyingChange || isCalculatingThresholds || isProcessingImage || color === 'transparent'} // Also disable if transparent
                                                className={`w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/50`}
                                             />
                                            {/* Optional: Add min/max labels if desired */}
                                            <div className="flex justify-between mt-1 text-xs text-gray-500 px-1">
                                               <span>Haalea</span>
                                               <span>Voimakas</span>
                                           </div>
                                          </div>
                                      </div>
                                 </div> {/* End Color Section */}

                                {/* --- Background Options --- */}
                                <div className="pt-6 border-t border-gray-100">
                                    <h3 className="text-lg font-medium mb-4 text-gray-800">Tausta</h3>
                                    {/* Remove Background Toggle */}
                                    <div className="mb-4">
                                        <label className={`flex items-center p-2 rounded transition-colors ${ !(isApplyingChange || isCalculatingThresholds || isProcessingImage || !carOnlyImageBitmap) ? 'hover:bg-gray-100 cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}>
                                             <input
                                                 type="checkbox"
                                                 checked={removeBackground}
                                                 onChange={handleRemoveBackgroundChange}
                                                 disabled={isApplyingChange || isCalculatingThresholds || isProcessingImage || !carOnlyImageBitmap} // Disable if car-only image isn't available or during processing
                                                className="mr-3 h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50"
                                            />
                                            <div>
                                                <span className="font-medium text-gray-700">Poista tausta</span>
                                                <p className="text-sm text-gray-500">Poistaa auton taustan ja jättää vain auton näkyviin (vaatii kuvantunnistuksen).</p>
                                            </div>
                                        </label>
                                    </div>
                                    {/* Background Selection Grid (Conditionally rendered by parent `removeBackground` state) */}
                                     {removeBackground && (
                                         <div className="mt-4 pt-4 border-t border-gray-100">
                                             <div className="flex justify-between items-center mb-3">
                                                 <p className="font-medium text-gray-700">Valitse tausta:</p>
                                                 <button
                                                     onClick={() => setIsBackgroundSectionOpen(!isBackgroundSectionOpen)}
                                                     // Disable button during any processing
                                                     disabled={isApplyingChange || isCalculatingThresholds || isProcessingImage}
                                                     className="text-sm text-primary hover:underline flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                                 >
                                                    {/* ... show/hide text and icons ... */}
                                                    {isBackgroundSectionOpen ? 'Piilota' : 'Näytä'}
                                                    {/* Add appropriate arrow icon here */}
                                                 </button>
                                             </div>
                                            {/* Background Grid */}
                                             {isBackgroundSectionOpen && (
                                                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                                                    {/* Loading indicator for backgrounds */}
                                                     {availableBackgrounds.length === 0 && (
                                                         <div className="col-span-full p-3 text-center text-gray-500 text-sm">
                                                             {/* ... spinner ... */} Ladataan taustakuvia...
                                                         </div>
                                                     )}
                                                    {/* Background Buttons */}
                                                     {availableBackgrounds.map((bg, index) => (
                                                         <button
                                                             key={index}
                                                             onClick={() => applyBackground(bg.path)}
                                                             disabled={isApplyingChange || isCalculatingThresholds || isProcessingImage} // Disable during any processing
                                                             className={`relative overflow-hidden aspect-video rounded-md border-2 transition-all ${selectedBackground === bg.path ? 'border-primary ring-2 ring-primary/50 scale-105 shadow-md' : 'border-gray-200 hover:border-gray-400'} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:scale-100`}
                                                             title={bg.name}
                                                         >
                                                            {/* Image or No Background Placeholder */}
                                                             {bg.path ? (
                                                                 <Image src={bg.path} alt={bg.name} fill sizes="(max-width: 640px) 50vw, 33vw" className="object-cover"/>
                                                             ) : (
                                                                 <div className="h-full w-full bg-gray-200 flex items-center justify-center" title="Ei taustaa">
                                                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                     </svg>
                                                                 </div>
                                                             )}
                                                         </button>
                                                     ))}
                                                 </div>
                                             )}
                                         </div>
                                     )}
                                </div> {/* End Background Section */}

                            </div> {/* End Options Inner Wrapper */}
                        </div> // End Options Section Wrapper
                    )} {/* End isInitialProcessingDone condition */}

                </div> {/* End max-w-3xl */}
            </div> {/* End Main Content Card */}

            {/* Quote Request Button */}
            {isInitialProcessingDone && resultImage && (
                <div className="bg-white p-6 rounded-lg shadow-sm mb-6 text-center">
                    <button
                        onClick={handleOpenQuoteModal}
                        disabled={isProcessingImage || isApplyingChange || isCalculatingThresholds || isSubmittingQuote}
                        className="py-3 px-8 rounded-lg font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    >
                        Haluan maalauksen näillä asetuksilla
                    </button>
                </div>
            )}

            {/* Quote Modal */}
            {isQuoteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-lg shadow-xl p-6 md:p-8 max-w-lg w-full relative">
                        {/* Close Button */}
                        <button
                            onClick={handleCloseQuoteModal}
                            disabled={isSubmittingQuote}
                            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                            aria-label="Sulje"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <h2 className="text-2xl font-semibold mb-6 text-gray-800 text-center">Lähetä Tarjouspyyntö</h2>

                        {quoteSubmissionStatus === 'success' ? (
                            <div className="text-center py-8">
                                <svg className="mx-auto h-12 w-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                <h3 className="text-xl font-medium mt-4 mb-2 text-gray-700">Kiitos pyynnöstäsi!</h3>
                                <p className="text-gray-600">Olemme vastaanottaneet tietosi ja otamme sinuun pian yhteyttä.</p>
                                <button
                                    onClick={handleCloseQuoteModal}
                                    className="mt-6 py-2 px-5 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                                >
                                    Sulje
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleQuoteSubmit} className="space-y-5">
                                {/* Form Fields */}
                                <div>
                                    <label htmlFor="quoteName" className="block text-sm font-medium text-gray-700 mb-1">
                                        Nimi *
                                    </label>
                                    <input
                                        type="text"
                                        id="quoteName"
                                        value={quoteName}
                                        onChange={(e) => setQuoteName(e.target.value)}
                                        required
                                        disabled={isSubmittingQuote}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary disabled:opacity-60"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="quotePhone" className="block text-sm font-medium text-gray-700 mb-1">
                                        Puhelinnumero *
                                    </label>
                                    <input
                                        type="tel"
                                        id="quotePhone"
                                        value={quotePhone}
                                        onChange={(e) => setQuotePhone(e.target.value)}
                                        required
                                        disabled={isSubmittingQuote}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary disabled:opacity-60"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="quoteEmail" className="block text-sm font-medium text-gray-700 mb-1">
                                        Sähköposti *
                                    </label>
                                    <input
                                        type="email"
                                        id="quoteEmail"
                                        value={quoteEmail}
                                        onChange={(e) => setQuoteEmail(e.target.value)}
                                        required
                                        disabled={isSubmittingQuote}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary disabled:opacity-60"
                                    />
                                </div>

                                {/* Contact Preference */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Haluan yhteydenoton:
                                    </label>
                                    <div className="flex gap-6">
                                        <label className="inline-flex items-center">
                                            <input
                                                type="radio"
                                                name="preference"
                                                value="email"
                                                checked={quotePreference === 'email'}
                                                onChange={() => setQuotePreference('email')}
                                                disabled={isSubmittingQuote}
                                                className="form-radio h-4 w-4 text-primary focus:ring-primary disabled:opacity-60"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">Sähköpostitse</span>
                                        </label>
                                        <label className="inline-flex items-center">
                                            <input
                                                type="radio"
                                                name="preference"
                                                value="call"
                                                checked={quotePreference === 'call'}
                                                onChange={() => setQuotePreference('call')}
                                                disabled={isSubmittingQuote}
                                                className="form-radio h-4 w-4 text-primary focus:ring-primary disabled:opacity-60"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">Puhelimitse</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Submission Error Message */}
                                {quoteSubmissionStatus === 'error' && quoteError && (
                                    <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
                                        <strong>Virhe:</strong> {quoteError}
                                    </div>
                                )}

                                {/* Submit Button */}
                                <div className="pt-4 text-center">
                                    <button
                                        type="submit"
                                        disabled={isSubmittingQuote}
                                        className="w-full sm:w-auto py-2.5 px-8 rounded-lg font-medium text-white bg-primary hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center mx-auto"
                                    >
                                        {isSubmittingQuote ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Lähetetään...
                                            </>
                                        ) : (
                                            'Lähetä tarjouspyyntö'
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Static Contact Section */}
            <div className="bg-primary-900 p-6 rounded-lg shadow-sm text-center text-white">
                <h2 className="text-xl font-semibold mb-3">Kiinnostuitko vanteiden maalauksesta?</h2>
                <p className="mb-4">Ota yhteyttä ja pyydä tarjous vanteidesi maalauksesta!</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    {/* Tel Link */}
                    <a href="tel:0440778896" className="py-3 px-6 rounded-lg bg-white text-primary-900 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-900 flex items-center justify-center gap-2 font-medium transition-colors">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        Soita: 0440 778896
                    </a>
                    {/* Mail Link */}
                    <a href="mailto:maalausasema@131.fi" className="py-3 px-6 rounded-lg bg-white text-primary-900 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-900 flex items-center justify-center gap-2 font-medium transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        Lähetä sähköpostia
                    </a>
                </div>
            </div> {/* End Contact Section */}

        </div> {/* End Container */}
    </div> /* End Outer div */
);


}


