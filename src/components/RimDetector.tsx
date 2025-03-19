'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface RimDetectorProps {
  className?: string;
}

export default function RimDetector({ className = '' }: RimDetectorProps) {
  const [image, setImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [debugImage, setDebugImage] = useState<string | null>(null); // You might not need this now
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [color, setColor] = useState('#ff0000'); // Store as hex
  const [removeBackground, setRemoveBackground] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingSteps] = useState([
    'Uploading image',
    'Detecting wheels',
    'Extracting rims',
    'Applying color',
    'Removing background'
  ]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    const file = acceptedFiles[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      setResultImage(null);
      setDebugImage(null); // Clear debug image
    };
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxFiles: 1
  });


  // Helper function to convert hex color to "r,g,b"
  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
  };

  const processImage = async () => {
    if (!image) return;
  
    setIsProcessing(true);
    setError(null);
    setResultImage(null);
  
    try {
      // Step 1: Prepare image
      setProcessingStep(processingSteps[0]);
  
      let imageBlob;
      if (image.startsWith('data:')) {
        const match = image.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) {
          throw new Error("Invalid data URL format");
        }
        const mime = match[1] || 'image/jpeg';
        const base64Data = match[2];
        const binaryData = atob(base64Data);
        const bytes = new Uint8Array(binaryData.length);
        for (let i = 0; i < binaryData.length; i++) {
          bytes[i] = binaryData.charCodeAt(i);
        }
        imageBlob = new Blob([bytes], { type: mime });
        console.log(`Created blob from data URL with MIME type: ${mime}`);
      } else {
        const response = await fetch(image);
        imageBlob = await response.blob();
        console.log(`Created blob from fetched URL with MIME type: ${imageBlob.type}`);
      }
  
      const formData = new FormData();
      formData.append('image', imageBlob, 'image.jpg');  // Use .jpg, API handles conversion
      formData.append('color', color);
      formData.append('removeBackground', removeBackground.toString());
  
      // Step 2: Send to API
      setProcessingStep(processingSteps[1]);
      console.log('Sending request to API...');
  
      const response = await fetch('/api/process-image', {
        method: 'POST',
        body: formData,
      });
  
      // Log detailed response information
      console.log('Response status:', response.status);
      console.log('Content type:', response.headers.get('content-type'));
      
      // Log headers individually
      response.headers.forEach((value, key) => {
        console.log(`Header ${key}:`, value);
      });

      if (!response.ok) {
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
          console.error('Parsed error response:', errorData);
        } catch (parseError) {
          errorMessage = errorText;
          console.error('Raw error response:', errorText);
          console.error('Parse error:', parseError);
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) {
        throw new Error(`Invalid response type: ${blob.type}. Expected image/*`);
      }
      console.log(`Received image blob: type=${blob.type}, size=${blob.size} bytes`);

      // Create a blob URL as fallback
      const blobUrl = URL.createObjectURL(blob);
  
      // Update steps (this part remains the same)
      const steps = [2, 3, 4];
      const updateInterval = 800;
      let stepPromise = Promise.resolve();
      for (const step of steps) {
        stepPromise = stepPromise.then(() => new Promise(resolve => {
          setTimeout(() => {
            setProcessingStep(processingSteps[step]);
            resolve(undefined);
          }, updateInterval);
        }));
      }
      await stepPromise;
  
      // Try setting image using data URL first
      try {
        const reader = new FileReader();
        const dataUrlPromise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            if (typeof reader.result === 'string' && reader.result.length > 0) {
              resolve(reader.result);
            } else {
              reject(new Error('Failed to convert blob to data URL'));
            }
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });

        // Set a timeout for the data URL conversion
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Data URL conversion timeout')), 5000);
        });

        const dataUrl = await Promise.race([dataUrlPromise, timeoutPromise]);
        setResultImage(dataUrl);
        console.log('Image set successfully using data URL');
      } catch (error) {
        console.warn('Data URL conversion failed, falling back to blob URL:', error);
        // Fallback to blob URL
        setResultImage(blobUrl);
        console.log('Image set successfully using blob URL');
      }

      // Cleanup function to revoke blob URL
      return () => {
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
        }
      };
  
    } catch (error) {
      // Detailed error logging
      console.error('Error processing image (full details):', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        type: error instanceof Error ? error.constructor.name : typeof error
      });

      // Set user-friendly error message
      let errorMessage = 'Error processing image';
      if (error instanceof Error) {
        if (error.message.includes('Invalid response type')) {
          errorMessage = 'Server returned an invalid image format. Please try again.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Image processing timed out. Please try again.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('Server error')) {
          errorMessage = `Server error: ${error.message}. Please try again later.`;
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      setResultImage(null);
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
      
      // Cleanup any blob URLs to prevent memory leaks
      const img = document.querySelector('img[alt="Car preview"]') as HTMLImageElement;
      if (img && img.src.startsWith('blob:')) {
        URL.revokeObjectURL(img.src);
      }
    }
  };



  return (
    <div className={`max-w-4xl mx-auto p-4 ${className}`}>
      <div className="space-y-6">
        {/* Upload Area */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p className="text-blue-500">Drop the image here...</p>
          ) : (
            <p>Drag & drop a car image here, or click to select one</p>
          )}
        </div>

        {/* Color Picker */}
        <div className="flex items-center gap-4">
          <label htmlFor="rimColor" className="font-medium">
            Rim Color:
          </label>
          <input
            type="color"
            id="rimColor"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-20"
          />
        </div>

        {/* Background Removal Toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="removeBackground"
            checked={removeBackground}
            onChange={(e) => setRemoveBackground(e.target.checked)}
            className="w-5 h-5"
          />
          <label htmlFor="removeBackground" className="font-medium">
            Remove Background
          </label>
        </div>

        {/* Preview & Result */}
        {(image) && ( // Only show if image is loaded
        <div className="space-y-4">
          <div className="border rounded-lg overflow-hidden">
            <img
                src={resultImage || image}  // Display resultImage if available, otherwise the original
                alt="Car preview"
                className="w-full h-auto"
            />
          </div>

          <button
              onClick={processImage}
              disabled={isProcessing}
              className={`w-full py-3 px-4 rounded-lg font-medium text-white
                ${isProcessing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600'
                }`}
            >
              {isProcessing ? 'Processing...' : `Detect & Colorize Rims${removeBackground ? ' (with Background Removal)' : ''}`}
            </button>
        </div>
    )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-lg">
            {error}
          </div>
        )}

        {/* Loading Overlay with Processing Steps */}
        {isProcessing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl text-center max-w-md w-full mx-4">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-6"></div>
              <h3 className="text-xl font-semibold mb-4">Processing Image</h3>
              <div className="space-y-3">
                {processingSteps.map((step, index) => (
                  <div
                    key={step}
                    className={`flex items-center justify-between px-4 py-2 rounded ${
                      processingStep === step
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : processingSteps.indexOf(processingStep) > index
                        ? 'bg-green-50 text-green-600'
                        : 'text-gray-400'
                    }`}
                  >
                    <span>{step}</span>
                    {processingSteps.indexOf(processingStep) > index && (
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                    {processingStep === step && (
                      <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}