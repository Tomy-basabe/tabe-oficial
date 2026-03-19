import os
import colorsys
from PIL import Image

def process_image(img_path, theme, hue_shift=0):
    img = Image.open(img_path).convert('RGBA')
    width, height = img.size
    pixels = img.load()

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            
            h, s, v = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
            
            if theme in ["white", "black"]:
                s = 0.0
                if theme == "white":
                    if v > 0.2:
                        v = 0.95 # Near White T and border
                    else:
                        v = 0.05 # Very dark background
                elif theme == "black":
                    if v > 0.2:
                        v = 0.4 # Dark Grey T and border
                    else:
                        v = 0.05 # Very dark background
            else:
                h = (h + (hue_shift / 360.0)) % 1.0
                
            nr, ng, nb = colorsys.hsv_to_rgb(h, s, v)
            pixels[x, y] = (int(nr * 255), int(ng * 255), int(nb * 255), a)
            
    return img

base_path = "public/logos/logo-gold.png"

themes = {
    "cyan": 141,
    "green": 97,
    "red": -45,
    "pink": 285,
    "purple": 225,
    "white": 0,
    "black": 0,
    "gold": 0 # Just copy it essentially, or rather we don't need to generate gold, it's the base
}

for name, shift in themes.items():
    if name == "gold": continue
    try:
        new_img = process_image(base_path, name, shift)
        new_img.save(f"public/logos/logo-{name}.png")
        print(f"Generated logo-{name}.png")
    except Exception as e:
        print(f"Error generating {name}: {e}")

print("Done generating logos.")
