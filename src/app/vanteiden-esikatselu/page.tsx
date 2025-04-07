// src/app/vanteiden-esikatselu/page.tsx
'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { generateColorizedLayer } from '@/utils/colorUtils';

// Define Navbar height (tailwind h-12 = 3rem = 48px)
const NAVBAR_HEIGHT_PX = 48;
// Define mobile breakpoint (tailwind md = 768px)
const MOBILE_BREAKPOINT_PX = 768;

export default function VanteidenEsikatselu() {
const resultImageRef = useRef<string | null>(null);
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

// --- Threshold State Variables ---
const [availableThresholds, setAvailableThresholds] = useState<{ [key: string]: any } | null>(null); // Populated on 2nd req
const [currentThreshold, setCurrentThreshold] = useState<number>(50); // Default, used by slider later
const [thresholdPercentages, setThresholdPercentages] = useState<{ [key: string]: number }>({}); // Populated on 2nd req
const [detailedThresholdsCalculated, setDetailedThresholdsCalculated] = useState(false);
const [showThresholdSlider, setShowThresholdSlider] = useState(false);
const [isCalculatingThresholds, setIsCalculatingThresholds] = useState(false); // For second API call
const [defaultMaskPercentage, setDefaultMaskPercentage] = useState<number | null>(null); // Store initial percentage

// --- Background State Variables ---
const [selectedBackground, setSelectedBackground] = useState<string | null>(null);
const [availableBackgrounds, setAvailableBackgrounds] = useState<{ name: string, path: string | null }[]>([]);
const [isBackgroundSectionOpen, setIsBackgroundSectionOpen] = useState(false);

// --- Quote Modal State ---
const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
const [quoteName, setQuoteName] = useState('');
const [quotePhone, setQuotePhone] = useState('');
const [quoteEmail, setQuoteEmail] = useState('');
const [quoteMessage, setQuoteMessage] = useState('');
const [quotePreference, setQuotePreference] = useState<'call' | 'email'>('email');
const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);
const [quoteSubmissionStatus, setQuoteSubmissionStatus] = useState<'idle' | 'success' | 'error'>('idle');
const [quoteError, setQuoteError] = useState<string | null>(null);

// --- Sticky Image State ---
const previewAreaRef = useRef<HTMLDivElement>(null);
const [isSticky, setIsSticky] = useState(false);
const [showStickyImage, setShowStickyImage] = useState(true);
const [isStickyCheckActive, setIsStickyCheckActive] = useState(false); // Controls if observer logic is active

// Effect to activate sticky check AFTER initial processing and layout stabilization
useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isInitialProcessingDone && resultImage) {
        console.log("Scheduling sticky check activation...");
        timer = setTimeout(() => {
            setIsStickyCheckActive(true);
            console.log("Sticky check ACTIVATED.");
        }, 350); // Allow time for layout to stabilize
    } else {
        setIsStickyCheckActive(current => {
            if (current) {
                console.log("Sticky check DEACTIVATED.");
                return false;
            }
            return current;
        });
        setIsSticky(current => {
            if (current) return false;
            return current;
        });
    }

    return () => {
        if (timer) {
            clearTimeout(timer);
            console.log("Cleared sticky activation timer.");
        }
    };
}, [isInitialProcessingDone, resultImage]);

// Memoize the result preview image
const resultPreview = useMemo(() => {
    if (!resultImage) return null;
    return (
        <Image
            src={resultImage}
            alt="Kuva maalatuilla vanteilla"
            fill
            className="object-contain"
            unoptimized
        />
    );
}, [resultImage]);

// --- Intersection Observer for Sticky ---
useEffect(() => {
    // EXIT EARLY if sticky check is not active OR other conditions aren't met
    if (!isStickyCheckActive || !previewAreaRef.current) {
        setIsSticky(current => {
            if (current) {
                console.log("[STICKY] Setting sticky to FALSE (check not active or ref missing)");
                return false;
            }
            return current;
        });
        return; // Stop setup
    }

    console.log("[STICKY] Setting up Intersection Observer (Sticky check active).");

    let debounceTimer: NodeJS.Timeout | null = null;
    let isProcessingSticky = false; // Guard against overlapping updates
    const targetElement = previewAreaRef.current;

    const observer = new IntersectionObserver(
        ([entry]) => {
            const isMobile = window.innerWidth < MOBILE_BREAKPOINT_PX;
            if (debounceTimer) clearTimeout(debounceTimer);

            // Only queue update if not already processing
            if (!isProcessingSticky) {
                debounceTimer = setTimeout(async () => {
                    isProcessingSticky = true;
                    console.log("[STICKY] Processing sticky state update...");

                    // Re-check conditions
                    if (!isStickyCheckActive || !previewAreaRef.current) {
                        console.log("[STICKY] Check deactivated or ref lost during debounce");
                        setIsSticky(false);
                        isProcessingSticky = false;
                        return;
                    }

                    const shouldBeSticky =
                        isMobile &&
                        !entry.isIntersecting &&
                        entry.boundingClientRect.top < NAVBAR_HEIGHT_PX;

                    // Only update if changed
                    setIsSticky(currentStickyState => {
                        const shouldUpdate = currentStickyState !== shouldBeSticky;
                        if (shouldUpdate) {
                            console.log(`[STICKY] Updating sticky state: ${shouldBeSticky}`);
                        }
                        return shouldUpdate ? shouldBeSticky : currentStickyState;
                    });

                    // Add delay before allowing next update
                    await new Promise(resolve => setTimeout(resolve, 50));
                    isProcessingSticky = false;
                }, 250); // Increased debounce time
            } else {
                console.log("[STICKY] Skipping update - already processing");
            }
        },
        {
            root: null,
            threshold: 0,
            rootMargin: `-${NAVBAR_HEIGHT_PX + 1}px 0px 0px 0px`
        }
    );

    observer.observe(targetElement);

    // Initial state check
    if (previewAreaRef.current) {
        const rect = previewAreaRef.current.getBoundingClientRect();
        const isMobile = window.innerWidth < MOBILE_BREAKPOINT_PX;
        const shouldBeStickyInitially = isMobile && rect.top < NAVBAR_HEIGHT_PX;

        setIsSticky(currentStickyState => {
            const shouldUpdate = currentStickyState !== shouldBeStickyInitially;
            if (shouldUpdate) {
                console.log(`[STICKY] Setting initial sticky state: ${shouldBeStickyInitially}`);
            }
            return shouldUpdate ? shouldBeStickyInitially : currentStickyState;
        });
    }

    return () => {
        console.log("[STICKY] Disconnecting Intersection Observer");
        if (targetElement) observer.unobserve(targetElement);
        if (debounceTimer) clearTimeout(debounceTimer);
    };
}, [isStickyCheckActive]);


