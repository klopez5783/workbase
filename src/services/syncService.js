// src/services/syncService.js
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { storageService } from '../services/storageServices';
import { getUploadQueue, removeFromQueue } from './offlineStorage';

let isSyncing = false;

export async function syncPendingReceipts(onProgress) {
  if (isSyncing) {
    console.log('Sync already in progress');
    return { success: false, message: 'Sync already in progress' };
  }

  // Check if online
  if (!navigator.onLine) {
    console.log('Cannot sync - offline');
    return { success: false, message: 'Cannot sync while offline' };
  }

  isSyncing = true;

  try {
    const queue = await getUploadQueue();
    
    if (queue.length === 0) {
      console.log('Queue is empty - nothing to sync');
      isSyncing = false;
      return { success: true, synced: 0 };
    }

    console.log(`Starting sync of ${queue.length} receipts...`);
    let synced = 0;
    let failed = 0;

    for (const item of queue) {
      try {
        // Report progress
        if (onProgress) {
          onProgress(synced + 1, queue.length);
        }

        console.log('Processing queue item:', item);

        // Check if user is authenticated
        const currentUser = auth.currentUser;
        if (!currentUser) {
          console.error('User not authenticated - cannot sync');
          throw new Error('User not authenticated');
        }

        // Upload receipt image if it exists as blob
        let receiptImageUrl = item.receiptImageUrl;
        
        if (item.imageBlob) {
          console.log('Uploading image blob...');
          
          // Convert base64 to blob if needed
          let blob = item.imageBlob;
          if (typeof blob === 'string') {
            // If stored as base64, convert back to blob
            const response = await fetch(blob);
            blob = await response.blob();
          }
          
          const uploadResult = await storageService.uploadReceipt(
            item.projectId, 
            blob
          );
          
          if (!uploadResult.success) {
            throw new Error('Failed to upload image: ' + uploadResult.error);
          }
          
          receiptImageUrl = uploadResult.url;
          console.log('Image uploaded:', receiptImageUrl);
        }

        // Save to Firestore
        console.log('Saving to Firestore...');
        await addDoc(collection(db, `projects/${item.projectId}/receipts`), {
          merchant: item.merchant || '',
          date: item.date || '',
          total: item.total || 0,
          tags: item.tags || [],
          notes: item.notes || '',
          items: item.items || [],
          receiptImageUrl: receiptImageUrl || '',
          ocrRawText: item.ocrRawText || '',
          ocrConfidence: item.ocrConfidence || 0,
          projectId: item.projectId,
          submittedBy: currentUser.uid,
          submittedByName: currentUser.displayName || currentUser.email || 'Offline User',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        console.log('Saved to Firestore');

        // Remove from queue
        await removeFromQueue(item.id);
        synced++;

        console.log(`✅ Synced receipt ${synced}/${queue.length}`);

      } catch (error) {
        console.error('❌ Failed to sync receipt:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          item: item
        });
        failed++;
        // Don't remove from queue - will retry next time
      }
    }

    isSyncing = false;

    console.log(`Sync complete: ${synced} synced, ${failed} failed`);

    return {
      success: synced > 0 || failed === 0,
      synced,
      failed,
      total: queue.length
    };

  } catch (error) {
    console.error('Sync error:', error);
    isSyncing = false;
    return { success: false, error: error.message };
  }
}

// Auto-sync when coming online
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    console.log('🌐 Network back online - starting auto-sync...');
    
    // Wait a bit for connections to stabilize
    setTimeout(async () => {
      const result = await syncPendingReceipts();
      console.log('Auto-sync result:', result);
    }, 2000);
  });
}