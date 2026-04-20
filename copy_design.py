import shutil
import os

src_dir = r'C:\Users\fahme\Downloads\V-AXIS\New UI UX\V-AXIS Intelligence Portal Design'
dst_dir = r'apps/web/src'

try:
    # Remove existing src contents except config files
    for item in os.listdir(dst_dir):
        if item not in ['vite-env.d.ts', 'index.html', 'package.json', 'tsconfig.json', 'vercel.json', 'tsconfig.build.json']:
            item_path = os.path.join(dst_dir, item)
            if os.path.isdir(item_path):
                shutil.rmtree(item_path)
            else:
                os.remove(item_path)
    
    # Copy new design files
    for item in os.listdir(src_dir):
        s = os.path.join(src_dir, item)
        d = os.path.join(dst_dir, item)
        if os.path.isdir(s):
            shutil.copytree(s, d, dirs_exist_ok=True)
        else:
            shutil.copy2(s, d)
    
    print('SUCCESS: Design files copied')
except Exception as e:
    print(f'ERROR: {e}')
    import traceback
    traceback.print_exc()