// --- Existing functions (handleImageUpload, processImage, etc.) ---
// No changes needed in most functions, only adding the refs and state

// Quote Modal Handler Functions
const handleOpenQuoteModal = () => {
    if (!resultImage) {
        alert("Viimeistele vanteen esikatselu ennen tarjouspyynnön lähettämistä.");
        return;
    }
    setQuoteName('');
    setQuotePhone('');
    setQuoteEmail('');
    setQuoteMessage('');
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

// Helper function to convert Blob URL to Base64 Data URL
const blobUrlToBase64 = async (blobUrl: string): Promise<string> => {
    const response = await fetch(blobUrl);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error('Failed to read blob as Data URL.'));
            }
        };
        reader.onerror = () => reject(new Error('FileReader error'));
        reader.readAsDataURL(blob);
    });
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
        let resultImageForPayload = resultImage;
        if (resultImage.startsWith('blob:')) {
            console.log("Converting blob URL to Base64 for submission...");
            try {
                resultImageForPayload = await blobUrlToBase64(resultImage);
                console.log("Blob URL converted successfully.");
            } catch (conversionError) {
                console.error("Error converting blob URL to Base64:", conversionError);
                throw new Error("Esikatselukuvan valmistelu epäonnistui.");
            }
        } else if (!resultImage.startsWith('data:image/png;base64,')) {
            console.warn("resultImage is neither a blob URL nor a base64 PNG data URL:", resultImage.substring(0, 50) + "...");
            // Consider if you *need* to block submission here or just send what you have
            // throw new Error("Esikatselukuvan formaatti ei kelpaa lähetykseen.");
        }

        const payload = {
            name: quoteName,
            phone: quotePhone,
            email: quoteEmail,
            message: quoteMessage,
            preference: quotePreference,
            resultImage: resultImageForPayload,
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
        } else {
             throw new Error("Invalid background data received");
        }
    } catch (error) {
        console.error('Failed to fetch backgrounds:', error);
        setAvailableBackgrounds([
            { name: 'Ei taustaa', path: null },
            // Add fallback paths if you have them locally
            // { name: 'Tausta 1', path: '/images/taustat/tausta1.png' },
            // { name: 'Tausta 2', path: '/images/taustat/tausta2.png' }
        ]);
    }
};

// Fetch backgrounds when needed
useEffect(() => {
    if (isInitialProcessingDone && removeBackground && carOnlyImageBitmap) { // Only fetch if BG removal is possible
        fetchAvailableBackgrounds();
    } else {
        setAvailableBackgrounds([{ name: 'Ei taustaa', path: null }]); // Reset if BG removal off/failed
    }
}, [isInitialProcessingDone, removeBackground, carOnlyImageBitmap]);

// Get initial image dimensions for canvas operations.
useEffect(() => {
    if (image) {
        const img = new window.Image();
        img.onload = () => {
            setOriginalImageDimensions({ width: img.width, height: img.height });
        };
        img.onerror = () => {
            console.error("Failed to load image for dimensions check:", image.substring(0,100));
            setOriginalImageDimensions(null); // Reset on error
        }
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

// Client-side image resizing function
const resizeImageBeforeUpload = async (
    file: File,
    maxWidth: number = 1920,
    maxHeight: number = 1920,
    quality: number = 0.85
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new window.Image();
            img.onload = () => {
                let { width, height } = img;

                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                    console.log(`Resizing image to ${width}x${height}`);
                } else {
                    console.log(`Image already within limits (${width}x${height})`);
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                if (typeof reader.result === 'string') {
                                    console.log(`Resized image blob size: ${Math.round(blob.size / 1024)} KB`);
                                    resolve(reader.result);
                                } else {
                                    reject(new Error('Failed to convert blob to data URL'));
                                }
                            };
                            reader.readAsDataURL(blob);
                        } else {
                            reject(new Error('Canvas to Blob conversion failed'));
                        }
                    },
                    'image/jpeg', // Output resized as JPEG
                    quality
                );
            };
            img.onerror = reject;
            if (e.target?.result) {
                img.src = e.target.result as string;
            } else {
                reject(new Error('Failed to read file'));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        try {
            const file = e.target.files[0];
            const resizedImageDataUrl = await resizeImageBeforeUpload(file);

            // Reset ALL states
            setImage(resizedImageDataUrl);
            setIsProcessingImage(false);
            setIsCalculatingThresholds(false);
            setIsApplyingChange(false);
            setIsInitialProcessingDone(false); // This triggers our stabilization effect
            setIsStickyCheckActive(false); // Explicitly deactivate sticky check immediately
            setIsSticky(false); // Ensure sticky state is also reset
            if (resultImageRef.current) URL.revokeObjectURL(resultImageRef.current);
            setResultImage(null);
            setColor('#ff0000');
            setColorIntensity(100);
            setRemoveBackground(true);

            // Reset threshold-related states
            setAvailableThresholds(null);
            setCurrentThreshold(50);
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
            setAvailableBackgrounds([{ name: 'Ei taustaa', path: null }]); // Reset backgrounds

            // Sticky state
            setIsSticky(false);
            setShowStickyImage(true); // Re-enable sticky view on new image upload

            // Reset file input value so onChange fires for the same file again
            e.target.value = '';

        } catch (error) {
            console.error('Error resizing image:', error);
            alert('Virhe kuvan käsittelyssä. Kokeile toista kuvaa tai tarkista tiedostomuoto.');
            e.target.value = ''; // Reset input on error too
        }
    }
};

const triggerFileInput = () => {
    fileInputRef.current?.click();
};


