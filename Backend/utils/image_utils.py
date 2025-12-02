"""
Utility functions for saving vehicle images and detecting license plates
"""
import cv2
import os
import logging
from datetime import datetime
from typing import Optional, Tuple
import easyocr

logger = logging.getLogger(__name__)

# Initialize EasyOCR reader (lazy loading)
_ocr_reader = None

def get_ocr_reader():
    """Get or initialize EasyOCR reader"""
    global _ocr_reader
    if _ocr_reader is None:
        try:
            logger.info("Initializing EasyOCR reader (this may take a minute on first run)...")
            _ocr_reader = easyocr.Reader(['en'], gpu=False, verbose=False)  # Use GPU if available
            logger.info("✓ EasyOCR reader initialized successfully")
        except Exception as e:
            logger.error(f"✗ Failed to initialize EasyOCR: {e}", exc_info=True)
            _ocr_reader = None
    return _ocr_reader

def save_vehicle_image(frame, bbox, camera_id: str, vehicle_id: str, base_dir: str = None) -> Optional[str]:
    """
    Save vehicle image to disk and return URL path
    
    Args:
        frame: Full video frame (numpy array)
        bbox: Bounding box [x1, y1, x2, y2]
        camera_id: Camera identifier
        vehicle_id: Vehicle identifier
        base_dir: Base directory for saving images (default: Backend/static/vehicle_images)
    
    Returns:
        URL path to saved image or None if failed
    """
    try:
        if base_dir is None:
            # Get Backend directory
            backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            base_dir = os.path.join(backend_dir, "static", "vehicle_images")
        
        # Create directory if it doesn't exist
        os.makedirs(base_dir, exist_ok=True)
        
        # Extract vehicle region
        x1, y1, x2, y2 = map(int, bbox)
        frame_height, frame_width = frame.shape[:2]
        x1 = max(0, x1)
        y1 = max(0, y1)
        x2 = min(frame_width, x2)
        y2 = min(frame_height, y2)
        
        if x2 <= x1 or y2 <= y1:
            logger.warning(f"Invalid bbox for vehicle {vehicle_id}: {bbox}")
            return None
        
        vehicle_roi = frame[y1:y2, x1:x2]
        
        if vehicle_roi.size == 0:
            logger.warning(f"Empty vehicle ROI for {vehicle_id}")
            return None
        
        # Generate filename
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f")
        filename = f"{camera_id}_{vehicle_id}_{timestamp}.jpg"
        filepath = os.path.join(base_dir, filename)
        
        # Save image
        cv2.imwrite(filepath, vehicle_roi)
        
        if not os.path.exists(filepath):
            logger.error(f"Failed to save vehicle image: {filepath}")
            return None
        
        # Return URL path (relative to static directory)
        url_path = f"/static/vehicle_images/{filename}"
        logger.info(f"Saved vehicle image: {url_path}")
        return url_path
        
    except Exception as e:
        logger.error(f"Error saving vehicle image: {e}", exc_info=True)
        return None

