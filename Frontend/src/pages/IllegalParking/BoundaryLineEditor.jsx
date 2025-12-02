import React, { useState, useEffect } from 'react';
import { Save, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchBoundaryLines, createBoundaryLine, updateBoundaryLine, deleteBoundaryLine } from '../../services/illegalParkingService';
import BoundaryLineOverlay from './BoundaryLineOverlay';

const BoundaryLineEditor = ({ cameraId }) => {
  const [lines, setLines] = useState([]);
  const [selectedLine, setSelectedLine] = useState(null);
  const [illegalSide, setIllegalSide] = useState('LEFT');
  const [lineName, setLineName] = useState('');
  const [points, setPoints] = useState([]);
  const [imageSrc, setImageSrc] = useState('/Videos/1.mp4');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLines();
    const videoMap = {
      'CAM-001': '/Videos/1.mp4',
      'CAM-002': '/Videos/2.mp4',
      'CAM-003': '/Videos/3.mp4',
      'CAM-004': '/Videos/5.mp4'
    };
    setImageSrc(videoMap[cameraId] || '/Videos/1.mp4');
  }, [cameraId]);

  const loadLines = async () => {
    try {
      setLoading(true);
      const data = await fetchBoundaryLines(cameraId);
      setLines(data);
    } catch (err) {
      setError('Failed to load boundary lines: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLineComplete = (linePoints) => {
    setPoints(linePoints);
  };

  const handleSave = async () => {
    if (points.length !== 2) {
      setError('Boundary line must have exactly 2 points');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      if (selectedLine) {
        await updateBoundaryLine(selectedLine.lineId, {
          points: points,
          illegalSide: illegalSide,
          lineName: lineName
        });
      } else {
        await createBoundaryLine({
          cameraId: cameraId,
          points: points,
          illegalSide: illegalSide,
          lineName: lineName
        });
      }
      
      await loadLines();
      setSelectedLine(null);
      setPoints([]);
      setLineName('');
    } catch (err) {
      setError('Failed to save boundary line: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (lineId) => {
    if (!window.confirm('Are you sure you want to delete this boundary line?')) return;
    
    try {
      setLoading(true);
      await deleteBoundaryLine(lineId);
      await loadLines();
      if (selectedLine?.lineId === lineId) {
        setSelectedLine(null);
        setPoints([]);
      }
    } catch (err) {
      setError('Failed to delete boundary line: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLine = (line) => {
    setSelectedLine(line);
    setIllegalSide(line.illegalSide);
    setLineName(line.lineName || '');
    setPoints(line.points || []);
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas Area */}
        <div className="lg:col-span-2">
          <div className="bg-black rounded-xl overflow-hidden shadow-lg mb-4 relative">
            <BoundaryLineOverlay
              imageSrc={imageSrc}
              points={points}
              onLineComplete={handleLineComplete}
              lines={lines}
            />
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Line name (optional)"
              value={lineName}
              onChange={(e) => setLineName(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
            
            <select
              value={illegalSide}
              onChange={(e) => setIllegalSide(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              <option value="LEFT">Left Side</option>
              <option value="RIGHT">Right Side</option>
              <option value="BOTH">Both Sides</option>
            </select>
            
            <button
              onClick={handleSave}
              disabled={loading || points.length !== 2}
              className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {selectedLine ? 'Update' : 'Save'} Line
            </button>
          </div>
        </div>

        {/* Line List */}
        <div className="lg:col-span-1">
          <h3 className="text-xl font-bold mb-4 text-gray-700">Boundary Lines</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {lines.map((line) => (
              <motion.div
                key={line.lineId}
                onClick={() => handleSelectLine(line)}
                className={`p-3 border rounded-lg cursor-pointer transition-all ${
                  selectedLine?.lineId === line.lineId
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-300 hover:border-orange-300'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">{line.lineName || 'Unnamed Line'}</p>
                    <p className="text-xs text-gray-500">
                      {line.illegalSide} side illegal
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(line.lineId);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
            {lines.length === 0 && !loading && (
              <p className="text-gray-500 text-center py-4">No boundary lines created yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoundaryLineEditor;

