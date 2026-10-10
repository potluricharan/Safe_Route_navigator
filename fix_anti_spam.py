import io
with io.open('src/services/mockProvider.ts', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''    if (!this.underRateLimit(input.reporterId, now)) {
      return {
        ok: false,
        reason: "rate_limited",
        message: "You are reporting too often. Please wait before adding another report."
      };
    }'''

text = text.replace(target, '')

with io.open('src/services/mockProvider.ts', 'w', encoding='utf-8') as f:
    f.write(text)
