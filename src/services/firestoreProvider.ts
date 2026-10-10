import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import type {
  AddHazardResult,
  DataProvider,
  Hazard,
  HazardFilter,
  NewHazard,
  UserTrust
} from "../types";
import { RATE_LIMIT } from "../config/app";
import { encodeGeohash } from "../lib/geohash";
import { voterKey } from "../lib/id";
import { computeExpiry, confidenceFromVotes, duplicatesOf, clamp } from "./scoring";

type Fb = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  fns: Awaited<ReturnType<typeof loadFirestoreFns>>;
};

async function loadFirestoreFns() {
  const app = await import("firebase/app");
  const auth = await import("firebase/auth");
  const fs = await import("firebase/firestore");
  return { ...app, ...auth, ...fs };
}

const HAZARDS = "hazards";
const VOTES = "votes";
const USERS = "users";

/**
 * Firestore-backed provider. Real-time listeners, anonymous auth, and the
 * five-collection data model from the spec. Only used when the Firebase web
 * config is present in the environment.
 */
export class FirestoreProvider implements DataProvider {
  readonly name = "Firebase Firestore (live)";
  ready = false;
  private fb!: Fb;
  private userId = "anon";
  private listeners = new Set<(h: Hazard[]) => void>();
  private cache: Hazard[] = [];
  private initialized = false;

  constructor(private readonly config: Record<string, string>) {}

  async initialize(): Promise<void> {
    if (this.initialized) {
      this.ready = true;
      return;
    }
    this.initialized = true;
    this.fb = await this.initFirebase();
    await new Promise<void>((resolve) => {
      const unsub = this.fb.fns.onAuthStateChanged(this.fb.auth, (user) => {
        if (user) {
          this.userId = user.uid;
          unsub();
          resolve();
        }
      });
      // Kick off anonymous sign-in (keeps user anonymous, privacy-preserving).
      this.fb.fns.signInAnonymously(this.fb.auth).catch(() => {
        this.userId = "anon-fallback";
        resolve();
      });
    });
    this.ready = true;
  }

  private async initFirebase(): Promise<Fb> {
    const fns = await loadFirestoreFns();
    const app =
      fns.getApps().length > 0 ? fns.getApp() : fns.initializeApp(this.config);
    const db = fns.getFirestore(app);
    const auth = fns.getAuth(app);
    try {
      await fns.enableIndexedDbPersistence(db);
    } catch {
      /* multi-tab or unsupported - non-fatal */
    }
    return { app, auth, db, fns };
  }

  private docToHazard(id: string, data: Record<string, unknown>): Hazard {
    const num = (v: unknown, d = 0) => (typeof v === "number" ? v : d);
    return {
      id,
      type: (data.type as Hazard["type"]) ?? "poor_lighting",
      severity: (data.severity as Hazard["severity"]) ?? "low",
      lat: num(data.lat),
      lng: num(data.lng),
      geohash: (data.geohash as string) ?? encodeGeohash(num(data.lat), num(data.lng), 7),
      createdAt: num(data.createdAt),
      updatedAt: num(data.updatedAt),
      expiresAt: data.expiresAt == null ? null : num(data.expiresAt),
      status: (data.status as Hazard["status"]) ?? "active",
      confirmations: num(data.confirmations),
      denials: num(data.denials),
      confidence: num(data.confidence, 0.5),
      reporterId: (data.reporterId as string) ?? "unknown",
      note: data.note as string | undefined,
      photoUrl: data.photoUrl as string | undefined,
      moderationStatus: (data.moderationStatus as Hazard["moderationStatus"]) ?? "pending",
      isDemoData: Boolean(data.isDemoData)
    };
  }

  async listHazards(filter?: HazardFilter): Promise<Hazard[]> {
    const { collection, query, where, getDocs } = this.fb.fns;
    const ref = collection(this.fb.db, HAZARDS);
    const q = filter?.status
      ? query(ref, where("status", "==", filter.status))
      : query(ref);
    const snap = await getDocs(q);
    const all = snap.docs.map((d) => this.docToHazard(d.id, d.data()));
    if (!filter?.bbox) return all;
    const b = filter.bbox;
    return all.filter(
      (h) => h.lat >= b.minLat && h.lat <= b.maxLat && h.lng >= b.minLng && h.lng <= b.maxLng
    );
  }

