import React, { useState, useRef, useEffect } from 'react';
import { Save, Trash2, Plus, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchZones, createZone, updateZone, deleteZone } from '../../services/illegalParkingService';
import PolygonOverlay from './PolygonOverlay';

const ZoneEditor = ({ cameraId }) => {
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [zoneType, setZoneType] = useState('NO_PARKING');
  const [illegalInside, setIllegalInside] = useState(true);
  const [polygon, setPolygon] = useState([]);
  const [imageSrc, setImageSrc] = useState('/Videos/1.mp4');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadZones();
    // Set image source based on camera
    const videoMap = {
      'CAM-001': '/Videos/1.mp4',
      'CAM-002': '/Videos/2.mp4',
      'CAM-003': '/Videos/3.mp4',
      'CAM-004': '/Videos/5.mp4'
    };
    setImageSrc(videoMap[cameraId] || '/Videos/1.mp4');
  }, [cameraId]);

  const loadZones = async () => {
    try {
      setLoading(true);
      const data = await fetchZones(cameraId);
      setZones(data);
    } catch (err) {
      setError('Failed to load zones: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePolygonComplete = (points) => {
    setPolygon(points);
  };

  const handleSave = async () => {
    if (polygon.length < 3) {
      setError('Polygon must have at least 3 points');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      if (selectedZone) {
        await updateZone(selectedZone.zoneId, {
          type: zoneType,
          polygon: polygon,
          illegalInside: illegalInside
        });
      } else {
        await createZone({
          cameraId: cameraId,
          type: zoneType,
          polygon: polygon,
          illegalInside: illegalInside
        });
      }
      
      await loadZones();
      setSelectedZone(null);
      setPolygon([]);
    } catch (err) {
      setError('Failed to save zone: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (zoneId) => {
    if (!window.confirm('Are you sure you want to delete this zone?')) return;
    
    try {
      setLoading(true);
      await deleteZone(zoneId);
      await loadZones();
      if (selectedZone?.zoneId === zoneId) {
        setSelectedZone(null);
        setPolygon([]);
      }
    } catch (err) {
      setError('Failed to delete zone: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectZone = (zone) => {
    setSelectedZone(zone);
    setZoneType(zone.type);
    setIllegalInside(zone.illegalInside);
    setPolygon(zone.polygon || []);
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas Area */}
        <div className="lg:col-span-2">
          <div className="bg-black rounded-xl overflow-hidden shadow-lg mb-4 relative">
            <PolygonOverlay
              imageSrc={imageSrc}
              polygon={polygon}
              onPolygonComplete={handlePolygonComplete}
              zones={zones}
            />
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <select
              value={zoneType}
              onChange={(e) => setZoneType(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              <option value="NO_PARKING">No Parking</option>
              <option value="BUS_LANE">Bus Lane</option>
              <option value="FOOTPATH">Footpath</option>
              <option value="LOADING_ZONE">Loading Zone</option>
            </select>
            
            <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg">
              <input
                type="checkbox"
                checked={illegalInside}
                onChange={(e) => setIllegalInside(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Illegal Inside</span>
            </label>
            
            <button
              onClick={handleSave}
              disabled={loading || polygon.length < 3}
              className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {selectedZone ? 'Update' : 'Save'} Zone
            </button>
          </div>
        </div>

        {/* Zone List */}
        <div className="lg:col-span-1">
          <h3 className="text-xl font-bold mb-4 text-gray-700">Zones</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {zones.map((zone) => (
              <motion.div
                key={zone.zoneId}
                onClick={() => handleSelectZone(zone)}
                className={`p-3 border rounded-lg cursor-pointer transition-all ${
                  selectedZone?.zoneId === zone.zoneId
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-300 hover:border-orange-300'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">{zone.type}</p>
                    <p className="text-xs text-gray-500">
                      {zone.polygon?.length || 0} points
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(zone.zoneId);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
            {zones.length === 0 && !loading && (
              <p className="text-gray-500 text-center py-4">No zones created yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZoneEditor;

