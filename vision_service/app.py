import os
import cv2
import numpy as np
import requests
import json
import logging
from flask import Flask, request, jsonify
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3000/api/slotoperations/updateSlotStatus")
PORT = int(os.getenv("PORT", 5002))

PROTOTXT = "MobileNetSSD_deploy.prototxt"
MODEL = "MobileNetSSD_deploy.caffemodel"

CLASSES = ["background", "aeroplane", "bicycle", "bird", "boat",
           "bottle", "bus", "car", "cat", "chair", "cow", "diningtable",
           "dog", "horse", "motorbike", "person", "pottedplant", "sheep",
           "sofa", "train", "tvmonitor"]

VALID_VEHICLES = ["car", "bus", "motorbike", "truck"]

print("[SYSTEM] Loading Global AI Model...")
try:
    net = cv2.dnn.readNetFromCaffe(PROTOTXT, MODEL)
    print("[SYSTEM] Model Loaded Successfully!")
except Exception as e:
    print(f"[CRITICAL ERROR] Could not load AI model. Check files. {e}")

def get_rois_for_lot(lot_prefix):
    """Loads the specific ROI JSON file for the requested parking lot."""
    if not os.path.exists("rois"):
        os.makedirs("rois")
        
    roi_file = f"rois/{lot_prefix}.json"
    
    if os.path.exists(roi_file):
        with open(roi_file, 'r') as f:
            return json.load(f)
    else:
        print(f"[Warning] No ROI file found at {roi_file}")
        return None

def analyze_slot_with_ai(slot_image):
    (h, w) = slot_image.shape[:2]
    blob = cv2.dnn.blobFromImage(cv2.resize(slot_image, (300, 300)), 0.007843, (300, 300), 127.5)
    net.setInput(blob)
    detections = net.forward()

    for i in range(detections.shape[2]):
        confidence = detections[0, 0, i, 2]
        if confidence > 0.4:
            idx = int(detections[0, 0, i, 1])
            if CLASSES[idx] in VALID_VEHICLES:
                return "occupied"
    return "available"

@app.route('/process_image', methods=['POST'])
def process_image():
    lot_prefix = request.form.get('lotPrefix')
    if not lot_prefix:
        print("[Error] Missing lotPrefix in incoming request.")
        return jsonify({"error": "Missing lotPrefix in request"}), 400

    print(f"[Vision AI] Analyzing slots for: {lot_prefix}")

    img_bytes = None
    if 'image' in request.files:
        img_bytes = request.files['image'].read()

    if not img_bytes:
        print(f"[Error] No image uploaded for {lot_prefix}.")
        return jsonify({"error": "No image uploaded"}), 400

    SLOT_ROIS = get_rois_for_lot(lot_prefix)
    if not SLOT_ROIS:
        return jsonify({"error": f"No ROI configuration found for {lot_prefix}. Calibrate it first!"}), 404

    np_arr = np.frombuffer(img_bytes, np.uint8)
    full_image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    h, w = full_image.shape[:2]
    if h > w:
        full_image = cv2.rotate(full_image, cv2.ROTATE_90_CLOCKWISE)

    results = []
    img_h, img_w = full_image.shape[:2]
    
    for slot_name, coords in SLOT_ROIS.items():
        x, y, box_w, box_h = coords
        x, y = max(0, x), max(0, y)
        box_w, box_h = min(box_w, img_w - x), min(box_h, img_h - y)
        
        if box_w <= 0 or box_h <= 0:
            continue

        slot_crop = full_image[y:y+box_h, x:x+box_w]
        status = analyze_slot_with_ai(slot_crop)
        
        results.append({
            "slotName": slot_name,
            "status": status
        })

    payload = {
        "lotPrefix": lot_prefix,
        "updates": results
    }

    try:
        if BACKEND_URL:
            res = requests.post(BACKEND_URL, json=payload, timeout=5)
            if res.status_code == 200:
                print(f"[Backend] Successfully updated database for {lot_prefix}")
            else:
                print(f"[Backend Error] Status {res.status_code}: {res.text}")
    except Exception as e:
        print(f"[Backend Error] Connection Failed: {e}")

    return jsonify({"lotPrefix": lot_prefix, "updates": results})

if __name__ == '__main__':
    print(f"[SYSTEM] Global AI Engine Online (Port {PORT})")
    app.run(host='0.0.0.0', port=PORT)