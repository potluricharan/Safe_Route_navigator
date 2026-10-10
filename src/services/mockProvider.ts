import type {
  AddHazardResult,
  DataProvider,
  Hazard,
  HazardFilter,
  NewHazard,
  UserTrust,
  Vote
} from "../types";
import { HAZARD_TYPE_RULES, RATE_LIMIT } from "../config/app";
import { seedHazards } from "../config/seed";
import { encodeGeohash } from "../lib/geohash";
import { newId, voterKey } from "../lib/id";
import {
  clamp,
  computeExpiry,
  confidenceFromVotes,
  duplicatesOf
} from "../services/scoring";

const NS = "srn_mock_v1";
const CHANNEL = "srn-hazards";
const POLL_MS = 2000;

interface Store {
  hazards: Hazard[];
  votes: Vote[];
  trust: Record<string, UserTrust>;
  seededAt: number;
}

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(NS);
    if (raw) {
      const parsed = JSON.parse(raw) as Store;
      if (Array.isArray(parsed.hazards)) return parsed;
    }
  } catch {
    /* ignore corrupt cache */
  }
  const now = Date.now();
  const store: Store = {
    hazards: seedHazards(now),
    votes: [],
    trust: {},
    seededAt: now
  };
  saveStore(store);
  return store;
}

function saveStore(store: Store) {
  try {
    localStorage.setItem(NS, JSON.stringify(store));
  } catch {
    /* storage full or disabled */
  }
}

/**
 * Local demo provider. Persists to localStorage and syncs live across tabs on
 * the same machine via BroadcastChannel + storage events. No account needed,
 * which keeps the demo runnable while the Firestore project is being set up.
 */
