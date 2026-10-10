import io, re
with io.open('src/config/app.ts', 'r', encoding='utf-8') as f:
    text = f.read()

def replacer(match):
    type_name = match.group(1)
    if type_name == 'poor_lighting': return 'icon: "\U0001F4A1",'
    if type_name == 'waterlogging': return 'icon: "\U0001F30A",'
    if type_name == 'accident': return 'icon: "\U0001F4A5",'
    if type_name == 'temporary_obstruction': return 'icon: "\U0001F6A7",'
    if type_name == 'road_damage': return 'icon: "\U0001F573\uFE0F",'
    if type_name == 'isolated_stretch': return 'icon: "\U0001F3DC\uFE0F",'
    return match.group(2)

# It's structured like:
# poor_lighting: {
#   ...
#   icon: "dY'?",
text = re.sub(r'([a_z_]+):\s*\{.*?icon:\s*".*?",', lambda m: m.group(0).replace(m.group(0).split('icon:')[1].split(',')[0].strip(), replacer(m)), text, flags=re.DOTALL)

with io.open('src/config/app.ts', 'w', encoding='utf-8') as f:
    f.write(text)
