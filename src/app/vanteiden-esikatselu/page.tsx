'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';

export default function VanteidenEsikatselu() {
  const [image, setImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [color, setColor] = useState('#ff0000');
  const [isProcessing, setIsProcessing] = useState(false);
  const [removeBackground, setRemoveBackground] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const presetColors = [
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
          setImage(event.target.result as string);
          setResultImage(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const processImage = async () => {
    if (!image) return;
    
    setIsProcessing(true);
    
    try {
      // Convert base64 string to file for FormData
      const imageBlob = await fetch(image).then(r => r.blob());
      const formData = new FormData();
      formData.append('image', imageBlob, 'image.jpg');
      formData.append('color', color);
      formData.append('removeBackground', removeBackground.toString());
      
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

      const resultBlob = await response.blob();
      setResultImage(URL.createObjectURL(resultBlob));
    } catch (error) {
      let userMessage = 'Virhe kuvan käsittelyssä. Yritä uudelleen.';
      if (error instanceof Error) {
        if (error.message.includes('Invalid response type')) {
          userMessage = 'Palvelin palautti virheellisen kuvaformaatin. Yritä uudelleen.';
        } else if (error.message.includes('Failed to convert')) {
          userMessage = 'Kuvan käsittely epäonnistui. Kokeile toista kuvaa.';
        } else if (error.message.includes('network')) {
          userMessage = 'Verkkovirhe. Tarkista yhteytesi ja yritä uudelleen.';
        } else if (error.message.includes('Server error')) {
          userMessage = `Palvelinvirhe: ${error.message}. Yritä myöhemmin uudelleen.`;
        }
      }
      alert(userMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <h1 className="text-4xl font-bold mb-8 text-center">Vanteiden Esikatselu</h1>
      
      <div className="bg-gray-50 p-8 rounded-xl shadow-sm mb-12">
        <p className="text-lg mb-6 text-center">
          Lataa kuva autostasi ja valitse haluamasi vanteen väri nähdäksesi, miltä
          lopputulos voisi näyttää. Työkalu tunnistaa vanteet kuvasta
          automaattisesti ja näyttää esikatselun maalatuista vanteista.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold mb-4">1. Valitse kuva</h2>
              
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload}
                className="hidden"
              />
              
              <button
                onClick={triggerFileInput}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white border-2 border-dashed border-gray-300 hover:border-primary rounded-lg text-gray-700 hover:text-primary transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {image ? 'Vaihda kuva' : 'Lataa kuva autostasi'}
              </button>
              
              {image && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-2">Esikatselu:</p>
                  <div className="relative h-40 rounded-lg overflow-hidden border border-gray-200">
                    <Image
                      src={image}
                      alt="Kuvan esikatselu"
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold mb-4">2. Valitse vanteen väri</h2>
              
              <div className="flex flex-wrap gap-3 mb-4">
                {presetColors.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => setColor(preset.value)}
                    className={`w-10 h-10 rounded-full transition-transform shadow-sm hover:scale-110 ${
                      color === preset.value ? 'scale-110 ring-2 ring-offset-2 ring-primary' : ''
                    }`}
                    style={{ backgroundColor: preset.value }}
                    title={preset.name}
                  />
                ))}
              </div>
              
              <div className="flex items-center gap-3 mt-4">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-10 p-1 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="border border-gray-300 p-2 rounded flex-grow"
                  placeholder="#RRGGBB"
                />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold mb-4">3. Lisäasetukset</h2>
              
              <label className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={removeBackground}
                  onChange={(e) => setRemoveBackground(e.target.checked)}
                  className="mr-3 h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div>
                  <span className="font-medium">Poista tausta</span>
                  <p className="text-sm text-gray-500">Poistaa auton taustan ja jättää vain auton näkyviin</p>
                </div>
              </label>
            </div>

            <button
              onClick={processImage}
              disabled={!image || isProcessing}
              className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
                !image || isProcessing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-primary hover:bg-primary-700'
              }`}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Käsitellään...
                </span>
              ) : 'Esikatsele vanteita'}
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">4. Lopputulos</h2>
            
            {!resultImage && !image && (
              <div className="h-full min-h-[400px] flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                <p className="text-gray-400 text-center px-4">
                  Lataa ensin kuva ja paina "Esikatsele vanteita" nähdäksesi lopputuloksen
                </p>
              </div>
            )}
            
            {image && !resultImage && (
              <div className="h-full min-h-[400px] flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                <div className="text-gray-400 text-center px-4">
                  <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                  </svg>
                  <p className="mt-2">Paina "Esikatsele vanteita" nähdäksesi lopputuloksen</p>
                </div>
              </div>
            )}
            
            {resultImage && (
              <div className="relative aspect-video bg-gray-50 rounded-lg overflow-hidden">
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
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm text-center">
        <h2 className="text-xl font-semibold mb-3">Kiinnostuitko vanteiden maalauksesta?</h2>
        <p className="mb-4">Ota yhteyttä ja pyydä tarjous vanteidesi maalauksesta!</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a 
            href="tel:0440778896" 
            className="btn btn-primary flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Soita: 0440 778896
          </a>
          <a 
            href="mailto:maalausasema@131.fi" 
            className="btn btn-primary flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Lähetä sähköpostia
          </a>
        </div>
      </div>
    </div>
  );
}