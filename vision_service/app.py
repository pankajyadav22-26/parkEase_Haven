import os
import cv2
import numpy as np
import requests
from flask import Flask, request, jsonify
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3000/api/slotoperations/updateSlotStatus")


PROTOTXT = "MobileNetSSD_deploy.prototxt"
MODEL = "MobileNetSSD_deploy.caffemodel"

CLASSES = ["background", "aeroplane", "bicycle", "bird", "boat",
           "bottle", "bus", "car", "cat", "chair", "cow", "diningtable",
           "dog", "horse", "motorbike", "person", "pottedplant", "sheep",
           "sofa", "train", "tvmonitor"]

VALID_VEHICLES = ["car", "bus", "motorbike", "truck"]

print("Loading AI Model...")
try:
    net = cv2.dnn.readNetFromCaffe(PROTOTXT, MODEL)
    print("Model Loaded Successfully!")
except Exception as e:
    print(f"CRITICAL ERROR: Could not load AI model. Check files. {e}")

SLOT_ROIS = {
    "Slot1": (213, 205, 721, 343),
    "Slot2": (221, 579, 712, 384),
    "Slot3": (210, 991, 722, 387),
    "Slot4": (1833, 203, 742, 351),
    "Slot5": (1833, 576, 744, 390),
    "Slot6": (1835, 995, 742, 373)
}

def analyze_slot_with_ai(slot_image):
    """
    Uses MobileNet SSD to check if a CAR/BUS/MOTORBIKE is present.
    Ignores people, dogs, debris.
    """
    (h, w) = slot_image.shape[:2]
    
    blob = cv2.dnn.blobFromImage(cv2.resize(slot_image, (300, 300)), 0.007843,
        (300, 300), 127.5)

    net.setInput(blob)
    detections = net.forward()

    for i in range(detections.shape[2]):
        confidence = detections[0, 0, i, 2]

        if confidence > 0.4:
            idx = int(detections[0, 0, i, 1])
            detected_class = CLASSES[idx]

            if detected_class in VALID_VEHICLES:
                print(f"Vehicle Detected: {detected_class} ({confidence*100:.1f}%)")
                return "occupied"
            
            elif detected_class == "person":
                print(f"Ignored Object: Person detected in slot.")

    return "available"

@app.route('/process_image', methods=['POST'])
def process_image():
    img_bytes = None

    if 'image' in request.files:
        file = request.files['image']
        img_bytes = file.read()
    
    elif request.data:
        img_bytes = request.data

    if img_bytes is None or len(img_bytes) == 0:
        return jsonify({"error": "No image uploaded"}), 400

    np_arr = np.frombuffer(img_bytes, np.uint8)
    full_image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if full_image is None: 
        return jsonify({"error": "Invalid image decoding"}), 400

    h, w = full_image.shape[:2]
    if h > w:
        full_image = cv2.rotate(full_image, cv2.ROTATE_90_CLOCKWISE)

    results = []
    
    img_h, img_w = full_image.shape[:2]
    for slot_name, (x, y, w, h) in SLOT_ROIS.items():
        x, y = max(0, x), max(0, y)
        w, h = min(w, img_w - x), min(h, img_h - y)
        
        if w <= 0 or h <= 0:
            results.append({"slotName": slot_name, "status": "error_bounds"})
            continue

        slot_crop = full_image[y:y+h, x:x+w]
        status = analyze_slot_with_ai(slot_crop)
        
        results.append({
            "slotName": slot_name,
            "status": status
        })

    try:
        if BACKEND_URL:
            requests.post(BACKEND_URL, json=results, timeout=5)
            print("Backend updated successfully!")
    except Exception as e:
        print(f"Backend Connection Failed: {e}")

    return jsonify({"results": results})

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5002))
    app.run(host='0.0.0.0', port=port)