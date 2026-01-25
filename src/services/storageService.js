// src/services/storageService.js
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

export async function uploadReceiptImage(projectId, imageBlob) {
  const storage = getStorage();
  const receiptId = uuidv4();
  const fileName = `${receiptId}.jpg`;
  const storageRef = ref(storage, `receipts/${projectId}/${fileName}`);

  try {
    console.log('📤 Uploading receipt image...');
    
    const snapshot = await uploadBytes(storageRef, imageBlob, {
      contentType: 'image/jpeg'
    });

    const downloadUrl = await getDownloadURL(snapshot.ref);
    
    console.log('✅ Upload complete:', downloadUrl);
    return downloadUrl;
    
  } catch (error) {
    console.error('❌ Upload failed:', error);
    throw new Error(`Failed to upload receipt: ${error.message}`);
  }
}