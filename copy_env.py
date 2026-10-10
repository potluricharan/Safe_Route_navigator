import io
import os

if os.path.exists('.env.example'):
    with io.open('.env.example', 'r', encoding='utf-8') as f:
        content = f.read()
    
    with io.open('.env', 'w', encoding='utf-8') as f:
        f.write(content)