// Initial Image Processing
const processImage = async () => {
    if (!image || isProcessingImage || isInitialProcessingDone) return;

    setIsProcessingImage(true);
    // Reset states for a fresh run
    if (resultImageRef.current) URL.revokeObjectURL(resultImageRef.current);
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
    // Keep originalImageDimensions if already set
    setDefaultMaskPercentage(null);
    // Reset sticky states immediately
    setIsStickyCheckActive(false); // Ensure observer is inactive during processing
    setIsSticky(false);
    setIsInitialProcessingDone(false); // Reset before processing starts

    try {
        const initialColor = color; // Use currently selected color

        const imageBlob = await fetch(image).then((r) => r.blob());
        const formData = new FormData();
        // Ensure the filename has a common extension the server might expect
        const fileName = imageBlob.type === 'image/png' ? 'image.png' : 'image.jpg';
        formData.append('image', imageBlob, fileName);
        formData.append('removeBackground', removeBackground.toString());

        console.log("Sending initial processing request...");
        const response = await fetch('/api/process-image', {
            method: 'POST',
            body: formData,
        });

         if (!response.ok) {
             const errorText = await response.text();
             try {
                 const errorData = JSON.parse(errorText);
                 throw new Error(errorData.error || `Palvelinvirhe (${response.status}): ${response.statusText}`);
             } catch (parseError) {
                 // Limit length of raw text in error
                 const truncatedError = errorText.length > 300 ? errorText.substring(0, 300) + "..." : errorText;
                 throw new Error(truncatedError || `Palvelinvirhe (${response.status}): ${response.statusText}`);
             }
         }

        const data = await response.json();
        console.log("Initial processing response received"); // Avoid logging potentially large base64 data

         // Validate essential data exists before proceeding
         if (!data.originalImage || !data.rimMask) {
            throw new Error("Palvelimen vastaus puutteellinen: tarvittavia kuvatietoja puuttuu.");
         }
         if (removeBackground && !data.carImage) {
            console.warn("Taustanpoisto pyydetty, mutta auto-kuvaa ei saatu palvelimelta. Jatkuu ilman taustanpoistoa.");
            setRemoveBackground(false); // Force disable if car image missing
        }


        // Fetch and create bitmaps sequentially, handling potential errors
        let fetchedOriginalBlob: Blob | null = null;
        let fetchedCarBlob: Blob | null = null;
        let fetchedMaskBlob: Blob | null = null;

        try {
            fetchedOriginalBlob = await fetch(data.originalImage).then(r => r.blob());
            if (data.rimMask) fetchedMaskBlob = await fetch(data.rimMask).then(r => r.blob());
            if (removeBackground && data.carImage) fetchedCarBlob = await fetch(data.carImage).then(r => r.blob());
        } catch (fetchError) {
            console.error("Error fetching image blobs from data URLs:", fetchError);
            throw new Error(`Kuvan datan lataus epäonnistui. ${fetchError instanceof Error ? fetchError.message : ''}`);
        }

        if (!fetchedOriginalBlob || !fetchedMaskBlob) {
             throw new Error("Tarvittavien kuvien (alkuperäinen, maski) lataus epäonnistui.");
        }

         // Create bitmaps
        let createdBaseBitmap: ImageBitmap | null = null;
        let createdCarBitmap: ImageBitmap | null = null;
        let createdMaskBitmap: ImageBitmap | null = null;

        try {
            createdBaseBitmap = await createImageBitmap(fetchedOriginalBlob);
            setOriginalImageBitmap(createdBaseBitmap); // Set state
            // Use bitmap dimensions if original ones weren't set from initial load
            if (!originalImageDimensions) {
                 setOriginalImageDimensions({ width: createdBaseBitmap.width, height: createdBaseBitmap.height });
            }
             console.log("Created originalImageBitmap");

            createdMaskBitmap = await createImageBitmap(fetchedMaskBlob);
            setRimMaskBitmap(createdMaskBitmap); // Set state
             if (data.rimPercentage !== undefined) {
                 setDefaultMaskPercentage(data.rimPercentage);
             }
            console.log("Created rimMaskBitmap");

            if (fetchedCarBlob) {
                createdCarBitmap = await createImageBitmap(fetchedCarBlob);
                setCarOnlyImageBitmap(createdCarBitmap); // Set state
                console.log("Created carOnlyImageBitmap");
            }
         } catch (bitmapError) {
            console.error("Error creating ImageBitmaps:", bitmapError);
            if (!createdBaseBitmap || !createdMaskBitmap) throw new Error(`Kuvien esikäsittely epäonnistui. ${bitmapError instanceof Error ? bitmapError.message : ''}`);
            if (removeBackground && !createdCarBitmap) console.warn("Auton kuvan esikäsittely epäonnistui, taustanpoisto ei välttämättä toimi.");
        }


        // Determine base for display and apply initial color
         const baseDisplayBitmap = removeBackground && createdCarBitmap ? createdCarBitmap : createdBaseBitmap;
         if (!baseDisplayBitmap || !createdMaskBitmap) {
             throw new Error("Tarvittavia kuvatietoja puuttuu värin lisäämiseksi.");
        }
         const { width, height } = baseDisplayBitmap;

        const colorizedCanvas = await generateColorizedLayer(
            initialColor,
            colorIntensity,
            createdMaskBitmap,
            baseDisplayBitmap,
            width,
            height
        );

        // Composite final image
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
        alert(`Virhe kuvan prosessoinnissa: ${error instanceof Error ? error.message : String(error)}`);
        setIsInitialProcessingDone(false);
        if (resultImageRef.current) URL.revokeObjectURL(resultImageRef.current);
        setResultImage(null);
    } finally {
        setIsProcessingImage(false);
    }
};

