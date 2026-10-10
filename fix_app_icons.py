import io
with io.open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace the emoji array with JSX SVGs
target = '''              {[
                { id: "driving", icon: "\U0001F697", label: "Drive" },
                { id: "bike", icon: "\U0001F6B2", label: "Ride" },
                { id: "foot", icon: "\U0001F6B6", label: "Walk" }
              ]'''

replacement = '''              {[
                { id: "driving", icon: <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 12 10s-6.7.6-8.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><path d="m5 11 1.5-5.5C6.8 4.6 7.8 4 9 4h6c1.2 0 2.2.6 2.5 1.5L19 11"/><circle cx="6.5" cy="16.5" r="1.5"/><circle cx="17.5" cy="16.5" r="1.5"/></svg>, label: "Drive" },
                { id: "bike", icon: <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm-3 11.5V14l-3-3 4-3 2 3h2"/><path d="m10.5 13.5-3-3"/></svg>, label: "Ride" },
                { id: "foot", icon: <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"/><path d="m9 20 2.5-4L11 10.5 10 9 8 10"/><path d="m11 16 3-4.5L12 9l-2-2 1-3"/><path d="m15 11.5 2 1.5"/><path d="m15 20-3-5"/></svg>, label: "Walk" }
              ]'''

text = text.replace(target, replacement)

with io.open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
