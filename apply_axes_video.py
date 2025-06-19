import cv2
import argparse
import os

parser = argparse.ArgumentParser(description='Apply coordinate axes to a video')
parser.add_argument('video', help='Path to the input video file')
parser.add_argument('--output', default='output_with_axes.mp4', help='Output video path')
args = parser.parse_args()

cap = cv2.VideoCapture(args.video)
if not cap.isOpened():
    raise FileNotFoundError(f'Could not open {args.video}')

# Get video properties
fps = cap.get(cv2.CAP_PROP_FPS)
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

fourcc = cv2.VideoWriter_fourcc(*'mp4v')
os.makedirs(os.path.dirname(args.output), exist_ok=True) if os.path.dirname(args.output) else None
out = cv2.VideoWriter(args.output, fourcc, fps, (width, height))

center = (width // 2, height // 2)
length = min(width, height) // 3

while True:
    ret, frame = cap.read()
    if not ret:
        break
    # draw axes on frame
    cv2.arrowedLine(frame, center, (center[0] + length, center[1]), (0, 0, 255), 2, tipLength=0.05)
    cv2.putText(frame, 'X', (center[0] + length + 5, center[1] + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
    cv2.arrowedLine(frame, center, (center[0], center[1] - length), (0, 255, 0), 2, tipLength=0.05)
    cv2.putText(frame, 'Y', (center[0] - 20, center[1] - length - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
    cv2.circle(frame, center, 4, (255, 0, 0), -1)
    cv2.putText(frame, 'O', (center[0] + 5, center[1] - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2)
    out.write(frame)

cap.release()
out.release()
print('Saved', args.output)