// Calculate Detailed Thresholds
const calculateDetailedThresholds = async () => {
    if (!image || isCalculatingThresholds || detailedThresholdsCalculated) return;

    setIsCalculatingThresholds(true);
    setShowThresholdSlider(false); // Hide slider while calculating

    try {
        const imageBlob = await fetch(image).then((r) => r.blob());
        const formData = new FormData();
        const fileName = imageBlob.type === 'image/png' ? 'image.png' : 'image.jpg';
        formData.append('image', imageBlob, fileName);
        formData.append('calculateAllThresholds', 'true');

        console.log("Sending request for detailed thresholds...");
        const response = await fetch('/api/process-image', {
            method: 'POST',
            body: formData,
        });

         if (!response.ok) {
             const errorText = await response.text();
             try {
                 const errorData = JSON.parse(errorText);
                 throw new Error(errorData.error || `Palvelinvirhe (${response.status}): ${response.statusText}`);
             } catch (parseError) {
                 const truncatedError = errorText.length > 300 ? errorText.substring(0, 300) + "..." : errorText;
                 throw new Error(truncatedError || `Palvelinvirhe (${response.status}): ${response.statusText}`);
             }
         }

        const data = await response.json();
        console.log("Detailed thresholds response received");

        if (data.rimMasks) {
            setAvailableThresholds(data.rimMasks);

            const percentages: { [key: string]: number } = {};
            Object.keys(data.rimMasks).forEach(threshold => {
                percentages[threshold] = data.rimMasks[threshold].rimPercentage;
            });
            setThresholdPercentages(percentages);

            // Set the current mask to the default one initially
            const defaultThresholdKey = String(data.defaultThreshold || 50);
            if (data.rimMasks[defaultThresholdKey]?.rimMask) {
                try {
                    const maskBlob = await fetch(data.rimMasks[defaultThresholdKey].rimMask).then(r => r.blob());
                    const newMaskBitmap = await createImageBitmap(maskBlob);
                    setRimMaskBitmap(newMaskBitmap); // Update the main mask state
                    setCurrentThreshold(Number(defaultThresholdKey));
                } catch (maskError) {
                     console.error("Failed to load default mask after threshold calculation:", maskError);
                     // Keep the previous mask if loading the new default fails
                }
            }

            setDetailedThresholdsCalculated(true);
            setShowThresholdSlider(true);
        } else {
            throw new Error("Tarkempia maskitietoja ei saatu palvelimelta");
        }

    } catch (error) {
        console.error("Error calculating detailed thresholds:", error);
        alert(`Virhe tarkennusten laskennassa: ${error instanceof Error ? error.message : String(error)}`);
        setDetailedThresholdsCalculated(false);
        setShowThresholdSlider(false);
    } finally {
        setIsCalculatingThresholds(false);
    }
};


// Apply Color with Mask (uses current state)
const applyColorWithMask = useCallback(async (
    newColor: string,
    removeBgOverride?: boolean,
    newIntensity?: number,
    maskOverride?: ImageBitmap // Optional mask override
) => {
    const instanceId = Math.random().toString(36).substring(7);
    console.log(`[${instanceId}] applyColorWithMask START with color=${newColor}, intensity=${newIntensity}`);

    const maskToUse = maskOverride || rimMaskBitmap;
    const currentIntensity = newIntensity ?? colorIntensity;
    const currentRemoveBackground = removeBgOverride !== undefined ? removeBgOverride : removeBackground;

    if (!maskToUse || !originalImageDimensions || (!originalImageBitmap && !carOnlyImageBitmap)) {
        console.error(`[${instanceId}] applyColorWithMask GUARD CHECK FAILED:`, {
            hasMask: !!maskToUse,
            hasDimensions: !!originalImageDimensions,
            hasOriginal: !!originalImageBitmap,
            hasCarOnly: !!carOnlyImageBitmap
        });
        return;
    }

    const baseBitmap = currentRemoveBackground ? carOnlyImageBitmap : originalImageBitmap;
    if (!baseBitmap) {
        console.error(`[${instanceId}] applyColorWithMask BASE BITMAP MISSING`);
        return;
    }

    console.log(`[${instanceId}] applyColorWithMask Setting isApplyingChange=true`);
    setIsApplyingChange(true);

    try {
        const { width, height } = originalImageDimensions;
        console.log(`[${instanceId}] applyColorWithMask Generating colorized layer...`);

        const colorizedCanvas = await generateColorizedLayer(
            newColor,
            currentIntensity,
            maskToUse,
            baseBitmap,
            width,
            height
        );

        console.log(`[${instanceId}] applyColorWithMask Compositing final image...`);
        const mainCanvas = new OffscreenCanvas(width, height);
        const mainCtx = mainCanvas.getContext('2d');
        if (!mainCtx) throw new Error("Pääpiirtoalustan kontekstia ei saatu");

        mainCtx.drawImage(baseBitmap, 0, 0);
        mainCtx.drawImage(colorizedCanvas, 0, 0);

        const finalBlob = await mainCanvas.convertToBlob({ type: 'image/png' });
        if (resultImageRef.current) {
            console.log(`[${instanceId}] applyColorWithMask Revoking old URL...`);
            URL.revokeObjectURL(resultImageRef.current);
        }
        const newUrl = URL.createObjectURL(finalBlob);
        resultImageRef.current = newUrl;
        setResultImage(newUrl);
        console.log(`[${instanceId}] applyColorWithMask SUCCESS`);

    } catch (error) {
        console.error(`[${instanceId}] applyColorWithMask ERROR:`, error);
        alert(`Värin lisääminen epäonnistui: ${error instanceof Error ? error.message : ''}`);
    } finally {
        console.log(`[${instanceId}] applyColorWithMask FINALLY - Setting isApplyingChange=false`);
        setIsApplyingChange(false);
    }
}, [rimMaskBitmap, originalImageDimensions, originalImageBitmap, carOnlyImageBitmap, removeBackground, colorIntensity]);


