import os
from PIL import Image

image_paths = [
    'app_logo_main_1782592690933.png',
    'appsintoss-logo.png',
    'test-app/icon.png'
]

for p in image_paths:
    if os.path.exists(p):
        with Image.open(p) as img:
            print(f"Image: {p}")
            print(f"  Format: {img.format}")
            print(f"  Size: {img.size} (Width x Height)")
            print(f"  Mode: {img.mode} (RGB/RGBA/etc.)")
    else:
        print(f"Not found: {p}")
