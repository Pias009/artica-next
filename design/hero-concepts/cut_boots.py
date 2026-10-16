"""Cut the premium studio boots out of their backgrounds (rembg, isnet-general-use) and trim to the boot."""
import sys
from PIL import Image
from rembg import new_session, remove

session = new_session("isnet-general-use")
for src, dst in zip(sys.argv[1::2], sys.argv[2::2]):
    im = Image.open(src).convert("RGB")
    out = remove(im, session=session, post_process_mask=True)
    bbox = out.getchannel("A").point(lambda a: 255 if a > 24 else 0).getbbox()
    out = out.crop(bbox)
    out.save(dst, "WEBP", quality=94, method=6)
    print(dst, out.size)
