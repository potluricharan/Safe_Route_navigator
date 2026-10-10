import io, re
with io.open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''      // Add 30 random hazards across Vijayawada and Guntur
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
      }'''

replacement = '''      // Add 30 random hazards across Vijayawada and Guntur
      const types = ["waterlogging", "accident", "lighting", "isolated", "damage"];
      const severities = ["low", "medium", "high"];
      const descriptions: Record<string, string[]> = {
          "waterlogging": ["Knee-deep water after rain", "Blocked drain causing flood", "Slight water pooling", "Heavy waterlogging under bridge"],
          "accident": ["Frequent accident spot", "Blind curve collision", "Minor fender bender", "Intersection crash zone"],
          "lighting": ["Completely dark stretch", "Flickering streetlights", "No streetlights working", "Pitch black alleyway"],
          "isolated": ["Deserted road after 9PM", "No shops or houses around", "Known unsafe stretch", "Very lonely road"],
          "damage": ["Massive pothole", "Road dug up for pipeline", "Broken pavement", "Severe road damage"]
      };

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
         const t = types[Math.floor(Math.random() * types.length)];
         const descs = descriptions[t];
         const note = descs[Math.floor(Math.random() * descs.length)];
         
         newHazards.push({
            id: "demo-rand-" + i,
            type: t,
            severity: severities[Math.floor(Math.random() * severities.length)],
            lat, lng,
            createdAt: Date.now() - Math.random() * 86400000,
            updatedAt: Date.now(),
            expiresAt: Date.now() + 86400000,
            confirmations: Math.floor(Math.random() * 10),
            denials: Math.floor(Math.random() * 3),
            status: "active", reporterId: "demo-random", isDemoData: true, note
         });
      }'''

text = text.replace(target, replacement)
with io.open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
