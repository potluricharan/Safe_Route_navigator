import type { DataProvider } from "../types";
import { MockProvider } from "./mockProvider";
import { firebaseEnvConfig, FirestoreProvider } from "./firestoreProvider";

let provider: DataProvider | null = null;

/**
 * Choose the data backend. With a Firebase web config present we use Firestore
 * (real-time, multi-device); otherwise we fall back to the seeded local demo
 * provider so the prototype opens with zero configuration.
 */
export function createDataProvider(): DataProvider {
  if (provider) return provider;
  const cfg = firebaseEnvConfig();
  // Firestore is only awaited behind a config check so the demo never fails on import.
  provider = cfg
    ? (new FirestoreProvider(cfg) as DataProvider)
    : new MockProvider();
  return provider;
}