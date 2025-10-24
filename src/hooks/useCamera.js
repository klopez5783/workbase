import { useState } from 'react';

export const useCamera = () => {
  const [image, setImage] = useState(null);
  const [error, setError] = useState(null);

  const captureImage = () => {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';

      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setImage(reader.result);
            resolve(reader.result);
          };
          reader.onerror = () => {
            setError('Failed to read image');
            reject('Failed to read image');
          };
          reader.readAsDataURL(file);
        }
      };

      input.click();
    });
  };

  const clearImage = () => setImage(null);

  return { image, error, captureImage, clearImage };
};