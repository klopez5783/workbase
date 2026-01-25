// src/hooks/useReceiptOCR.js
import { useState } from 'react';

export function useReceiptOCR() {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const processReceipt = async (imageUrl, projectId) => {
    setProcessing(true);
    setError(null);
    setResult(null);

    try {
      console.log('📞 Calling LOCAL emulator function...');
      
      // Call the emulator directly via HTTP
      const response = await fetch('http://127.0.0.1:5001/workbase-8dfe2/us-east1/processReceipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      console.log('✅ Response:', data);
      
      // Firebase callable functions wrap the result in a 'result' property
      const resultData = data.result;
      
      if (!resultData.success) {
        throw new Error(resultData.message || 'Failed to process receipt');
      }
      
      setResult(resultData);
      return resultData;
      
    } catch (err) {
      console.error('❌ Error:', err);
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