// Apply Background with Color (uses current state)
const applyBackgroundWithColor = useCallback(async (
    backgroundPath: string | null,
    colorToApply: string,
    newIntensity?: number,
    maskOverride?: ImageBitmap
) => {
    const maskToUse = maskOverride || rimMaskBitmap;
     const currentIntensity = newIntensity ?? colorIntensity;

    if (!isInitialProcessingDone || !carOnlyImageBitmap || !maskToUse || !originalImageDimensions) {
         console.warn("Taustakuvan lisäämisen edellytykset eivät täyty.", { isInitialProcessingDone, carOnlyImageBitmap, maskToUse, originalImageDimensions });
         return;
     }

     setIsApplyingChange(true);

    try {
        const { width, height } = originalImageDimensions;

        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Pääpiirtoalustan kontekstia ei saatu");

        // 1. Background layer
        if (backgroundPath) {
            const backgroundImg = new window.Image();
            await new Promise<void>((resolve, reject) => {
                backgroundImg.onload = () => resolve();
                backgroundImg.onerror = (err) => reject(new Error(`Taustakuvan lataus epäonnistui: ${backgroundPath}. Error: ${err}`));
                backgroundImg.src = backgroundPath;
            });
            ctx.drawImage(backgroundImg, 0, 0, width, height);
        } else {
            ctx.clearRect(0, 0, width, height); // Transparent background
        }

        // 2. Car layer (already has transparency)
        ctx.drawImage(carOnlyImageBitmap, 0, 0);

        // 3. Colorized rims layer (using car image for shading)
         const colorizedCanvas = await generateColorizedLayer(
             colorToApply,
             currentIntensity,
             maskToUse,
             carOnlyImageBitmap, // Use car image for shading details
             width,
             height
         );
        ctx.drawImage(colorizedCanvas, 0, 0);

        // Final result
        const finalBlob = await canvas.convertToBlob({ type: 'image/png' });
        if (resultImageRef.current) URL.revokeObjectURL(resultImageRef.current);
        const newUrl = URL.createObjectURL(finalBlob);
        resultImageRef.current = newUrl;
        setResultImage(newUrl);

    } catch (error) {
        console.error("Virhe taustakuvan ja värin yhdistämisessä:", error);
        alert(`Taustakuvan lisääminen epäonnistui: ${error instanceof Error ? error.message : ''}`);
         // Consider reverting selectedBackground state if needed
    } finally {
        setIsApplyingChange(false);
    }
}, [isInitialProcessingDone, carOnlyImageBitmap, rimMaskBitmap, originalImageDimensions, colorIntensity]); // REMOVED resultImage


 // Handle Threshold Slider Change
const handleThresholdChange = useCallback(async (threshold: number) => {
    const instanceId = Math.random().toString(36).substring(7);
    console.log(`[THRESHOLD ${instanceId}] START threshold=${threshold}`);

    // Check busy state first
    if (isApplyingChange) {
        console.log(`[THRESHOLD ${instanceId}] BLOCKED - isApplyingChange=true`);
        return;
    }

    // Then check data requirements
    if (!detailedThresholdsCalculated || !availableThresholds || !availableThresholds[threshold]) {
        console.warn(`[THRESHOLD ${instanceId}] BLOCKED - Missing data:`, {
            detailedThresholdsCalculated,
            hasThresholds: !!availableThresholds,
            hasThresholdValue: availableThresholds?.[threshold]
        });
        return;
    }

    console.log(`[THRESHOLD ${instanceId}] Setting isApplyingChange=true`);
    setIsApplyingChange(true);
    setCurrentThreshold(threshold);

    try {
        // Validate mask URL exists
        const maskUrl = availableThresholds[threshold].rimMask;
        if (!maskUrl) throw new Error("Mask URL missing for threshold " + threshold);
        
        console.log(`[THRESHOLD ${instanceId}] Fetching mask...`);
        const maskBlob = await fetch(maskUrl).then(r => {
            if (!r.ok) throw new Error(`Failed to fetch mask: ${r.status} ${r.statusText}`);
            return r.blob();
        });

        console.log(`[THRESHOLD ${instanceId}] Creating bitmap...`);
        const newMaskBitmap = await createImageBitmap(maskBlob);
        setRimMaskBitmap(newMaskBitmap);

        console.log(`[THRESHOLD ${instanceId}] Applying visual changes...`);
        if (removeBackground && selectedBackground !== null) {
            await applyBackgroundWithColor(selectedBackground, color, colorIntensity, newMaskBitmap);
        } else {
            await applyColorWithMask(color, removeBackground, colorIntensity, newMaskBitmap);
        }
        console.log(`[THRESHOLD ${instanceId}] SUCCESS - Flag handled by apply* function`);

    } catch (error) {
        console.error(`[THRESHOLD ${instanceId}] ERROR:`, error);
        alert(`Vanteen peittävyyden muuttaminen epäonnistui: ${error instanceof Error ? error.message : 'Tuntematon virhe'}`);
        console.log(`[THRESHOLD ${instanceId}] Setting isApplyingChange=false after error`);
        setIsApplyingChange(false);
    }
    // No finally needed - apply* functions handle the flag on success
}, [
    detailedThresholdsCalculated,
    availableThresholds,
    isApplyingChange,
    removeBackground,
    selectedBackground,
    color,
    colorIntensity,
    applyBackgroundWithColor,
    applyColorWithMask
]);



// Color Change Handler
const changeColor = useCallback(async (newColor: string) => {
    if (!isInitialProcessingDone || !rimMaskBitmap || isApplyingChange || isCalculatingThresholds || isProcessingImage) {
         console.warn("Ei voida vaihtaa väriä: esikäsittely kesken, maski puuttuu tai ollaan kiireisiä.");
         return;
     }

    setColor(newColor); // Update state immediately for the color picker UI

    // Call the appropriate update function based on background state
    if (removeBackground && selectedBackground !== null) {
         if (!carOnlyImageBitmap) {
             console.error("Auto-kuvaa ei löydy taustan yhdistämiseen.");
             alert("Virhe: tarvittavia kuvatietoja puuttuu.");
             return;
         }
         await applyBackgroundWithColor(selectedBackground, newColor, colorIntensity);
    } else {
        // Check if base image (original or car) is available
        const baseAvailable = removeBackground ? carOnlyImageBitmap : originalImageBitmap;
         if (!baseAvailable) {
              console.error("Pohjakuvaa ei löydy värin lisäämiseen.");
              alert("Virhe: tarvittavia kuvatietoja puuttuu.");
              return;
          }
         await applyColorWithMask(newColor, removeBackground, colorIntensity);
    }
    // Note: setIsApplyingChange is handled within applyBackgroundWithColor/applyColorWithMask
}, [
    isInitialProcessingDone,
    rimMaskBitmap, // Used in guard clause
    isApplyingChange, // Used in guard clause
    isCalculatingThresholds, // Used in guard clause
    isProcessingImage, // Used in guard clause
    removeBackground, // Used to decide which apply function to call
    selectedBackground, // Used to decide which apply function to call
    colorIntensity, // Passed as argument to apply functions
    carOnlyImageBitmap, // Used for checks and by apply functions
    originalImageBitmap // Used for checks and by apply functions
]);

