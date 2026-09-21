'use client';

import { useState } from 'react';

export const useImageUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadImage = async (imageData: string, folder?: string): Promise<string> => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simular progreso
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageData, folder }),
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      return result.imageUrl;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const uploadMultipleImages = async (
    images: { data: string; name: string }[],
    folder?: string
  ): Promise<{ [name: string]: string }> => {
    const results: { [name: string]: string } = {};
    
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      try {
        const url = await uploadImage(image.data, folder);
        results[image.name] = url;
        setUploadProgress((i + 1) / images.length * 100);
      } catch (error) {
        console.error(`Failed to upload ${image.name}:`, error);
        // Continuar con las demás imágenes
      }
    }

    return results;
  };

  return {
    uploadImage,
    uploadMultipleImages,
    isUploading,
    uploadProgress,
  };
};