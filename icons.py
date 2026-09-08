"""Rasterize the existing favicon geometry; Pillow is needed only to regenerate icons."""
from pathlib import Path
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parent.parent / 'icons'
ROOT.mkdir(exist_ok=True)
# The coordinates match src/favicon.svg; supersampling preserves clean edges.
for size, name, maskable in [(180, 'apple-touch-icon', False), (192, 'icon-192', False), (512, 'icon-512', False), (512, 'maskable-512', True)]:
    scale = size * 4 / 40
    image = Image.new('RGB', (size * 4, size * 4), '#122723')
    draw = ImageDraw.Draw(image)
    points = [(11,11),(30,11),(30,16),(16,16),(16,21),(27,21),(27,26),(16,26),(16,33),(11,33)]
    # Inset the mark into the central 60% for circular/squircle adaptive masks.
    if maskable: points = [(20 + (x-20)*0.6, 20 + (y-20)*0.6) for x,y in points]
    draw.polygon([(round(x*scale),round(y*scale)) for x,y in points], fill='#b9efd9')
    image.resize((size,size), Image.Resampling.LANCZOS).save(ROOT / (name+'.png'))
