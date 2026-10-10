import io, re
with io.open('src/services/routing.ts', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''  try {
    const routes = await attempt("foot");
    if (routes.length) return routes;
  } catch {
    /* fall through to driving profile */
  }
  try {
    return await attempt("driving");
  } catch (e) {
    throw new Error("Routing provider unavailable: " + String(e));
  }'''

replacement = '''  let footRoutes: RouteCandidate[] = [];
  let drivingRoutes: RouteCandidate[] = [];
  try {
    footRoutes = await attempt("foot");
  } catch {
    // Ignore foot failure
  }
  try {
    drivingRoutes = await attempt("driving");
  } catch {
    // Ignore driving failure
  }
  
  if (footRoutes.length === 0 && drivingRoutes.length === 0) {
    throw new Error("Routing provider unavailable");
  }
  
  return [...footRoutes, ...drivingRoutes];'''

text = text.replace(target, replacement)

with io.open('src/services/routing.ts', 'w', encoding='utf-8') as f:
    f.write(text)
