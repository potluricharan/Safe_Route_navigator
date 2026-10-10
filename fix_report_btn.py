import io, re
with io.open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

report_btn = '''<button className="fab" style={{ background: '#f59e0b', color: '#000', fontWeight: 'bold', width: 'auto', padding: '0 16px', borderRadius: '24px', marginBottom: '12px', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)' }} onClick={() => setReportPoint(contextPoint)}>
              \u26a0\uFE0F Report Hazard
            </button>
            <button className="fab" style={{ background: '#3b82f6', color: 'white', fontWeight: 'bold', width: 'auto', padding: '0 16px', borderRadius: '24px', marginBottom: '12px', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)' }} onClick={handleNearestSafePlace}>'''

text = re.sub(r'<button className="fab" style=\{\{ background: \'#3b82f6\', color: \'white\', fontWeight: \'bold\', width: \'auto\', padding: \'0 16px\', borderRadius: \'24px\', marginBottom: \'12px\', boxShadow: \'0 4px 12px rgba\(59, 130, 246, 0\.4\)\' \}\} onClick=\{handleNearestSafePlace\}>', report_btn, text)

with io.open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
