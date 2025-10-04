import React, { useState, useCallback, useEffect } from 'react';
import type { ImageFile } from './types';
import ImageUploader from './components/ImageUploader';
import { generateFusedImage, generatePromptSuggestions } from './services/geminiService';

const Spinner: React.FC = () => (
  <div className="flex flex-col items-center justify-center space-y-4">
    <svg className="animate-spin -ml-1 mr-3 h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <p className="text-lg text-gray-300">Nano Banana is creating magic...</p>
    <p className="text-sm text-gray-500">This can take a moment, please wait.</p>
  </div>
);

interface ErrorState {
  title: string;
  message: string;
}

interface PromptSuggestionsProps {
  onSelect: (prompt: string) => void;
  suggestions: string[];
  isLoading: boolean;
  hasBothImages: boolean;
}

const PromptSuggestions: React.FC<PromptSuggestionsProps> = ({ onSelect, suggestions, isLoading, hasBothImages }) => {
  if (!hasBothImages) {
    return (
      <div className="text-center mt-3 text-gray-500 text-sm h-10 flex items-center justify-center">
        <p>Upload both images to get smart suggestions.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center mt-3 text-gray-400 flex items-center justify-center gap-2 h-10">
        <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Analyzing images for suggestions...</span>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return <div className="h-10"></div>; // Reserve space
  }

  return (
    <div className="flex flex-wrap justify-center gap-2 mt-3 min-h-[40px]">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          onClick={() => onSelect(suggestion)}
          className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
};


const App: React.FC = () => {
  const [characterImage, setCharacterImage] = useState<ImageFile | null>(null);
  const [productImage, setProductImage] = useState<ImageFile | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<'png' | 'jpeg'>('png');
  const [jpegQuality, setJpegQuality] = useState<number>(0.92);

  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState<boolean>(false);
  
  const [outputAspectRatio, setOutputAspectRatio] = useState<string>('original');

  const staticSuggestions = [
    "Make the character wear the item",
    "Have the character hold the object",
    "Place the item on the character's head",
    "Integrate the product into the scene",
  ];

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (characterImage && productImage) {
        setIsSuggestionsLoading(true);
        setDynamicSuggestions([]);
        try {
          const suggestions = await generatePromptSuggestions(characterImage.file, productImage.file);
          setDynamicSuggestions(suggestions);
        } catch (error) {
          console.error("Failed to generate prompt suggestions:", error);
          // Fallback to static suggestions is handled by the render logic
        } finally {
          setIsSuggestionsLoading(false);
        }
      }
    };
    fetchSuggestions();
  }, [characterImage, productImage]);


  const handleGenerate = useCallback(async () => {
    if (!characterImage || !productImage) {
      setError({
        title: "Missing Images",
        message: "Please upload both a character and a product image before generating."
      });
      return;
    }
    setError(null);
    setGeneratedImage(null);
    setIsLoading(true);

    try {
      const result = await generateFusedImage(characterImage.file, productImage.file, prompt, outputAspectRatio);
      setGeneratedImage(result);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      console.error(e);
      if (errorMessage === 'SAFETY_POLICY_VIOLATION') {
        setError({
          title: "Content Policy Violation",
          message: "The request was blocked because the prompt or images may have violated safety policies. Please adjust your inputs and try again."
        });
      } else if (errorMessage.includes("No image was generated")) {
        setError({
          title: "Image Generation Unsuccessful",
          message: "The model was unable to generate an image. This can happen if the request is unclear. Please try modifying your instructions or using different images."
        });
      } else {
        setError({
          title: "Oops! Something Went Wrong",
          message: "An unexpected error occurred. Please check your internet connection and try again. If the problem continues, the service might be temporarily unavailable."
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [characterImage, productImage, prompt, outputAspectRatio]);
  
  const handleReset = () => {
    setCharacterImage(null);
    setProductImage(null);
    setGeneratedImage(null);
    setPrompt('');
    setError(null);
    setIsLoading(false);
    setDynamicSuggestions([]);
    setOutputAspectRatio('original');
  }

  const handleDownload = () => {
    if (!generatedImage) return;

    const image = new Image();
    image.src = generatedImage;
    image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            setError({
                title: "Download Failed",
                message: "Could not create an image canvas to process the download.",
            });
            return;
        }
        ctx.drawImage(image, 0, 0);

        const mimeType = `image/${downloadFormat}`;
        const quality = downloadFormat === 'jpeg' ? jpegQuality : undefined;

        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    setError({
                        title: "Download Failed",
                        message: "Could not convert the image for download. Please try right-clicking to save.",
                    });
                    return;
                }
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `fused-image.${downloadFormat}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            },
            mimeType,
            quality
        );
    };
    image.onerror = () => {
        setError({
            title: "Download Failed",
            message: "Could not load the generated image for processing. Please try right-clicking to save.",
        });
    };
  };


  const isButtonDisabled = !characterImage || !productImage || isLoading;
  const suggestionsToShow = dynamicSuggestions.length > 0 ? dynamicSuggestions : staticSuggestions;
  const aspectRatios = ['original', '1:1', '16:9', '9:16', '4:3', '3:4'];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-5xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 pb-2">
            Nano Character Fusion
          </h1>
          <p className="text-md text-gray-400 mt-2">
            Fuse a character and a product into a single, seamless image with AI.
          </p>
        </header>

        <main>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <ImageUploader 
              title="Character Image"
              onImageUpload={setCharacterImage}
              imagePreviewUrl={characterImage?.previewUrl || null}
            />
            <ImageUploader 
              title="Product Image"
              onImageUpload={setProductImage}
              imagePreviewUrl={productImage?.previewUrl || null}
            />
          </div>

          <div className="mb-6">
            <label htmlFor="prompt-input" className="block mb-2 text-lg font-semibold text-gray-300">
              Additional Instructions (Optional)
            </label>
            <textarea
              id="prompt-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., 'Make the character wear the headphones', 'Put the backpack on the character'"
              className="w-full h-24 p-4 bg-gray-800 border-2 border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-300 text-gray-200"
              aria-label="Additional instructions for image generation"
            />
            <PromptSuggestions 
              onSelect={setPrompt} 
              suggestions={suggestionsToShow}
              isLoading={isSuggestionsLoading}
              hasBothImages={!!characterImage && !!productImage}
            />
          </div>
          
          <div className="mb-8">
            <label className="block mb-3 text-lg font-semibold text-gray-300 text-center">
              Output Aspect Ratio
            </label>
            <div className="flex flex-wrap justify-center gap-3">
              {aspectRatios.map(ratio => (
                <button
                  key={ratio}
                  onClick={() => setOutputAspectRatio(ratio)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                    outputAspectRatio === ratio
                      ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {ratio === 'original' ? 'Original' : ratio}
                </button>
              ))}
            </div>
          </div>


          <div className="flex justify-center items-center gap-4 mb-8">
            <button
              onClick={handleGenerate}
              disabled={isButtonDisabled}
              className="px-8 py-3 bg-blue-600 rounded-lg font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-800 disabled:bg-gray-700 disabled:cursor-not-allowed disabled:text-gray-400 transition-all duration-300 ease-in-out transform hover:scale-105 disabled:scale-100"
            >
              {isLoading ? 'Generating...' : 'Generate Image'}
            </button>
             {(characterImage || productImage || generatedImage || prompt) && (
                 <button
                    onClick={handleReset}
                    className="px-6 py-3 bg-gray-600 rounded-lg font-semibold text-white hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-800 transition-colors duration-300"
                  >
                    Reset
                 </button>
            )}
          </div>

          <div className="bg-gray-800 rounded-lg p-4 min-h-[400px] flex items-center justify-center w-full">
            {isLoading && <Spinner />}
            {error && !isLoading && (
              <div className="text-center text-red-400 bg-red-900/20 border border-red-500/50 rounded-lg p-6 max-w-2xl mx-auto">
                <h3 className="font-bold text-xl mb-2 text-red-300">{error.title}</h3>
                <p className="text-red-400">{error.message}</p>
              </div>
            )}
            {generatedImage && !isLoading && (
              <div className="flex flex-col items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-200">Your Fused Image</h2>
                <img 
                  src={generatedImage} 
                  alt="Generated fusion" 
                  className="max-w-full max-h-[60vh] rounded-lg shadow-2xl shadow-black/50 pointer-events-auto cursor-zoom-in"
                  style={{ WebkitTouchCallout: 'default', userSelect: 'auto' }}
                  onClick={() => setIsModalOpen(true)}
                />
                
                <div className="w-full max-w-md mt-4 p-4 border border-gray-700 rounded-lg bg-gray-800/50">
                    <h3 className="text-lg font-semibold text-center text-gray-300 mb-4">Download Options</h3>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
                        <label htmlFor="format-select" className="text-gray-400 font-medium">Format:</label>
                        <select
                            id="format-select"
                            value={downloadFormat}
                            onChange={(e) => setDownloadFormat(e.target.value as 'png' | 'jpeg')}
                            className="bg-gray-700 border border-gray-600 rounded-md px-3 py-1 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="png">PNG</option>
                            <option value="jpeg">JPEG</option>
                        </select>
                    </div>
                    {downloadFormat === 'jpeg' && (
                        <div className="w-full max-w-xs mx-auto flex flex-col items-center gap-2 mb-4">
                            <label htmlFor="quality-slider" className="text-gray-400 font-medium">
                                Quality: {Math.round(jpegQuality * 100)}%
                            </label>
                            <input
                                id="quality-slider"
                                type="range"
                                min="0.1"
                                max="1.0"
                                step="0.01"
                                value={jpegQuality}
                                onChange={(e) => setJpegQuality(parseFloat(e.target.value))}
                                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    )}
                    <button
                      onClick={handleDownload}
                      className="w-full px-6 py-3 mt-2 bg-green-600 rounded-lg font-semibold text-white hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-800 transition-colors duration-300 transform hover:scale-105"
                    >
                      Download Image
                    </button>
                </div>

                <p className="text-xs text-gray-500 text-center max-w-xs mt-2">
                  Tip: Click the image to enlarge.
                </p>
              </div>
            )}
             {!isLoading && !error && !generatedImage && (
              <div className="text-center text-gray-500">
                <p>Your generated image will appear here.</p>
              </div>
            )}
          </div>
        </main>
      </div>
      {isModalOpen && generatedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
          onClick={() => setIsModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="enlarged-image-title"
        >
          <div
            className="relative"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="enlarged-image-title" className="sr-only">Enlarged Fused Image</h2>
            <img
              src={generatedImage}
              alt="Enlarged generated fusion"
              className="block max-w-[95vw] max-h-[95vh] rounded-lg"
              style={{ WebkitTouchCallout: 'default', userSelect: 'auto' }}
            />
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute -top-2 -right-2 h-10 w-10 bg-white text-black rounded-full flex items-center justify-center text-2xl font-bold hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Close enlarged image view"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;