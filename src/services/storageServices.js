import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

export const storageService = {
  // Upload file (renamed from 'upload' to match usage in WorkLogForm)
  async uploadFile(file, path) {
    try {
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      return { success: true, url };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Upload file (alternate method name)
  async upload(path, file) {
    try {
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      return { success: true, url };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Upload image (with compression)
  async uploadImage(folder, file, maxWidth = 1200) {
    try {
      // Create canvas for compression
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      return new Promise((resolve, reject) => {
        img.onload = async () => {
          // Calculate new dimensions
          const ratio = Math.min(maxWidth / img.width, 1);
          canvas.width = img.width * ratio;
          canvas.height = img.height * ratio;

          // Draw and compress
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(async (blob) => {
            const fileName = `${folder}/${Date.now()}_${file.name}`;
            const result = await this.upload(fileName, blob);
            resolve(result);
          }, 'image/jpeg', 0.8);
        };

        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Delete file
  async delete(path) {
    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get download URL
  async getUrl(path) {
    try {
      const storageRef = ref(storage, path);
      const url = await getDownloadURL(storageRef);
      return { success: true, url };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};