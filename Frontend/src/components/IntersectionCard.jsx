import React from 'react';
import { Link } from 'react-router-dom';

const IntersectionCard = ({ intersection, isAdmin }) => {
    return (
        <div style={{ border: '1px solid #ccc', padding: '10px', margin: '10px' }}>
            <h4>{intersection.name} ({intersection.intersectionId})</h4>
            <p><strong>Status:</strong> {intersection.status}</p>
            <p><strong>IoT Device ID:</strong> {intersection.iotDeviceId || 'N/A'}</p>
            {isAdmin && (
                <div>
                    <p><strong>Assigned Employees:</strong> {intersection.assignedEmployees.join(', ') || 'None'}</p>
                </div>
            )}
            <Link to={`/dashboard/${intersection.intersectionId}`}>View Lane Dashboard</Link>
        </div>
    );
};

export default IntersectionCard;
