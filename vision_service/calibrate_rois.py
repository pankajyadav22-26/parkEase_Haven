import cv2

image_path = 'parking.png' 
img = cv2.imread(image_path)

if img is None:
    print(f"Error: Could not read {image_path}. Make sure the file exists.")
    exit()

print("------------------------------------------------")
print("INSTRUCTIONS:")
print("1. Click and drag to draw a box around a slot.")
print("2. Press SPACE or ENTER to confirm the selection.")
print("3. Press 'c' to cancel the selection.")
print("4. Press ESC to finish and see coordinates.")
print("------------------------------------------------")

rois = []
slot_count = 1

while True:
    r = cv2.selectROI("Select Slot " + str(slot_count), img, fromCenter=False, showCrosshair=True)
    
    if r == (0, 0, 0, 0):
        break
        
    x, y, w, h = int(r[0]), int(r[1]), int(r[2]), int(r[3])
    rois.append((f"Slot{slot_count}", (x, y, w, h)))
    
    print(f"Recorded Slot{slot_count}: ({x}, {y}, {w}, {h})")
    
    cv2.rectangle(img, (x, y), (x+w, y+h), (0, 255, 0), 2)
    slot_count += 1

cv2.destroyAllWindows()

print("\n\n--- COPY THIS INTO app.py ---")
print("SLOT_ROIS = {")
for name, coords in rois:
    print(f'    "{name}": {coords},')
print("}")
print("-----------------------------")