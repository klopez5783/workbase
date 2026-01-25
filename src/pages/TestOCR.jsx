// src/pages/TestOCR.jsx
import { useState } from 'react';
import { useReceiptOCR } from '../hooks/useReciptOCR';

export default function TestOCR() {
  const { processReceipt, processing, error, result, reset } = useReceiptOCR();

  const handleTest = async () => {
    try {
      // Test with a dummy URL - emulator will return mock data
      await processReceipt(
        'https://example.com/mock-receipt.jpg',
        'test-project-123'
      );
    } catch (err) {
      console.error('Test failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold mb-6">Receipt OCR Test</h1>
        
        <div className="space-y-4">
          <button
            onClick={handleTest}
            disabled={processing}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {processing ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing Receipt...
              </span>
            ) : (
              'Test OCR Function'
            )}
          </button>

          {result && (
            <button
              onClick={reset}
              className="w-full bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
            >
              Reset
            </button>
          )}
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 font-medium">Error</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="mt-6 space-y-4">
            {result._isMockData && (
              <div className="p-3 bg-orange-50 border-l-4 border-orange-400 rounded">
                <p className="text-sm text-orange-700 font-semibold">
                  ⚠️ Using mock data (emulator mode)
                </p>
              </div>
            )}
            
            <div className="bg-green-50 border-l-4 border-green-500 rounded p-4">
              <h3 className="text-lg font-bold text-green-900 mb-3">OCR Results</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-700">Merchant:</span>
                  <span className="text-gray-900">{result.merchant || 'Not detected'}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-700">Date:</span>
                  <span className="text-gray-900">{result.date || 'Not detected'}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-700">Total:</span>
                  <span className="text-gray-900 font-bold">
                    ${result.total?.toFixed(2) || 'Not detected'}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-700">Confidence:</span>
                  <span className="text-gray-900">
                    {(result.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {result.items?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-green-200">
                  <h4 className="font-semibold text-gray-700 mb-2">
                    Items ({result.items.length}):
                  </h4>
                  <ul className="space-y-1">
                    {result.items.map((item, i) => (
                      <li key={i} className="flex justify-between text-sm">
                        <span className="text-gray-700">{item.description}</span>
                        <span className="text-gray-900 font-medium">
                          ${item.amount.toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <details className="mt-4 pt-4 border-t border-green-200">
                <summary className="cursor-pointer font-semibold text-gray-700 hover:text-gray-900">
                  View Raw Text
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-64 text-gray-800">
                  {result.rawText}
                </pre>
              </details>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}