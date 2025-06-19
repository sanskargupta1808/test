import cv2
import argparse

parser = argparse.ArgumentParser(description='Apply coordinate axes to an image')
parser.add_argument('image', help='Path to the input image')
parser.add_argument('--output', default='output_with_axes.png', help='Path for the output image')
args = parser.parse_args()

img = cv2.imread(args.image)
if img is None:
    raise FileNotFoundError(f'Could not read {args.image}')

h, w = img.shape[:2]
center = (w // 2, h // 2)
length = min(w, h) // 3

# draw X axis in red
cv2.arrowedLine(img, center, (center[0] + length, center[1]), (0, 0, 255), 2, tipLength=0.05)
cv2.putText(img, 'X', (center[0] + length + 5, center[1] + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)

# draw Y axis in green
cv2.arrowedLine(img, center, (center[0], center[1] - length), (0, 255, 0), 2, tipLength=0.05)
cv2.putText(img, 'Y', (center[0] - 20, center[1] - length - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

# mark origin
cv2.circle(img, center, 4, (255, 0, 0), -1)
cv2.putText(img, 'O', (center[0] + 5, center[1] - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2)

cv2.imwrite(args.output, img)
print('Saved', args.output)
