import cv2
import json
import argparse
import os

parser = argparse.ArgumentParser(description="ParkEase ROI Calibrator")
parser.add_argument("--image", required=True, help="Path to the parking lot image (e.g., Parking.png)")
parser.add_argument("--prefix", required=True, help="MQTT Topic Prefix for this location (e.g., lot_nitd_MiniCampus)")
args = parser.parse_args()

img = cv2.imread(args.image)

if img is None:
    print(f"Error: Could not read '{args.image}'. Make sure the file exists in this folder.")
    exit()

if not os.path.exists("rois"):
    os.makedirs("rois")

output_file = f"rois/{args.prefix}.json"

print("------------------------------------------------")
print(f"Calibrating for Parking Lot: {args.prefix}")
print(f"Output will be saved to: {output_file}")
print("INSTRUCTIONS:")
print("1. Click and drag to draw a box around a slot.")
print("2. Press SPACE or ENTER to confirm the selection.")
print("3. Press 'c' to cancel the selection.")
print("4. Press ESC when you are finished marking all slots.")
print("------------------------------------------------")

rois = {}
slot_count = 1

while True:
    r = cv2.selectROI(f"Select Slot {slot_count}", img, fromCenter=False, showCrosshair=True)
    
    if r == (0, 0, 0, 0):
        break
        
    x, y, w, h = int(r[0]), int(r[1]), int(r[2]), int(r[3])
    
    rois[f"Slot{slot_count}"] = [x, y, w, h]
    
    print(f"Recorded Slot{slot_count}: ({x}, {y}, {w}, {h})")
    
    cv2.rectangle(img, (x, y), (x+w, y+h), (0, 255, 0), 2)
    slot_count += 1

cv2.destroyAllWindows()

if rois:
    with open(output_file, 'w') as f:
        json.dump(rois, f, indent=4)
    print(f"\n SUCCESS: ROIs saved to {output_file}")
    print(f"The AI Engine is now ready to process '{args.prefix}'!")
else:
    print("\nNo ROIs were selected. Exiting without saving.")