// Intensity Change Handler (Debounced)
const debouncedIntensityUpdate = useCallback(async (newIntensity: number) => {
    const instanceId = Math.random().toString(36).substring(7);

    // Still check busy states at call time, but they're not dependencies
    if (color === 'transparent' || !isInitialProcessingDone || !rimMaskBitmap || isApplyingChange || isCalculatingThresholds || isProcessingImage) {
        console.log(`[INTENSITY ${instanceId}] SKIPPED - intensity=${newIntensity}%, busy or preconditions not met`);
        return;
    }

    console.log(`[INTENSITY ${instanceId}] START - intensity=${newIntensity}%`);

    try {
        if (removeBackground && selectedBackground !== null) {
            if (!carOnlyImageBitmap) {
                throw new Error("Auton kuvaa ei löydy");
            }
            console.log(`[INTENSITY ${instanceId}] Applying background with color...`);
            await applyBackgroundWithColor(selectedBackground, color, newIntensity);
        } else {
            const baseAvailable = removeBackground ? carOnlyImageBitmap : originalImageBitmap;
            if (!baseAvailable) {
                throw new Error("Pohjakuvaa ei löydy");
            }
            console.log(`[INTENSITY ${instanceId}] Applying color with mask...`);
            await applyColorWithMask(color, removeBackground, newIntensity);
        }
        console.log(`[INTENSITY ${instanceId}] SUCCESS`);
    } catch (error) {
        console.error(`[INTENSITY ${instanceId}] ERROR:`, error);
        alert(`Värin voimakkuuden muuttaminen epäonnistui: ${error instanceof Error ? error.message : ''}`);
    }
}, [
    // Remove busy flags from dependencies to break the loop
    color,
    isInitialProcessingDone,
    rimMaskBitmap,
    removeBackground,
    selectedBackground,
    carOnlyImageBitmap,
    originalImageBitmap,
    applyBackgroundWithColor,
    applyColorWithMask
]);

// Debounce Effect for Intensity Slider
useEffect(() => {
    const handler = setTimeout(() => {
        // Only call update if initial processing is done and we have a mask
        if (isInitialProcessingDone && rimMaskBitmap) {
            debouncedIntensityUpdate(colorIntensity);
        }
    }, 150); // Adjust debounce delay (e.g., 150ms)

    return () => {
        clearTimeout(handler);
    };
}, [colorIntensity, debouncedIntensityUpdate, isInitialProcessingDone, rimMaskBitmap]); // Dependencies

const handleIntensityChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setColorIntensity(Number(event.target.value));
}, []);

const handleColorButtonClick = (newColor: string) => {
    if (isInitialProcessingDone) {
         changeColor(newColor); // changeColor handles busy checks
    } else {
        setColor(newColor); // Just update state if not processed yet
    }
};

const handleColorInputChange = (newColor: string) => {
    if (isInitialProcessingDone) {
        changeColor(newColor); // changeColor handles busy checks
    } else {
        setColor(newColor); // Just update state if not processed yet
    }
};


// Toggle Background Removal
const handleRemoveBackgroundChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const instanceId = Math.random().toString(36).substring(7);
    const newValue = e.target.checked;
    console.log(`[BG ${instanceId}] START - User wants removeBackground=${newValue}. Current state=${removeBackground}`);

    // Check all busy states first with detailed logging
    const busyStates = { isApplyingChange, isCalculatingThresholds, isProcessingImage };
    const isBusy = Object.values(busyStates).some(Boolean);

    if (isBusy) {
        console.warn(`[BG ${instanceId}] BLOCKED - Busy states:`, busyStates);
        // Prevent default and revert the checkbox visually immediately
        e.preventDefault();
        e.target.checked = !newValue;
        alert("Toinen kuvan käsittely on vielä kesken. Odota hetki.");
        return;
    }

    setIsApplyingChange(true);
    console.log(`[BG ${instanceId}] Set isApplyingChange=true`);

    try {
        // --- Crucial Check: Verify required bitmap for the NEW state ---
        const requiredBitmap = newValue ? carOnlyImageBitmap : originalImageBitmap;
        const requiredBitmapName = newValue ? 'carOnlyImageBitmap' : 'originalImageBitmap';

        console.log(`[BG ${instanceId}] Checking for required bitmap: ${requiredBitmapName}. Exists? ${!!requiredBitmap}`);

        if (!requiredBitmap) {
            // If the required bitmap is missing, we cannot proceed with the visual change.
            // Revert the state and the checkbox.
            console.error(`[BG ${instanceId}] Required bitmap '${requiredBitmapName}' is missing. Cannot change background state.`);
            alert(`Tarvittavaa kuvadataa (${newValue ? 'taustanpoistoa varten' : 'alkuperäistä taustaa varten'}) ei löytynyt. Toimintoa ei voi suorittaa.`);
            // Revert checkbox state visually
            e.target.checked = !newValue;
            throw new Error(`Required bitmap not available: ${requiredBitmapName}`); // Throw to prevent further execution
        }

        // --- State Update ---
        // Only update state *after* confirming the required bitmap exists
        console.log(`[BG ${instanceId}] Required bitmap exists. Setting removeBackground=${newValue}`);
        setRemoveBackground(newValue);

        // Reset background image selection if background removal is turned OFF,
        // or if it's turned ON (to ensure a clean slate before selecting a new background image)
        setSelectedBackground(null);
        setIsBackgroundSectionOpen(false); // Close the section regardless

        // --- Apply Visual Change ---
        // Only apply visual changes if initial processing is done
        if (isInitialProcessingDone) {
            console.log(`[BG ${instanceId}] Calling applyColorWithMask with explicit override removeBgOverride=${newValue}`);
            // Pass the 'newValue' explicitly as the override.
            // applyColorWithMask should prioritize this override over the component's potentially stale 'removeBackground' state.
            await applyColorWithMask(color, newValue, colorIntensity);
            console.log(`[BG ${instanceId}] applyColorWithMask completed.`);
        } else {
            console.log(`[BG ${instanceId}] Initial processing not done, only state updated.`);
        }

        console.log(`[BG ${instanceId}] Background change successful for newValue=${newValue}`);

    } catch (error) {
        console.error(`[BG ${instanceId}] ERROR during background change:`, error);
        // If an error occurred (e.g., missing bitmap), ensure the component state reflects the actual visual state
        setRemoveBackground(!newValue); // Revert state if an error stopped the process
        setSelectedBackground(null);
        alert(`Virhe taustan vaihdossa: ${error instanceof Error ? error.message : 'Tuntematon virhe'}`);
    } finally {
        // Ensure busy flag is reset regardless of success or failure
        console.log(`[BG ${instanceId}] FINALLY - Setting isApplyingChange=false`);
        setIsApplyingChange(false);
    }
}, [
    isApplyingChange,
    isCalculatingThresholds,
    isProcessingImage,
    isInitialProcessingDone,
    carOnlyImageBitmap,
    originalImageBitmap,
    processImage,
    changeColor,
    color
]);


 // Apply Background Image
 const applyBackground = async (backgroundPath: string | null) => {
    if (!isInitialProcessingDone || !carOnlyImageBitmap || !rimMaskBitmap || isApplyingChange) {
        console.warn("Ei voida lisätä taustaa, edellytykset eivät täyty tai ollaan kiireisiä.");
        return;
    }

    setSelectedBackground(backgroundPath); // Update state immediately

    // applyBackgroundWithColor handles setting isApplyingChange
    await applyBackgroundWithColor(backgroundPath, color, colorIntensity);
};


