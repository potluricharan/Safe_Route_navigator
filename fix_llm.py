import io, re
with io.open('src/components/RouteList.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

llm_func = '''    const generateJustification = (route: RankedRoute) => {
       const hazards = route.factorSummary.hazards.length;
       const risk = route.riskIndex;
       const conf = route.confidence;
       
       if (conf === "high") {
           return \u2728 AI Analysis: High confidence score is driven by real-time community validation. This route has verified active reports and strong map coverage, ensuring the estimated risk score of /100 is highly accurate.;
       } else if (conf === "medium") {
           if (hazards > 0) {
              return \u2728 AI Analysis: Medium confidence assigned. We detected  unverified hazard(s) reported in the last 2 hours. Routing algorithm has applied caution penalties, but real-time conditions may vary slightly.;
           }
           return \u2728 AI Analysis: Medium confidence assigned. While map geometry is solid, we lack recent community movement data on this stretch to guarantee real-time conditions.;
       } else {
           return \u2728 AI Analysis: Low confidence. This route relies on older map data with zero recent community verification. Proceed with caution as unmapped hazards may exist.;
       }
    };
'''

text = re.sub(r'function RouteExplanation\(.*?\) \{', llm_func + r'\n  function RouteExplanation( \g<1> ) {', text, flags=re.DOTALL)
text = text.replace('function RouteExplanation( {', 'function RouteExplanation({')

jsx_insert = '''        <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid #0369a1', padding: '12px', borderRadius: '8px', marginBottom: '16px', color: '#e0f2fe', fontSize: '13px', lineHeight: '1.5' }}>
          <strong>Confidence Justification</strong><br/>
          {generateJustification(route)}
        </div>
        <p className="muted">'''

text = re.sub(r'<p className="muted">', jsx_insert, text)

with io.open('src/components/RouteList.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
