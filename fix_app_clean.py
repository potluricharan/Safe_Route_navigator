import io
with io.open('src/App.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = lines[:407] + lines[426:]

with io.open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
