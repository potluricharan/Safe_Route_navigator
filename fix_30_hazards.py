import io, re

with io.open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

random_loop = '''      // Add 30 random hazards across Vijayawada and Guntur
      const types = ["waterlogging", "accident", "lighting", "isolated", "damage"];
      const severities = ["low", "medium", "high"];
      for (let i = 0; i < 30; i++) {
         const rand = Math.random();
         let lat, lng;
         if (rand < 0.6) {
            lat = 16.48 + Math.random() * 0.07;
            lng = 80.60 + Math.random() * 0.08;
         } else if (rand < 0.8) {
            lat = 16.28 + Math.random() * 0.07;
            lng = 80.40 + Math.random() * 0.08;
         } else {
            lat = 16.35 + Math.random() * 0.13;
            lng = 80.48 + Math.random() * 0.12;
         }
         newHazards.push({
            id: "demo-rand-" + i,
            type: types[Math.floor(Math.random() * types.length)],
            severity: severities[Math.floor(Math.random() * severities.length)],
            lat, lng,
            createdAt: Date.now() - Math.random() * 86400000,
            updatedAt: Date.now(),
            expiresAt: Date.now() + 86400000,
            confirmations: Math.floor(Math.random() * 10),
            denials: Math.floor(Math.random() * 3),
            status: "active", reporterId: "demo-random", isDemoData: true, note: "Random community report"
         });
      }
      
      setDemoHazards(newHazards);'''

text = re.sub(r'setDemoHazards\(newHazards\);', random_loop, text)

with io.open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
