import React, { useRef, useCallback } from 'react';
import type { ImageFile } from '../types';

interface ImageUploaderProps {
  title: string;
  onImageUpload: (imageFile: ImageFile) => void;
  imagePreviewUrl: string | null;
}

const UploadIcon: React.FC = () => (
  <svg
    className="w-10 h-10 mb-4 text-gray-500 dark:text-gray-400"
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 20 16"
  >
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
    />
  </svg>
);


const ImageUploader: React.FC<ImageUploaderProps> = ({ title, onImageUpload, imagePreviewUrl }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      onImageUpload({ file, previewUrl });
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };
  
  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
     if (file && file.type.startsWith('image/')) {
        const previewUrl = URL.createObjectURL(file);
        onImageUpload({ file, previewUrl });
    }
  }, [onImageUpload]);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <h3 className="text-lg font-semibold text-gray-300 mb-2">{title}</h3>
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="relative flex flex-col items-center justify-center w-full aspect-square border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-700 hover:border-blue-500 transition-colors duration-300"
      >
        {imagePreviewUrl ? (
          <img src={imagePreviewUrl} alt="Preview" className="object-contain w-full h-full rounded-lg" />
        ) : (
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadIcon />
            <p className="mb-2 text-sm text-gray-400">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">PNG, JPG, GIF or WEBP</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};

export default ImageUploader;