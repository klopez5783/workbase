import { useState } from 'react';
import { firestoreService } from '../services/firestoreService';

export default function FirebaseTest() {
  const [status, setStatus] = useState('Not tested');

  const testFirebase = async () => {
    setStatus('Testing...');
    
    // Try to create a test document
    const result = await firestoreService.create('test', {
      message: 'Hello Firebase!',
      timestamp: new Date().toISOString()
    });

    if (result.success) {
      setStatus('✅ Firebase connected successfully!');
    } else {
      setStatus(`❌ Error: ${result.error}`);
    }
  };

  return (
    <div className="p-5">
      <button onClick={testFirebase} className="btn-primary">
        Test Firebase Connection
      </button>
      <p className="mt-4">{status}</p>
    </div>
  );
}