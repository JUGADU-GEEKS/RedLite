import React from 'react'
import { useState } from 'react';
function Alert() {
  const [status, setStatus] = useState('');
  const handleAlert = async () => {
    setStatus('Sending...');
    // Example coordinates, replace with actual if needed
    const coords = '28.612091,77.037639';
    try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/send_call_alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coords })
      });
      const data = await res.json();
      if (data.success === true) {
        setStatus('Call alert sent!');
      } else {
        setStatus('Failed to send call alert.');
      }
    } catch (e) {
      setStatus('Error sending call alert.');
    }
    setTimeout(() => setStatus(''), 3000);
  };
  return (
    <div>
      <button className="btn btn-primary" onClick={handleAlert}>Alerter</button>
      {status && <div style={{marginTop:8}}>{status}</div>}
    </div>
  );
}
export default Alert