return (
    <div className="bg-primary-800"> {/* Outer div with the background color */}
         {/* --- Sticky Header --- */}
         {resultImage && (
            <div
                className={`fixed md:hidden left-0 right-0 bg-black bg-opacity-80 backdrop-blur-sm shadow-lg p-3 flex items-center justify-center transition-opacity duration-300 ease-in-out ${
                    isSticky && showStickyImage && isStickyCheckActive
                    ? 'opacity-100 z-40'
                    : 'opacity-0 -z-10 pointer-events-none'
                }`}
                style={{ top: `${NAVBAR_HEIGHT_PX}px` }}
            >
                {/* Image container */}
                <div className="w-32 h-24 relative overflow-hidden rounded">
                     <Image
                        src={resultImage}
                        alt="Sticky Preview"
                        fill
                        className="object-contain"
                        unoptimized
                    />
                </div>
                {/* Close button */}
                <button
                    onClick={() => setShowStickyImage(false)}
                    className="absolute top-2 right-2 text-white bg-gray-700 hover:bg-gray-600 rounded-full p-2 focus:outline-none focus:ring-1 focus:ring-white"
                    aria-label="Piilota esikatselu"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
         )}

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
                        {/* ... (upload input, button, thumbnail - no changes needed) ... */}
                          <div className="flex flex-col md:flex-row gap-4 items-stretch">
                            {/* File Input Area */}
                            <div className="flex-grow">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp" // Be more specific
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
                                <button
                                    onClick={triggerFileInput}
                                    disabled={isProcessingImage || isCalculatingThresholds || isApplyingChange}
                                    className="w-full h-full min-h-[80px] flex items-center justify-center gap-2 py-3 px-4 bg-white border-2 border-dashed border-gray-300 hover:border-primary rounded-lg text-gray-700 hover:text-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:border-gray-300"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h16m-8-8v16"/> {/* Changed icon slightly */}
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
                                            sizes="150px" // Provide a size hint for the small thumbnail
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Process Button */}
                            {image && !isInitialProcessingDone && (
                                <div className="md:w-1/4 flex-shrink-0">
                                    <button
                                        onClick={processImage}
                                        disabled={isProcessingImage}
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
                    <div ref={previewAreaRef} className="bg-white p-6 rounded-lg shadow-sm mb-6">
                        <h2 className="text-xl font-semibold mb-4 text-gray-900">
                            2. Esikatselu
                        </h2>
                        <div className={`relative h-[300px] md:h-[400px] bg-gray-100 rounded-lg overflow-hidden border border-gray-200 text-gray-500
                            ${isSticky && showStickyImage ? 'opacity-50 md:opacity-100' : ''} transition-opacity duration-300`}>
                            {!image ? (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-center px-4">Lataa kuva yllä.</p>
                                </div>
                            ) : !isInitialProcessingDone && !isProcessingImage && !resultImage ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center px-4">
                                        <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                                        </svg>
                                        <p className="mt-2 text-gray-400">Paina "Prosessoi Kuva".</p>
                                    </div>
                                </div>
                            ) : isProcessingImage && !isInitialProcessingDone ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <svg className="animate-spin mx-auto h-10 w-10 text-primary mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Käsitellään kuvaa...
                                    </div>
                                </div>
                            ) : resultImage ? (
                                resultPreview
                            ) : isInitialProcessingDone && !resultImage ? (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-red-500 text-center px-4">Käsittely epäonnistui tai tulosta ei löytynyt.</p>
                                </div>
                            ) : null}
                        </div>
                    </div> {/* End Step 2 */}


                    {/* Step 3: Options Section (Conditionally Rendered) */}
                    {isInitialProcessingDone && (
                         <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
                             {/* ... (All settings content - no changes needed inside) ... */}
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
                                                'Tarkenna vanteen tunnistusta'
                                            )}
                                        </button>
                                    )}
                                    {detailedThresholdsCalculated && !showThresholdSlider && !isCalculatingThresholds && (
                                        <p className="text-sm text-green-600 mb-4">Tarkemmat asetukset laskettu.</p> // Optional feedback
                                    )}

                                    {/* Slider Section */}
                                    {showThresholdSlider && availableThresholds && (
                                        <div className="pt-4 border-t border-gray-100">
                                            <div className="mb-2 flex justify-between items-center">
                                                <label htmlFor="thresholdSlider" className="font-medium text-gray-700">Vanteen tunnistuksen tarkkuus:</label>
                                                 <span className="text-sm text-gray-600">
                                                    {thresholdPercentages[currentThreshold] !== undefined
                                                        ? `Peittävyys: ${thresholdPercentages[currentThreshold].toFixed(1)}%`
                                                        : defaultMaskPercentage !== null && currentThreshold === 50 // Use default threshold of 50
                                                        ? `Peittävyys: ${defaultMaskPercentage.toFixed(1)}%` // Show initial if slider at default
                                                        : '' // Hide if not available
                                                    }
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
                                                 disabled={isApplyingChange || isCalculatingThresholds || isProcessingImage}
                                                 className={`w-10 h-10 rounded-full border border-gray-300 transition-transform shadow-sm hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50 ${color === preset.value ? 'ring-2 ring-primary' : 'ring-0'} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                                                 style={preset.value === 'transparent'
                                                     ? {
                                                           background: `repeating-conic-gradient(#e5e7eb 0% 25%, #ffffff 0% 50%) top left / 10px 10px` // Checkerboard
                                                       }
                                                     : { backgroundColor: preset.value }
                                                 }
                                                 title={preset.name}
                                              />
                                         ))}
                                     </div>
                                     {/* Color Input */}
                                      <div className="flex items-center gap-3 mb-6">
                                         <input
                                             type="color"
                                             value={color === 'transparent' ? '#ffffff' : color} // Show white if transparent
                                             onChange={(e) => handleColorInputChange(e.target.value)}
                                             disabled={isApplyingChange || isCalculatingThresholds || isProcessingImage || color === 'transparent'} // Disable picker if transparent selected
                                             className="flex-shrink-0 h-10 w-10 p-0.5 rounded border border-gray-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                         />
                                         <input
                                             type="text"
                                             value={color === 'transparent' ? 'Ei väriä' : color}
                                             onChange={(e) => handleColorInputChange(e.target.value)}
                                              disabled={isApplyingChange || isCalculatingThresholds || isProcessingImage}
                                             className="border border-gray-300 p-2 rounded-md shadow-sm flex-grow disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                             placeholder="#RRGGBB"
                                             readOnly={color === 'transparent'} // Make readonly if transparent
                                         />
                                     </div>
                                     {/* Intensity Slider */}
                                      <div className="mt-4">
                                          <label htmlFor="intensitySlider" className="font-medium mb-3 block text-gray-700">
                                             Värin voimakkuus: <span className="font-normal text-gray-600">{colorIntensity}%</span>
                                         </label>
                                          <div className="relative py-2">
                                              <input
                                                 type="range"
                                                 id="intensitySlider"
                                                 min="0" max="100" step="5"
                                                 value={colorIntensity}
                                                 onChange={handleIntensityChange}
                                                 disabled={isApplyingChange || isCalculatingThresholds || isProcessingImage || color === 'transparent'}
                                                 className={`w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/50`}
                                              />
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
                                         <label className={`flex items-center p-2 rounded transition-colors ${ !(isApplyingChange || isCalculatingThresholds || isProcessingImage || (!carOnlyImageBitmap && removeBackground)) ? 'hover:bg-gray-100 cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}>
                                              <input
                                                 type="checkbox"
                                                 checked={removeBackground}
                                                 onChange={handleRemoveBackgroundChange}
                                                  // Disable if busy OR if trying to enable but car bitmap failed during processing
                                                 disabled={isApplyingChange || isCalculatingThresholds || isProcessingImage || (!carOnlyImageBitmap && removeBackground)}
                                                 className="mr-3 h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50"
                                             />
                                             <div>
                                                 <span className="font-medium text-gray-700">Poista tausta</span>
                                                 <p className="text-sm text-gray-500">Poistaa auton taustan ja jättää vain auton näkyviin (vaatii kuvantunnistuksen).</p>
                                                 {/* Show warning if user tries to enable but car image failed */}
                                                 {!carOnlyImageBitmap && removeBackground && <span className="text-xs text-red-600">Taustanpoisto epäonnistui edellisessä käsittelyssä.</span>}
                                             </div>
                                         </label>
                                    </div>

                                     {/* Background Selection (Only show if removal enabled AND possible) */}
                                     {removeBackground && carOnlyImageBitmap && (
                                         <div className="mt-4 pt-4 border-t border-gray-100">
                                             <div className="flex justify-between items-center mb-3">
                                                 <p className="font-medium text-gray-700">Valitse tausta:</p>
                                                 <button
                                                     onClick={() => setIsBackgroundSectionOpen(!isBackgroundSectionOpen)}
                                                     disabled={isApplyingChange || isCalculatingThresholds || isProcessingImage}
                                                     className="text-sm text-primary hover:underline flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                                 >
                                                     {isBackgroundSectionOpen ? 'Piilota' : 'Näytä'}
                                                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${isBackgroundSectionOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                 </button>
                                             </div>

                                             {/* Background Grid */}
                                             {isBackgroundSectionOpen && (
                                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                                                      {/* Initial state or loading */}
                                                      {availableBackgrounds.length <= 1 && ( // Only shows "No background" initially
                                                          <div className="col-span-full p-3 text-center text-gray-500 text-sm">
                                                              Ladataan taustakuvia... {/* Or handle fetch error */}
                                                          </div>
                                                      )}
                                                      {/* Background Buttons */}
                                                      {availableBackgrounds.map((bg, index) => (
                                                          <button
                                                              key={index}
                                                              onClick={() => applyBackground(bg.path)}
                                                              disabled={isApplyingChange || isCalculatingThresholds || isProcessingImage}
                                                              className={`relative overflow-hidden aspect-video rounded-md border-2 transition-all ${selectedBackground === bg.path ? 'border-primary ring-2 ring-primary/50 scale-105 shadow-md' : 'border-gray-200 hover:border-gray-400'} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:scale-100`}
                                                              title={bg.name}
                                                          >
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
                 <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4"> {/* Increased z-index */}
                     {/* ... (Modal content - no changes needed) ... */}
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

                                <div>
                                    <label htmlFor="quoteMessage" className="block text-sm font-medium text-gray-700 mb-1">
                                        Vapaamuotoinen viesti (valinnainen)
                                    </label>
                                    <textarea
                                        id="quoteMessage"
                                        rows={3}
                                        value={quoteMessage}
                                        onChange={(e) => setQuoteMessage(e.target.value)}
                                        disabled={isSubmittingQuote}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary disabled:opacity-60"
                                        placeholder="Esim. lisätietoja vanteista, aikataulutoiveita..."
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
                 {/* ... (Static contact info - no changes needed) ... */}
                 <h2 className="text-xl font-semibold mb-3">Kiinnostuitko vanteiden maalauksesta?</h2>
                 <p className="mb-4">Ota yhteyttä ja pyydä tarjous vanteidesi maalauksesta!</p>
                 <div className="flex flex-col sm:flex-row gap-4 justify-center">
                     <a href="tel:0440778896" className="py-3 px-6 rounded-lg bg-white text-primary-900 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-900 flex items-center justify-center gap-2 font-medium transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                         Soita: 0440 778896
                     </a>
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

