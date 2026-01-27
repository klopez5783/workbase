// src/hooks/useReceiptOCR.js
import { useState } from 'react';
import { auth } from '../services/firebase';

export function useReceiptOCR() {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const processReceipt = async (imageUrl, projectId) => {
    setProcessing(true);
    setError(null);
    setResult(null);

    try {
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('You must be logged in to scan receipts');
      }

      const idToken = await user.getIdToken();
      
      const hostname = window.location.hostname;
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
      
      const functionUrl = isLocalhost
        ? 'http://127.0.0.1:5001/workbase-8dfe2/us-east1/processReceipt'
        : 'https://us-east1-workbase-8dfe2.cloudfunctions.net/processReceipt';
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          data: {
            imageUrl,
            projectId
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const resultData = data.result;
      
      if (!resultData.success) {
        throw new Error(resultData.message || 'Failed to process receipt');
      }
      
      setResult(resultData);
      return resultData;
      
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setProcessing(false);
    setError(null);
    setResult(null);
  };

  return { processReceipt, processing, error, result, reset };
}