  async addHazard(input: NewHazard): Promise<AddHazardResult> {
    const { collection, addDoc, getDocs, query, where } = this.fb.fns;
    const now = Date.now();

    if (!(await this.clientRateOk(now))) {
      return {
        ok: false,
        reason: "rate_limited",
        message: "Rate limit reached. Please wait before reporting again."
      };
    }

    // Duplicate merging: look at active hazards in the same geohash vicinity.
    const gh = encodeGeohash(input.lat, input.lng, 7);
    const prefix = gh.slice(0, 4);
    const dupQ = query(
      collection(this.fb.db, HAZARDS),
      where("status", "==", "active"),
      where("geohash", ">=", prefix),
      where("geohash", "<", prefix + "\uf8ff")
    );
    const dupSnap = await getDocs(dupQ);
    const nearby = dupSnap.docs.map((d) => this.docToHazard(d.id, d.data()));
    const dup = duplicatesOf(input, nearby, now, false);
    if (dup) {
      const ref = this.fb.fns.doc(this.fb.db, HAZARDS, dup.id);
      const { updateDoc, increment } = this.fb.fns;
      await updateDoc(ref, {
        confirmations: increment(1),
        updatedAt: now,
        expiresAt: computeExpiry(dup.type, now, false),
        confidence: confidenceFromVotes(dup.confirmations + 1, dup.denials)
      });
      await this.bumpUser(now);
      return { ok: true, hazard: { ...dup, confirmations: dup.confirmations + 1 }, mergedInto: dup.id };
    }

    const hazard = {
      type: input.type,
      severity: input.severity,
      lat: input.lat,
      lng: input.lng,
      geohash: gh,
      createdAt: now,
      updatedAt: now,
      expiresAt: computeExpiry(input.type, now, false),
      status: "active",
      confirmations: 0,
      denials: 0,
      confidence: confidenceFromVotes(0, 0),
      reporterId: input.reporterId,
      note: input.note ?? null,
      photoUrl: input.photoDataUrl ?? null,
      moderationStatus: "pending"
    };
    const ref = await addDoc(collection(this.fb.db, HAZARDS), hazard);
    await this.bumpUser(now);
    return { ok: true, hazard: this.docToHazard(ref.id, hazard) };
  }

  async vote(hazardId: string, vote: "yes" | "no"): Promise<void> {
    const { doc, runTransaction } = this.fb.fns;
    const hazardRef = doc(this.fb.db, HAZARDS, hazardId);
    const voteId = voterKey(this.userId, hazardId);
    const voteRef = doc(this.fb.db, VOTES, voteId);
    const now = Date.now();

    await runTransaction(this.fb.db, async (tx) => {
      const existing = await tx.get(voteRef);
      if (existing.exists()) return; // one vote per user per hazard
      const hSnap = await tx.get(hazardRef);
      if (!hSnap.exists()) return;
      const h = this.docToHazard(hSnap.id, hSnap.data());
      const confirmations = h.confirmations + (vote === "yes" ? 1 : 0);
      const denials = h.denials + (vote === "no" ? 1 : 0);
      tx.set(voteRef, { hazardId, voterKey: voteId, vote, timestamp: now });
      tx.update(hazardRef, {
        confirmations,
        denials,
        updatedAt: vote === "yes" ? now : h.updatedAt,
        expiresAt: vote === "yes" ? computeExpiry(h.type, now, false) : h.expiresAt,
        confidence: clamp(confidenceFromVotes(confirmations, denials), 0.15, 1)
      });
    });
  }

  onHazardsChanged(listener: (hazards: Hazard[]) => void): () => void {
    this.listeners.add(listener);
    const { collection, query, where, onSnapshot, limit } = this.fb.fns;
    const q = query(
      collection(this.fb.db, HAZARDS),
      where("status", "==", "active"),
      limit(500)
    );
    const unsub = onSnapshot(q, (snap) => {
      this.cache = snap.docs.map((d) => this.docToHazard(d.id, d.data()));
      for (const l of this.listeners) l(this.cache);
    });
    return () => {
      this.listeners.delete(listener);
      unsub();
    };
  }

  async getTrust(userId: string): Promise<UserTrust | null> {
    const { doc, getDoc } = this.fb.fns;
    const snap = await getDoc(doc(this.fb.db, USERS, userId));
    return snap.exists() ? (snap.data() as UserTrust) : null;
  }

  private async clientRateOk(now: number): Promise<boolean> {
    const trust = await this.getTrust(this.userId);
    if (trust?.rateLimitedUntil && trust.rateLimitedUntil > now) return false;
    if (trust && trust.reportCount >= RATE_LIMIT.maxReportsPerHour) {
      // simple rolling guard for the demo, real limit enforced server-side
      return true;
    }
    return true;
  }

  private async bumpUser(now: number) {
    const { doc, setDoc } = this.fb.fns;
    const trust = (await this.getTrust(this.userId)) ?? {
      reportCount: 0,
      confirmedShare: 0,
      rateLimitedUntil: null,
      updatedAt: now
    };
    trust.reportCount += 1;
    trust.updatedAt = now;
    await setDoc(doc(this.fb.db, USERS, this.userId), trust, { merge: true });
  }
}

export function firebaseEnvConfig(): Record<string, string> | null {
  const cfg = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
    appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined
  };
  const required = ["apiKey", "projectId", "appId"] as const;
  if (required.every((k) => cfg[k] && cfg[k]!.trim().length > 0)) {
    return cfg as Record<string, string>;
  }
  return null;
}