def detect_license_plate(frame, bbox) -> Optional[str]:
    """
    Detect license plate number from vehicle image using EasyOCR
    
    Args:
        frame: Full video frame (numpy array)
        bbox: Vehicle bounding box [x1, y1, x2, y2]
    
    Returns:
        Detected license plate number or None
    """
    try:
        reader = get_ocr_reader()
        if reader is None:
            logger.warning("EasyOCR reader not available")
            return None
        
        # Extract vehicle region (license plate is usually on the front/back)
        x1, y1, x2, y2 = map(int, bbox)
        frame_height, frame_width = frame.shape[:2]
        x1 = max(0, x1)
        y1 = max(0, y1)
        x2 = min(frame_width, x2)
        y2 = min(frame_height, y2)
        
        if x2 <= x1 or y2 <= y1:
            logger.warning(f"Invalid bbox for plate detection: {bbox}")
            return None
        
        vehicle_roi = frame[y1:y2, x1:x2]
        
        if vehicle_roi.size == 0:
            logger.warning("Empty vehicle ROI for plate detection")
            return None
        
        # Try multiple regions: bottom 30%, bottom 40%, and full vehicle
        roi_height = vehicle_roi.shape[0]
        roi_width = vehicle_roi.shape[1]
        
        regions_to_try = [
            vehicle_roi[int(roi_height * 0.6):, :],  # Bottom 40%
            vehicle_roi[int(roi_height * 0.7):, :],  # Bottom 30%
            vehicle_roi[int(roi_height * 0.5):, :],  # Bottom 50%
            vehicle_roi[:, int(roi_width * 0.2):int(roi_width * 0.8)],  # Center 60% width
            vehicle_roi  # Full vehicle as last resort
        ]
        
        all_candidates = []
        
        for region_idx, plate_region in enumerate(regions_to_try):
            if plate_region.size == 0:
                continue
            
            # Enhance image for better OCR
            # Convert to grayscale if needed
            if len(plate_region.shape) == 3:
                gray = cv2.cvtColor(plate_region, cv2.COLOR_BGR2GRAY)
            else:
                gray = plate_region
            
            # Try multiple enhancement techniques
            enhanced_images = []
            
            # 1. CLAHE (Contrast Limited Adaptive Histogram Equalization)
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
            enhanced1 = clahe.apply(gray)
            enhanced_images.append(enhanced1)
            
            # 2. Thresholding
            _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            enhanced_images.append(thresh)
            
            # 3. Adaptive thresholding
            adaptive = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
            enhanced_images.append(adaptive)
            
            # 4. Original grayscale (sometimes works better)
            enhanced_images.append(gray)
            
            # Perform OCR on all enhanced versions
            for img in enhanced_images:
                try:
                    # Resize if too small (OCR works better on larger images)
                    if img.shape[0] < 50 or img.shape[1] < 50:
                        scale = max(100 / img.shape[0], 100 / img.shape[1])
                        new_width = int(img.shape[1] * scale)
                        new_height = int(img.shape[0] * scale)
                        img = cv2.resize(img, (new_width, new_height), interpolation=cv2.INTER_CUBIC)
                    
                    results = reader.readtext(img, paragraph=False)
                    
                    for (bbox_coords, text, confidence) in results:
                        # Lower confidence threshold to catch more plates
                        if confidence < 0.2:
                            continue
                        
                        # Clean text (remove spaces, special chars, keep alphanumeric)
                        cleaned = ''.join(c for c in text.upper() if c.isalnum())
                        
                        # License plates typically have 4-12 alphanumeric characters
                        if 3 <= len(cleaned) <= 15:
                            all_candidates.append((cleaned, confidence, region_idx))
                            logger.debug(f"Found candidate: {cleaned} (confidence: {confidence:.2f}, region: {region_idx})")
                
                except Exception as e:
                    logger.debug(f"OCR error on enhanced image: {e}")
                    continue
        
        if not all_candidates:
            logger.info("No license plate candidates found")
            return None
        
        # Remove duplicates and sort by confidence
        unique_candidates = {}
        for text, conf, region in all_candidates:
            if text not in unique_candidates or conf > unique_candidates[text][0]:
                unique_candidates[text] = (conf, region)
        
        # Sort by confidence
        sorted_candidates = sorted(unique_candidates.items(), key=lambda x: x[1][0], reverse=True)
        
        # Validate and filter candidates (more lenient)
        validated_candidates = []
        for plate, (conf, region) in sorted_candidates:
            # Lower confidence threshold to catch more plates (0.3)
            if conf < 0.3:
                continue
            
            # Length validation (most plates are 3-12 chars)
            if len(plate) < 3 or len(plate) > 15:
                continue
            
            # More lenient validation - accept if it has reasonable structure
            has_letter = any(c.isalpha() for c in plate)
            has_digit = any(c.isdigit() for c in plate)
            
            # Prefer plates with both letters and numbers, but accept others if confidence is good
            if has_letter and has_digit:
                # Best case - has both
                validated_candidates.append((plate, conf + 0.1, region))  # Boost confidence
            elif has_letter or has_digit:
                # Accept if confidence is decent
                if conf >= 0.4:
                    validated_candidates.append((plate, conf, region))
            else:
                # Skip if no letters or digits
                continue
        
        if not validated_candidates:
            logger.debug("No validated license plate candidates found")
            return None
        
        # Sort by confidence again (after boosting)
        validated_candidates.sort(key=lambda x: x[1], reverse=True)
        
        # Return highest confidence validated result
        detected_plate, confidence, region = validated_candidates[0]
        
        # Return if confidence is reasonable (lowered to 0.3)
        if confidence >= 0.3:
            logger.info(f"✓ Detected license plate: {detected_plate} (confidence: {confidence:.2f}, region: {region})")
            return detected_plate
        else:
            logger.debug(f"License plate detected but confidence too low: {detected_plate} ({confidence:.2f})")
            return None
        
    except Exception as e:
        logger.error(f"Error detecting license plate: {e}", exc_info=True)
        return None

