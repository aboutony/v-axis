import shutil
import os

src = r'C:\Users\fahme\Downloads\V-AXIS\New UI UX'
dst = r'apps/web/src'

try:
    for item in os.listdir(src):
        s = os.path.join(src, item)
        d = os.path.join(dst, item)
        print(f'Processing: {item}')
        if os.path.isdir(s):
            if os.path.exists(d):
                shutil.rmtree(d)
            shutil.copytree(s, d)
        else:
            shutil.copy2(s, d)
    print('SUCCESS: All files copied')
except Exception as e:
    print(f'ERROR: {e}')