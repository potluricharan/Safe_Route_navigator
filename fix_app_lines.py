import io
with io.open('src/config/app.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'icon:' in line and 'icon: string' not in line:
        context = "".join(lines[max(0, i-10):i])
        if 'poor_lighting' in context:
            lines[i] = '    icon: "\U0001F4A1",\n'
        elif 'waterlogging' in context:
            lines[i] = '    icon: "\U0001F30A",\n'
        elif 'accident' in context:
            lines[i] = '    icon: "\U0001F4A5",\n'
        elif 'temporary_obstruction' in context:
            lines[i] = '    icon: "\U0001F6A7",\n'
        elif 'road_damage' in context:
            lines[i] = '    icon: "\U0001F573\uFE0F",\n'
        elif 'isolated_stretch' in context:
            lines[i] = '    icon: "\U0001F3DC\uFE0F",\n'

with io.open('src/config/app.ts', 'w', encoding='utf-8') as f:
    f.writelines(lines)
