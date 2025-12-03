const API_BASE = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || "http://localhost:8000";

function getAuthHeaders() {
  const token = localStorage.getItem('lanezy_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
}

// Zone APIs
export async function fetchZones(cameraId) {
  try {
    const res = await fetch(`${API_BASE}/api/zones/${cameraId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch zones: ${res.statusText}`);
    const data = await res.json();
    return data.zones || [];
  } catch (error) {
    console.error('[ZONES API ERROR]', error);
    throw error;
  }
}

export async function createZone(zoneData) {
  try {
    const res = await fetch(`${API_BASE}/api/zones/create`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(zoneData)
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || `Failed to create zone: ${res.statusText}`);
    }
    const data = await res.json();
    return data.zone;
  } catch (error) {
    console.error('[CREATE ZONE ERROR]', error);
    throw error;
  }
}

export async function updateZone(zoneId, zoneData) {
  try {
    const res = await fetch(`${API_BASE}/api/zones/update/${zoneId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(zoneData)
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || `Failed to update zone: ${res.statusText}`);
    }
    const data = await res.json();
    return data.zone;
  } catch (error) {
    console.error('[UPDATE ZONE ERROR]', error);
    throw error;
  }
}

export async function deleteZone(zoneId) {
  try {
    const res = await fetch(`${API_BASE}/api/zones/delete/${zoneId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || `Failed to delete zone: ${res.statusText}`);
    }
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('[DELETE ZONE ERROR]', error);
    throw error;
  }
}

// Boundary Line APIs
export async function fetchBoundaryLines(cameraId) {
  try {
    const res = await fetch(`${API_BASE}/api/boundary-lines/${cameraId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch boundary lines: ${res.statusText}`);
    const data = await res.json();
    return data.boundaryLines || [];
  } catch (error) {
    console.error('[BOUNDARY LINES API ERROR]', error);
    throw error;
  }
}

export async function createBoundaryLine(lineData) {
  try {
    const res = await fetch(`${API_BASE}/api/boundary-lines/create`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(lineData)
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || `Failed to create boundary line: ${res.statusText}`);
    }
    const data = await res.json();
    return data.boundaryLine;
  } catch (error) {
    console.error('[CREATE BOUNDARY LINE ERROR]', error);
    throw error;
  }
}

export async function updateBoundaryLine(lineId, lineData) {
  try {
    const res = await fetch(`${API_BASE}/api/boundary-lines/update/${lineId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(lineData)
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || `Failed to update boundary line: ${res.statusText}`);
    }
    const data = await res.json();
    return data.boundaryLine;
  } catch (error) {
    console.error('[UPDATE BOUNDARY LINE ERROR]', error);
    throw error;
  }
}

export async function deleteBoundaryLine(lineId) {
  try {
    const res = await fetch(`${API_BASE}/api/boundary-lines/delete/${lineId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || `Failed to delete boundary line: ${res.statusText}`);
    }
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('[DELETE BOUNDARY LINE ERROR]', error);
    throw error;
  }
}

// Violation APIs
export async function reportViolation(violationData) {
  try {
    const res = await fetch(`${API_BASE}/api/illegal-parking/violation`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(violationData)
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || `Failed to report violation: ${res.statusText}`);
    }
    const data = await res.json();
    return data.violation;
  } catch (error) {
    console.error('[REPORT VIOLATION ERROR]', error);
    throw error;
  }
}

export async function fetchViolations(cameraId = null, status = null, limit = 100) {
  try {
    const params = new URLSearchParams();
    if (cameraId) params.append('camera_id', cameraId);
    if (status) params.append('status', status);
    params.append('limit', limit.toString());
    
    const res = await fetch(`${API_BASE}/api/illegal-parking/violations?${params}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to fetch violations: ${res.statusText}`);
    const data = await res.json();
    return data.violations || [];
  } catch (error) {
    console.error('[FETCH VIOLATIONS ERROR]', error);
    throw error;
  }
}

export async function approveViolation(violationId) {
  try {
    const res = await fetch(`${API_BASE}/api/illegal-parking/approve/${violationId}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || `Failed to approve violation: ${res.statusText}`);
    }
    const data = await res.json();
    return data.violation;
  } catch (error) {
    console.error('[APPROVE VIOLATION ERROR]', error);
    throw error;
  }
}

export async function rejectViolation(violationId) {
  try {
    const res = await fetch(`${API_BASE}/api/illegal-parking/reject/${violationId}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || `Failed to reject violation: ${res.statusText}`);
    }
    const data = await res.json();
    return data.violation;
  } catch (error) {
    console.error('[REJECT VIOLATION ERROR]', error);
    throw error;
  }
}

// Detection Control APIs
export async function startDetection(cameraId, videoPath, checkInterval = 2.0) {
  try {
    const res = await fetch(`${API_BASE}/api/illegal-parking/start-detection`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        cameras: {
          [cameraId]: videoPath
        },
        check_interval: checkInterval
      })
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || `Failed to start detection: ${res.statusText}`);
    }
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('[START DETECTION ERROR]', error);
    throw error;
  }
}

export async function stopDetection() {
  try {
    const res = await fetch(`${API_BASE}/api/illegal-parking/stop-detection`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || `Failed to stop detection: ${res.statusText}`);
    }
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('[STOP DETECTION ERROR]', error);
    throw error;
  }
}

export async function getDetectionStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/illegal-parking/detection-status`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to get detection status: ${res.statusText}`);
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('[GET DETECTION STATUS ERROR]', error);
    throw error;
  }
}

