'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

export default function VanteidenEsikatselu() {
    const [image, setImage] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [color, setColor] = useState('#ff0000'); // Initialize with red
    const [isProcessing, setIsProcessing] = useState(false);
    const [removeBackground, setRemoveBackground] = useState(true);
    const [isInitialProcessingDone, setIsInitialProcessingDone] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [originalImageDimensions, setOriginalImageDimensions] = useState<{ width: number, height: number } | null>(null);

    // Store ImageBitmaps to avoid unnecessary re-fetching
    const [originalImageBitmap, setOriginalImageBitmap] = useState<ImageBitmap | null>(null);
    const [rimMaskBitmap, setRimMaskBitmap] = useState<ImageBitmap | null>(null);
    const [carOnlyImageBitmap, setCarOnlyImageBitmap] = useState<ImageBitmap | null>(null);

    // Add states for threshold management
    const [availableThresholds, setAvailableThresholds] = useState<{ [key: string]: any } | null>(null);
    const [currentThreshold, setCurrentThreshold] = useState<number>(50); // Default threshold
    const [thresholdPercentages, setThresholdPercentages] = useState<{ [key: string]: number }>({});
    const [selectedBackground, setSelectedBackground] = useState<string | null>(null);
    const [availableBackgrounds, setAvailableBackgrounds] = useState<{name: string, path: string | null}[]>([]);
    const [isBackgroundSectionOpen, setIsBackgroundSectionOpen] = useState(false);

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
                    // Reset all state values to their initial defaults
                    setIsProcessing(false);
                    setIsInitialProcessingDone(false);
                    setResultImage(null);
                    setColor('#ff0000'); // Reset to red
                    setRemoveBackground(true);

                    // Reset threshold-related states
                    setAvailableThresholds(null);
                    setCurrentThreshold(50);
                    setThresholdPercentages({});

                    // Clear all image bitmaps
                    setOriginalImageBitmap(null);
                    setRimMaskBitmap(null);
                    setCarOnlyImageBitmap(null);

                    // Set the new image last
                    setImage(event.target.result as string);

                    // Clean up any object URLs to prevent memory leaks
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


    const processImage = async () => {
        if (!image || isProcessing) return;
    
        setIsProcessing(true);
    
        try {
            const initialColor = '#ff0000';
            setColor(initialColor); // Ensure color state is red
    
            const imageBlob = await fetch(image).then((r) => r.blob());
            const formData = new FormData();
            formData.append('image', imageBlob, 'image.jpg');
            formData.append('color', initialColor);
            formData.append('removeBackground', removeBackground.toString());
            formData.append('getMask', 'true');
    
            const response = await fetch('/api/process-image', {
                method: 'POST',
                body: formData,
            });
    
            if (!response.ok) {
                const errorText = await response.text();
                try {
                    const errorData = JSON.parse(errorText);
                    throw new Error(errorData.error || 'Palvelinvirhe');
                } catch (parseError) {
                    throw new Error(errorText || `Palvelinvirhe: ${response.status}`);
                }
            }
    
            const data = await response.json();
    
            let newMaskBitmap: ImageBitmap | null = null;
    
            if (data.rimMasks) {
                setAvailableThresholds(data.rimMasks);
    
                const percentages: { [key: string]: number } = {};
                Object.keys(data.rimMasks).forEach(threshold => {
                    percentages[threshold] = data.rimMasks[threshold].rimPercentage;
                });
                setThresholdPercentages(percentages);
    
                if (data.defaultThreshold) {
                    setCurrentThreshold(Number(data.defaultThreshold));
                }
    
                const defaultThreshold = data.defaultThreshold || "50";
                const maskUrl = data.rimMasks[defaultThreshold].rimMask;
                const maskBlob = await fetch(maskUrl).then(r => r.blob());
                newMaskBitmap = await createImageBitmap(maskBlob);
                setRimMaskBitmap(newMaskBitmap); // Store the mask bitmap
    
            } else if (data.rimMask) {
                // Backward compatibility
                const maskBlob = await fetch(data.rimMask).then(r => r.blob());
                newMaskBitmap = await createImageBitmap(maskBlob);
                setRimMaskBitmap(newMaskBitmap); // Store the mask bitmap
            }
    
            const resultImageBlob = await fetch(data.resultImage).then(r => r.blob());
            const loadedResultImageBitmap = await createImageBitmap(resultImageBlob);
    
    
            if (removeBackground) {
                setCarOnlyImageBitmap(loadedResultImageBitmap);
                if (!originalImageBitmap) {
                    const originalImageBlob = await fetch(image).then(r => r.blob());
                    setOriginalImageBitmap(await createImageBitmap(originalImageBlob));
                }
            } else {
                setOriginalImageBitmap(loadedResultImageBitmap);
            }

            if (resultImage) {
                URL.revokeObjectURL(resultImage);
            }

            // Set the color state first before any rendering
            setColor('#ff0000');

            // Make sure we have image dimensions before proceeding
            if (!originalImageDimensions && image) {
                const img = new window.Image();
                await new Promise<void>((resolve) => {
                    img.onload = () => {
                        setOriginalImageDimensions({ width: img.width, height: img.height });
                        resolve();
                    };
                    img.src = image;
                });
            }

            // Apply the color directly with the new bitmap, not relying on state updates
            if (newMaskBitmap) {
                try {
                    // Use the dimensions directly rather than from state
                    const dimensions = originalImageDimensions || {
                        width: loadedResultImageBitmap.width,
                        height: loadedResultImageBitmap.height
                    };
                    
                    // Direct application without relying on state variables
                    const mainCanvas = new OffscreenCanvas(dimensions.width, dimensions.height);
                    const mainCtx = mainCanvas.getContext('2d');
                    
                    // In processImage function:
                    if (mainCtx) {
                        // Determine which image to use as base
                        const baseImageBitmap = removeBackground ? loadedResultImageBitmap : (originalImageBitmap || loadedResultImageBitmap);
                        
                        // Draw base image
                        mainCtx.drawImage(baseImageBitmap, 0, 0);
                        
                        // Apply color (simplified version of your applyColorWithMask logic)
                        if (newMaskBitmap) {
                            // Create colored overlay - pass the base image as shading source
                            const colorCanvas = await createColorizedRim('#ff0000', newMaskBitmap, dimensions.width, dimensions.height, baseImageBitmap);
                            mainCtx.drawImage(colorCanvas, 0, 0);
                        }
                        
                        // Convert to blob and set result
                        const finalBlob = await mainCanvas.convertToBlob({ type: 'image/png' });
                        const finalDataURL = URL.createObjectURL(finalBlob);
                        setResultImage(finalDataURL);
                    }
                } catch (error) {
                    console.error("Error applying initial color:", error);
                    // Fallback to uncolored image
                    const resultImageURL = URL.createObjectURL(resultImageBlob);
                    setResultImage(resultImageURL);
                }
            } else {
                // If no mask bitmap, set the result image directly
                const resultImageURL = URL.createObjectURL(resultImageBlob);
                setResultImage(resultImageURL);
            }

            // Now that everything is ready, mark processing as done
            setIsInitialProcessingDone(true);
    
    
        } catch (error) {
            console.error("Error processing image:", error);
            alert('Error processing image. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const applyColorWithMask = async (newColor: string, maskBitmap: ImageBitmap, removeBackgroundOverride?: boolean) => {
        const currentRemoveBackground = removeBackgroundOverride !== undefined ?
            removeBackgroundOverride : removeBackground;
    
        if (!image || !maskBitmap || !originalImageDimensions ||
            (currentRemoveBackground && !carOnlyImageBitmap) ||
            (!currentRemoveBackground && !originalImageBitmap)) {
            console.error("Missing required data for color change.");
            return;
        }
    
        // Update color state
        setColor(newColor);
    
        try {
            const { width, height } = originalImageDimensions;
    
            // Step 1: Create the main canvas for our final output
            const mainCanvas = new OffscreenCanvas(width, height);
            const mainCtx = mainCanvas.getContext('2d');
            if (!mainCtx) throw new Error("Could not get 2D context for main canvas");
    
            // Draw the base image (with or without background)
            if (currentRemoveBackground) {
                mainCtx.drawImage(carOnlyImageBitmap!, 0, 0);
            } else {
                mainCtx.drawImage(originalImageBitmap!, 0, 0);
            }
    
            // If color is transparent, we don't need to apply color at all
            if (newColor !== 'transparent') {
                // Step 2: Create a canvas for the *processed* base image (not always the original)
                const baseCanvas = new OffscreenCanvas(width, height);
                const baseCtx = baseCanvas.getContext('2d');
                if (!baseCtx) throw new Error("Could not get 2D context for base canvas");
    
                // Draw the *same* base image we used on mainCanvas
                if (currentRemoveBackground) {
                    baseCtx.drawImage(carOnlyImageBitmap!, 0, 0);
                } else {
                    baseCtx.drawImage(originalImageBitmap!, 0, 0);
                }
    
    
                // Step 3: Create a buffer for the original wheel areas
                const wheelCanvas = new OffscreenCanvas(width, height);
                const wheelCtx = wheelCanvas.getContext('2d');
                if (!wheelCtx) throw new Error("Could not get 2D context for wheel canvas");
    
                // Step 4: Draw the *processed* base image to the wheel canvas
                wheelCtx.drawImage(baseCanvas, 0, 0); // Use baseCanvas, *not* originalCanvas
    
                // Step 5: Use rim mask as a clipping mask (Rest of the function remains the same)
                const maskCanvas = new OffscreenCanvas(width, height);
                const maskCtx = maskCanvas.getContext('2d');
                if (!maskCtx) throw new Error("Could not get 2D context for mask canvas");
                maskCtx.drawImage(maskBitmap, 0, 0);
                const maskData = maskCtx.getImageData(0, 0, width, height);
                const wheelData = wheelCtx.getImageData(0, 0, width, height);
                const colorizedData = new ImageData(width, height);
                const colorizedPixels = colorizedData.data;
                const r = parseInt(newColor.slice(1, 3), 16);
                const g = parseInt(newColor.slice(3, 5), 16);
                const b = parseInt(newColor.slice(5, 7), 16);
    
                for (let i = 0; i < maskData.data.length; i += 4) {
                    const maskIntensity = maskData.data[i];
                    if (maskIntensity > 0) {
                        const original = {
                            r: wheelData.data[i],
                            g: wheelData.data[i + 1],
                            b: wheelData.data[i + 2]
                        };
                        const luminosity = 0.299 * original.r + 0.587 * original.g + 0.114 * original.b;
                        const factor = luminosity / 255;
                        colorizedPixels[i] = Math.min(255, r * factor * 1.5);
                        colorizedPixels[i + 1] = Math.min(255, g * factor * 1.5);
                        colorizedPixels[i + 2] = Math.min(255, b * factor * 1.5);
                        colorizedPixels[i + 3] = maskIntensity;
                    } else {
                        colorizedPixels[i + 3] = 0;
                    }
                }
    
                const colorizedCanvas = new OffscreenCanvas(width, height);
                const colorizedCtx = colorizedCanvas.getContext('2d');
                if (!colorizedCtx) throw new Error("Could not get context for colorized canvas");
                colorizedCtx.putImageData(colorizedData, 0, 0);
                mainCtx.drawImage(colorizedCanvas, 0, 0);
            }
    
            const finalBlob = await mainCanvas.convertToBlob({ type: 'image/png' });
            const finalDataURL = URL.createObjectURL(finalBlob);
    
            if (resultImage) {
                URL.revokeObjectURL(resultImage);
            }
    
            setResultImage(finalDataURL);
        } catch (error) {
            console.error("Error applying color with mask:", error);
            throw error;
        }
    };

    const applyBackground = async (backgroundPath: string | null) => {
        if (!isInitialProcessingDone || !carOnlyImageBitmap || !rimMaskBitmap) {
            return;
        }
        
        setIsProcessing(true);
        setSelectedBackground(backgroundPath);
        
        try {
            // Use the current color from state
            await applyBackgroundWithColor(backgroundPath, color);
            
        } catch (error) {
            console.error("Error applying background:", error);
            alert('Virhe taustan käsittelyssä. Yritä uudelleen.');
        } finally {
            setIsProcessing(false);
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

    const handleThresholdChange = async (threshold: number) => {
        if (!isInitialProcessingDone || !availableThresholds || !availableThresholds[threshold]) {
            return;
        }

        setIsProcessing(true);

        // Update the state first
        setCurrentThreshold(threshold);

        try {
            // Get the new mask for this threshold
            const maskUrl = availableThresholds[threshold].rimMask;
            const maskBlob = await fetch(maskUrl).then(r => r.blob());
            const newMaskBitmap = await createImageBitmap(maskBlob);

            // First update the bitmap in state
            setRimMaskBitmap(newMaskBitmap);

            // Now apply the new color with the fresh mask directly, without using state
            // This way we don't need to wait for state updates
            await applyColorWithMask(color, newMaskBitmap);

        } catch (error) {
            console.error("Error changing threshold:", error);
            alert('Error changing rim coverage. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    // Then update the changeColor function to use this helper
    // Add new function to apply background with a specified color
    const applyBackgroundWithColor = async (backgroundPath: string | null, colorToApply: string) => {
        if (!isInitialProcessingDone || !carOnlyImageBitmap || !rimMaskBitmap) {
            return;
        }
        
        try {
            const { width, height } = originalImageDimensions!;
            
            // Create canvas for final output
            const canvas = new OffscreenCanvas(width, height);
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Could not get canvas context");
            
            if (!backgroundPath) {
                // Just show car with transparent background
                ctx.clearRect(0, 0, width, height);
                ctx.drawImage(carOnlyImageBitmap, 0, 0);
            } else {
                // Load and draw the background
                const backgroundImg = new window.Image();
                await new Promise((resolve, reject) => {
                    backgroundImg.onload = resolve;
                    backgroundImg.onerror = reject;
                    backgroundImg.src = backgroundPath;
                });
                
                // Draw background (scaled to fill)
                ctx.drawImage(backgroundImg, 0, 0, width, height);
                
                // Draw car with transparent background on top
                ctx.drawImage(carOnlyImageBitmap, 0, 0);
            }
            
            // Create the colored rim overlay using the passed color parameter
            const colorizedCanvas = await createColorizedRim(colorToApply, rimMaskBitmap, width, height);
            
            // Apply the colored rim on top
            ctx.drawImage(colorizedCanvas, 0, 0);
            
            // Generate result
            const finalBlob = await canvas.convertToBlob({ type: 'image/png' });
            
            // Clean up old URL
            if (resultImage) {
                URL.revokeObjectURL(resultImage);
            }
            
            // Set new result
            setResultImage(URL.createObjectURL(finalBlob));
            
        } catch (error) {
            console.error("Error applying background with color:", error);
            throw error;
        }
    };

    const changeColor = async (newColor: string, removeBackgroundOverride?: boolean) => {
        if (!rimMaskBitmap) {
            console.error("Missing rim mask bitmap");
            return;
        }

        // Set color state immediately for both immediate use and future reference
        const oldColor = color;
        setColor(newColor);
        
        setIsProcessing(true);
        try {
            const currentRemoveBackground = removeBackgroundOverride !== undefined ?
                removeBackgroundOverride : removeBackground;
                
            // If background removal is active and a background is selected
            if (currentRemoveBackground && selectedBackground !== null) {
                // Apply background with the NEW color (not from state which may not have updated yet)
                await applyBackgroundWithColor(selectedBackground, newColor);
            } else {
                // Standard color change without background
                await applyColorWithMask(newColor, rimMaskBitmap, removeBackgroundOverride);
            }
        } catch (error) {
            console.error("Error changing color:", error);
            alert('Error changing color. Please try again.');
            // Revert color state if there was an error
            setColor(oldColor);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleColorButtonClick = (newColor: string) => {
        if (isInitialProcessingDone) {
            changeColor(newColor);
        } else {
            // Just update the color state if not yet processed
            setColor(newColor);
        }
    };

    const handleColorInputChange = (newColor: string) => {
        if (isInitialProcessingDone) {
            changeColor(newColor);
        } else {
            // Just update the color state if not yet processed
            setColor(newColor);
        }
    };

    const handleRemoveBackgroundChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.checked;

        // Only proceed if initial processing is done
        if (isInitialProcessingDone) {
            setIsProcessing(true);

            try {
                // First update the state - this is important to do before calling changeColor
                setRemoveBackground(newValue);

                // Ensure we have the needed image data
                let needsProcessing = false;

                if (newValue && !carOnlyImageBitmap) {
                    // Need to get the car-only image
                    needsProcessing = true;
                } else if (!newValue && !originalImageBitmap) {
                    // Need to get the original image with background
                    needsProcessing = true;
                }

                if (needsProcessing) {
                    await processImage(); // This will update the appropriate bitmaps
                } else {
                    // We have all the images we need, just update the display with the right base
                    // Pass the new value explicitly to ensure it uses the updated state
                    await changeColor(color, newValue);
                }
            } catch (error) {
                console.error("Error toggling background removal:", error);
                alert('Error changing background settings. Please try again.');
                // Revert to previous state if there was an error
                setRemoveBackground(!newValue);
            } finally {
                setIsProcessing(false);
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

                <div className="bg-primary-50 p-8 rounded-xl shadow-sm mb-12">
                    <p className="text-lg mb-6 text-center">
                        Lataa kuva autostasi ja valitse haluamasi vanteen väri nähdäksesi, miltä
                        lopputulos voisi näyttää.
                    </p>

                    <div className="max-w-3xl mx-auto">
                        {/* Image Upload Section */}
                        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
                            <h2 className="text-xl font-semibold mb-4">1. Valitse kuva</h2>

                            <div className="flex flex-col md:flex-row gap-4">
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
                                        className="w-full h-full min-h-[80px] flex items-center justify-center gap-2 py-3 px-4 bg-white border-2 border-dashed border-gray-300 hover:border-primary rounded-lg text-gray-700 hover:text-primary transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        {image ? 'Vaihda kuva' : 'Lataa kuva autostasi'}
                                    </button>
                                </div>

                                {image && (
                                    <div className="md:w-1/3">
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

                                {/* Add Process Button directly into this section when image is available */}
                                {image && !isInitialProcessingDone && (
                                    <div className="md:w-1/3">
                                        <button
                                            onClick={processImage}
                                            disabled={isProcessing}
                                            className={`w-full h-full min-h-[80px] py-2 px-4 rounded-lg font-medium text-white transition-colors ${isProcessing
                                                ? 'bg-gray-400 cursor-not-allowed'
                                                : 'bg-primary hover:bg-primary-700'
                                                }`}
                                        >
                                            {isProcessing ? (
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
                        </div>

                        {/* Options Section - Only shown after initial processing */}
                        {isInitialProcessingDone && (
                            <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
                                <h2 className="text-xl font-semibold mb-4">2. Muokkaa asetuksia</h2>

                                <div className="space-y-6">
                                    {/* Rim Detection Coverage - Slider section */}
                                    {availableThresholds && Object.keys(availableThresholds).length > 0 && (
                                        <div>
                                            <div className="mb-2 flex justify-between items-center">
                                                <p className="font-medium">Vanteiden tunnistuksen tarkkuus:</p>
                                                <span className="text-sm text-gray-600">
                                                    {thresholdPercentages[currentThreshold]
                                                        ? `Peittävyys: ${thresholdPercentages[currentThreshold].toFixed(1)}%`
                                                        : ''}
                                                </span>
                                            </div>
                                            <input
                                                type="range"
                                                min="20"
                                                max="100"
                                                step="5"
                                                value={currentThreshold}
                                                onChange={(e) => handleThresholdChange(Number(e.target.value))}
                                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary mb-2"
                                            />
                                            <div className="flex justify-between text-sm text-gray-500 px-1">
                                                <span>Enemmän vannetta</span>
                                                <span>Vähemmän rengasta</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Result Section */}
                        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
                            <h2 className="text-xl font-semibold mb-4">{isInitialProcessingDone ? "3. Lopputulos" : "2. Lopputulos"}</h2>

                            {!resultImage && !image && (
                                <div className="h-[400px] flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                                    <p className="text-gray-400 text-center px-4">
                                        Lataa ensin kuva ja paina "Prosessoi Kuva" nähdäksesi lopputuloksen
                                    </p>
                                </div>
                            )}

                            {image && !resultImage && (
                                <div className="h-[400px] flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                                    <div className="text-gray-400 text-center px-4">
                                        <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                                        </svg>
                                        <p className="mt-2">Paina "Prosessoi Kuva" nähdäksesi lopputuloksen</p>
                                    </div>
                                </div>
                            )}

                            {resultImage && (
                                <div className="relative h-[400px] bg-gray-50 rounded-lg overflow-hidden">
                                    <Image
                                        src={resultImage}
                                        alt="Kuva maalatuilla vanteilla"
                                        fill
                                        className="object-contain"
                                        unoptimized
                                    />
                                </div>
                            )}
                        </div>

                        {/* Color selection moved below the preview */}
                        {isInitialProcessingDone && (
                            <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
                                <h2 className="text-xl font-semibold mb-4">4. Valitse vanteen väri</h2>

                                <div className="flex flex-wrap gap-3 mb-4">
                                    {presetColors.map((preset) => (
                                        <button
                                            key={preset.value}
                                            onClick={() => handleColorButtonClick(preset.value)}
                                            className={`w-10 h-10 rounded-full transition-transform shadow-sm hover:scale-110 ${color === preset.value ? 'scale-110 ring-2 ring-offset-2 ring-primary' : ''
                                                }`}
                                            style={preset.value === 'transparent' ?
                                                {
                                                    backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)',
                                                    backgroundSize: '8px 8px',
                                                    backgroundPosition: '0 0, 4px 4px'
                                                } :
                                                { backgroundColor: preset.value }}
                                            title={preset.name}
                                        />
                                    ))}
                                </div>

                                <div className="flex items-center gap-3 mt-4">
                                    <input
                                        type="color"
                                        value={color}
                                        onChange={(e) => handleColorInputChange(e.target.value)}
                                        className="h-10 w-10 p-1 rounded cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={color}
                                        onChange={(e) => handleColorInputChange(e.target.value)}
                                        className="border border-gray-300 p-2 rounded flex-grow"
                                        placeholder="#RRGGBB"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Background Options - Section 5 */}
                        {isInitialProcessingDone && (
                            <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
                                <h2 className="text-xl font-semibold mb-4">5. Taustan asetukset</h2>

                                {/* Background removal toggle */}
                                <div className="mb-4">
                                    <label className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={removeBackground}
                                            onChange={handleRemoveBackgroundChange}
                                            className="mr-3 h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                        <div>
                                            <span className="font-medium">Poista tausta</span>
                                            <p className="text-sm text-gray-500">Poistaa auton taustan ja jättää vain auton näkyviin</p>
                                        </div>
                                    </label>
                                </div>

                                {/* Background Selection Section - Only show if background removal is enabled */}
                                {removeBackground && (
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <div className="flex justify-between items-center">
                                            <p className="font-medium">Valitse tausta:</p>
                                            <button
                                                onClick={() => setIsBackgroundSectionOpen(!isBackgroundSectionOpen)}
                                                className="text-sm text-primary hover:underline flex items-center gap-1"
                                            >
                                                {isBackgroundSectionOpen ? (
                                                    <>
                                                        <span>Piilota</span>
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                        </svg>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>Näytä</span>
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        {isBackgroundSectionOpen && (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                                                {availableBackgrounds.length === 0 ? (
                                                    <div className="col-span-full p-3 text-center text-gray-500 text-sm">
                                                        <svg className="animate-spin inline-block mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Ladataan taustakuvia...
                                                    </div>
                                                ) : (
                                                    availableBackgrounds.map((bg, index) => (
                                                        <button
                                                            key={index}
                                                            onClick={() => applyBackground(bg.path)}
                                                            className={`relative overflow-hidden h-20 rounded-md border-2 transition-all ${selectedBackground === bg.path
                                                                ? 'border-primary scale-105 shadow-md'
                                                                : 'border-gray-200 hover:border-gray-300'
                                                                }`}
                                                            title={bg.name}
                                                        >
                                                            {bg.path ? (
                                                                <div className="relative w-full h-full">
                                                                    <Image
                                                                        src={bg.path}
                                                                        alt={bg.name}
                                                                        fill
                                                                        sizes="100px"
                                                                        className="object-cover"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="h-full w-full bg-gray-100 flex items-center justify-center">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                </div>
                                                            )}
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-primary-900 p-6 rounded-lg shadow-sm text-center text-white">
                    <h2 className="text-xl font-semibold mb-3">Kiinnostuitko vanteiden maalauksesta?</h2>
                    <p className="mb-4">Ota yhteyttä ja pyydä tarjous vanteidesi maalauksesta!</p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a
                            href="tel:0440778896"
                            className="btn bg-white text-primary-900 hover:bg-gray-100 flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            Soita: 0440 778896
                        </a>
                        <a
                            href="mailto:maalausasema@131.fi"
                            className="btn bg-white text-primary-900 hover:bg-gray-100 flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Lähetä sähköpostia
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}