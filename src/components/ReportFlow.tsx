import { useRef, useState } from "react";
import type {
  DataProvider,
  HazardType,
  Severity,
  AddHazardResult
} from "../types";
import { HAZARD_TYPE_RULES, SEVERITY_LABELS, PHOTO_MAX_EDGE } from "../config/app";
import type { MapPoint } from "./ReportPoint";

interface ReportFlowProps {
  point: MapPoint | null;
  provider: DataProvider;
  raining: boolean;
  reporterId: string;
  onDone: () => void;
  onClose: () => void;
}

type Step = "details" | "confirm" | "result";

export interface ReportDraft {
  type: HazardType;
  severity: Severity;
  note: string;
  photoUrl?: string;
}

export default function ReportFlow(props: ReportFlowProps) {
  const [step, setStep] = useState<Step>("details");
  const [draft, setDraft] = useState<ReportDraft>({
    type: "poor_lighting",
    severity: "medium",
    note: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AddHazardResult | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!props.point) return null;
  const point = props.point;

  const submit = async () => {
    if (!props.point) return;
    setSubmitting(true);
    try {
      const res = await props.provider.addHazard({
        type: draft.type,
        severity: draft.severity,
        lat: props.point.lat,
        lng: props.point.lng,
        note: draft.note.trim() || undefined,
        photoDataUrl: draft.photoUrl,
        reporterId: props.reporterId
      });
      setResult(res);
      setStep("result");
    } catch {
      setResult({
        ok: false,
        reason: "rejected",
        message:
          "Could not publish the report (network or permission error). Please try again."
      });
      setStep("result");
    }
    setSubmitting(false);
  };

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoBusy(true);
    try {
      const url = await resizePhoto(file);
      setDraft((d) => ({ ...d, photoUrl: url }));
    } catch {
      /* photo optional - ignore failures */
    }
    setPhotoBusy(false);
  };

  const rule = HAZARD_TYPE_RULES[draft.type];

  return (
    <div className="modal-backdrop" onClick={step === "details" ? props.onClose : undefined}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {step === "details" && (
          <>
            <h3>Report a hazard</h3>
            <p className="muted small">
              At {point.lat.toFixed(5)}, {point.lng.toFixed(5)}{" "}
              {props.raining ? "· raining — waterlogging reports weight higher" : ""}
            </p>

            <label className="field-label">Category</label>
            <div className="type-grid">
              {(Object.keys(HAZARD_TYPE_RULES) as HazardType[]).map((t) => {
                const r = HAZARD_TYPE_RULES[t];
                return (
                  <button
                    key={t}
                    className={`type-option${draft.type === t ? " type-active" : ""}`}
                    onClick={() => setDraft((d) => ({ ...d, type: t }))}
                    title={r.description}
                  >
                    {r.icon} {r.shortLabel}
                  </button>
                );
              })}
            </div>
            <p className="muted small">{rule.description}</p>

            <label className="field-label">Severity</label>
            <div className="sev-row">
              {(["low", "medium", "high"] as Severity[]).map((s) => (
                <button
                  key={s}
                  className={`sev-option${draft.severity === s ? " sev-active" : ""}`}
                  onClick={() => setDraft((d) => ({ ...d, severity: s }))}
                >
                  {SEVERITY_LABELS[s]}
                </button>
              ))}
            </div>

            <label className="field-label">Short note (optional)</label>
            <textarea
              rows={2}
              value={draft.note}
              maxLength={280}
              placeholder="e.g. ankle-deep water at the junction after rain"
              onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
            />

            <div className="photo-row">
              <button
                className="small-btn"
                disabled={photoBusy}
                onClick={() => fileRef.current?.click()}
              >
                {draft.photoUrl ? "📷 Change photo" : "📷 Attach photo (optional)"}
              </button>
              {draft.photoUrl && <span className="muted small">photo added</span>}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => onPhoto(e.target.files?.[0])}
            />

            <div className="modal-actions">
              <button className="ghost-btn" onClick={props.onClose}>
                Cancel
              </button>
              <button className="primary-btn" onClick={() => setStep("confirm")}>
                Next
              </button>
            </div>
          </>
        )}

        {step === "confirm" && (
          <>
            <h3>Confirm this report?</h3>
            <div className="confirm-summary">
              <div>
                <b>{rule.icon} {rule.label}</b> — severity {SEVERITY_LABELS[draft.severity]}
              </div>
              <div className="muted small">{point.lat.toFixed(5)}, {point.lng.toFixed(5)}</div>
              {draft.note && <div className="muted">“{draft.note}”</div>}
              {draft.photoUrl && <div className="muted small">📷 photo attached</div>}
            </div>
            <p className="warn">
              Reports that identify or accuse individual people are discouraged. This report may
              be merged with a nearby duplicate and expires unless others confirm it.
            </p>
            <div className="modal-actions">
              <button
                className="ghost-btn"
                disabled={submitting}
                onClick={() => setStep("details")}
              >
                Back
              </button>
              <button className="primary-btn" disabled={submitting} onClick={submit}>
                {submitting ? "Publishing…" : "Publish report"}
              </button>
            </div>
          </>
        )}

        {step === "result" && result && (
          <>
            <h3>{result.ok ? (result.mergedInto ? "Merged into existing report" : "Report published") : "Report not published"}</h3>
            <p>
              {result.ok
                ? result.mergedInto
                  ? "This was within 25 m of an existing report of the same type, so it was merged instead of duplicated — it now counts as a confirmation."
                  : "Thanks. The report is now live on every open map and will influence route estimates."
                : result.message}
            </p>
            {result.ok && (
              <p className="muted small">
                Temporary hazards expire automatically; others stay until resolved or reviewed.
                Confirmations raise confidence.
              </p>
            )}
            <div className="modal-actions">
              <button className="primary-btn" onClick={props.onDone}>
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

async function resizePhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.7);
}