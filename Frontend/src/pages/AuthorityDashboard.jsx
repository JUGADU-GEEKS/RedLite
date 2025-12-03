import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import ProtectedRoute from '../components/ProtectedRoute';

function AuthorityDashboardInner() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/sos/list`);
      const jd = await res.json();
      if (jd.status === 'success') setItems(jd.items || []);
      else setError(jd.message || 'Failed to load');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, []);

  const acknowledge = async (caseId) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/sos/acknowledge`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId })
      });
      // refresh
      fetchList();
      alert('Case acknowledged.');
    } catch (e) {
      alert('Failed to acknowledge: ' + e.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 relative overflow-hidden">
      <Navbar />
      <div className="pt-24 px-6 max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold mb-4">Authority Dashboard</h2>
        <p className="text-sm text-gray-600 mb-6">Monitor SOS requests and acknowledge them (in-platform only).</p>

        {loading && <div>Loading...</div>}
        {error && <div className="text-red-600">{error}</div>}

        <div className="overflow-x-auto bg-white/80 p-4 rounded-2xl border border-gray-200 shadow">
          <table className="min-w-full table-auto text-sm">
            <thead>
              <tr className="text-left text-gray-700">
                <th className="px-3 py-2">Case ID</th>
                <th className="px-3 py-2">User Name</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Coordinates</th>
                <th className="px-3 py-2">Vehicle</th>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.caseId} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{item.caseId}</td>
                  <td className="px-3 py-2">{item.userName}</td>
                  <td className="px-3 py-2">{item.phone}</td>
                  <td className="px-3 py-2">{item.latitude},{item.longitude}</td>
                  <td className="px-3 py-2">{item.vehicle}</td>
                  <td className="px-3 py-2">{item.timestamp}</td>
                  <td className="px-3 py-2">{item.status || 'Pending'}</td>
                  <td className="px-3 py-2">
                    {item.status === 'Acknowledged' ? (
                      <span className="text-green-600 font-semibold">Acknowledged</span>
                    ) : (
                      <button onClick={() => acknowledge(item.caseId)} className="px-3 py-1 bg-amber-500 text-white rounded">Acknowledge</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AuthorityDashboard() {
  // Wrap with ProtectedRoute so only authorized users access it
  return (
    <ProtectedRoute roles={["admin","employee"]}>
      <AuthorityDashboardInner />
    </ProtectedRoute>
  );
}