export class MockProvider implements DataProvider {
  readonly name = "Local demo (BroadcastChannel)";
  ready = false;
  private store: Store = { hazards: [], votes: [], trust: {}, seededAt: 0 };
  private channel: BroadcastChannel | null = null;
  private listeners = new Set<(h: Hazard[]) => void>();
  private userId = "local-user";
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      this.ready = true;
      return;
    }
    this.initialized = true;
    this.store = loadStore();
    try {
      this.channel = new BroadcastChannel(CHANNEL);
      this.channel.onmessage = () => this.reload();
    } catch {
      this.channel = null;
    }
    window.addEventListener("storage", this.onStorage);
    setInterval(() => {
      this.reload();
      this.emit();
    }, POLL_MS);
    this.ready = true;
  }

  private onStorage = (e: StorageEvent) => {
    if (e.key === NS) this.reload();
  };

  private reload() {
    try {
      const raw = localStorage.getItem(NS);
      if (raw) this.store = JSON.parse(raw) as Store;
    } catch {
      /* ignore */
    }
  }

  private persist() {
    saveStore(this.store);
    this.channel?.postMessage({ type: "changed", at: Date.now() });
    this.emit();
  }

  private emit() {
    const snapshot = [...this.store.hazards];
    for (const l of this.listeners) l(snapshot);
  }

  async listHazards(filter?: HazardFilter): Promise<Hazard[]> {
    this.reload();
    return this.filter(this.store.hazards, filter);
  }

  private filter(hazards: Hazard[], filter?: HazardFilter): Hazard[] {
    return hazards.filter((h) => {
      if (filter?.status && h.status !== filter.status) return false;
      if (filter?.bbox) {
        const b = filter.bbox;
        if (
          h.lat < b.minLat ||
          h.lat > b.maxLat ||
          h.lng < b.minLng ||
          h.lng > b.maxLng
        )
          return false;
      }
      return true;
    });
  }

  async addHazard(input: NewHazard): Promise<AddHazardResult> {
    this.reload();
    const now = Date.now();



    const raining = isRainingNow();
    const duplicate = duplicatesOf(input, this.store.hazards, now, raining);
    if (duplicate) {
      duplicate.confirmations += 1;
      duplicate.updatedAt = now;
      duplicate.confidence = confidenceFromVotes(duplicate.confirmations, duplicate.denials);
      duplicate.expiresAt = computeExpiry(duplicate.type, now, raining);
      // keep the strongest severity/note rather than spawning a second pin
      this.recordReport(input.reporterId, now);
      this.persist();
      return { ok: true, hazard: duplicate, mergedInto: duplicate.id };
    }

    const hazard: Hazard = {
      id: newId("hz"),
      type: input.type,
      severity: input.severity,
      lat: input.lat,
      lng: input.lng,
      geohash: encodeGeohash(input.lat, input.lng, 7),
      createdAt: now,
      updatedAt: now,
      expiresAt: computeExpiry(input.type, now, raining),
      status: "active",
      confirmations: 0,
      denials: 0,
      confidence: confidenceFromVotes(0, 0),
      reporterId: input.reporterId,
      note: input.note,
      photoUrl: input.photoDataUrl,
      moderationStatus: "pending"
    };
    this.store.hazards.push(hazard);
    this.recordReport(input.reporterId, now);
    this.persist();
    return { ok: true, hazard };
  }

  async vote(hazardId: string, vote: "yes" | "no"): Promise<void> {
    this.reload();
    const now = Date.now();
    const key = voterKey(this.userId, hazardId);
    if (this.store.votes.some((v) => v.hazardId === hazardId && v.voterKey === key)) {
      return; // one vote per user per hazard
    }
    const hazard = this.store.hazards.find((h) => h.id === hazardId);
    if (!hazard) return;

    this.store.votes.push({ id: newId("vote"), hazardId, voterKey: key, vote, timestamp: now });
    if (vote === "yes") {
      hazard.confirmations += 1;
      hazard.updatedAt = now;
      hazard.expiresAt = computeExpiry(hazard.type, now, isRainingNow());
    } else {
      hazard.denials += 1;
    }
    hazard.confidence = clamp(confidenceFromVotes(hazard.confirmations, hazard.denials), 0.15, 1);
    this.persist();
  }

  onHazardsChanged(listener: (hazards: Hazard[]) => void): () => void {
    this.listeners.add(listener);
    listener([...this.store.hazards]);
    return () => this.listeners.delete(listener);
  }

  async getTrust(userId: string): Promise<UserTrust | null> {
    return this.store.trust[userId] ?? null;
  }

  private underRateLimit(userId: string, now: number): boolean {
    const t = this.store.trust[userId];
    const recent = this.recentReports(userId, now);
    return !(t?.rateLimitedUntil && t.rateLimitedUntil > now) && recent < RATE_LIMIT.maxReportsPerHour;
  }

  private reportTimes: Record<string, number[]> = {};

  private recentReports(userId: string, now: number): number {
    try {
      const key = `${NS}_rate`;
      const raw = localStorage.getItem(key);
      this.reportTimes = raw ? (JSON.parse(raw) as Record<string, number[]>) : {};
    } catch {
      /* ignore */
    }
    const times = (this.reportTimes[userId] ?? []).filter((t) => now - t < 3600_000);
    this.reportTimes[userId] = times;
    return times.length;
  }

  private recordReport(userId: string, now: number) {
    const times = this.recentReports(userId, now);
    this.reportTimes[userId] = [...(this.reportTimes[userId] ?? []), now];
    try {
      localStorage.setItem(`${NS}_rate`, JSON.stringify(this.reportTimes));
    } catch {
      /* ignore */
    }
    const t = this.store.trust[userId] ?? {
      reportCount: 0,
      confirmedShare: 0,
      rateLimitedUntil: null,
      updatedAt: now
    };
    t.reportCount += 1;
    t.updatedAt = now;
    if (times >= RATE_LIMIT.maxReportsPerHour - 1) {
      t.rateLimitedUntil = now + 3600_000;
    }
    this.store.trust[userId] = t;
  }
}

function isRainingNow(): boolean {
  // mock provider has no weather context; scoring re-derives rain-aware activity
  return false;
}

export function hazardTypeIsTemporary(type: Hazard["type"]): boolean {
  return HAZARD_TYPE_RULES[type].temporary;
}