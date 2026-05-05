"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";

type Risk = "Low" | "Medium" | "High";
type Confidence = "Low" | "Medium" | "High";

type Signal = {
  title: string;
  explanation: string;
  severity: Risk;
};

type FakeSightReport = {
  suspicionScore: number;
  risk: Risk;
  confidence: Confidence;
  verdict: string;
  summary: string;
  visualSignals: Signal[];
  metadataSignals: Signal[];
  recommendation: string;
  disclaimer: string;
};

function LogoMark() {
  return (
    <div className="bg-gradient-to-br from-violet-300 via-violet-400 to-cyan-300 bg-clip-text text-3xl font-semibold leading-none text-transparent">
      Φ
    </div>
  );
}

function UploadGlyph() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      className="text-white/85"
      aria-hidden="true"
    >
      <path d="M12 15V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M8.8 10.2L12 7L15.2 10.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M7 17.5H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white/90">
      <path d="M4 8V6C4 4.9 4.9 4 6 4H8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 4H18C19.1 4 20 4.9 20 6V8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M20 16V18C20 19.1 19.1 20 18 20H16" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 20H6C4.9 20 4 19.1 4 18V16" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 12H17" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function SignalIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white/90">
      <path
        d="M12 3L13.8 8.2L19 10L13.8 11.8L12 17L10.2 11.8L5 10L10.2 8.2L12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white/90">
      <path
        d="M12 3L19 6V11C19 15.5 16.1 19.74 12 21C7.9 19.74 5 15.5 5 11V6L12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M9.5 12L11.2 13.7L14.8 10.1" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function riskBadgeClasses(risk?: Risk | null) {
  if (risk === "Low") return "border-emerald-400/20 bg-emerald-500/10 text-emerald-300";
  if (risk === "Medium") return "border-amber-400/20 bg-amber-500/10 text-amber-300";
  if (risk === "High") return "border-rose-400/20 bg-rose-500/10 text-rose-300";

  return "border-white/10 bg-white/[0.04] text-white/60";
}

function confidenceBadgeClasses(confidence?: Confidence | null) {
  if (confidence === "High") return "border-cyan-400/20 bg-cyan-500/10 text-cyan-200";
  if (confidence === "Medium") return "border-violet-400/20 bg-violet-500/10 text-violet-200";
  if (confidence === "Low") return "border-white/10 bg-white/[0.04] text-white/55";

  return "border-white/10 bg-white/[0.04] text-white/55";
}

function severityDotClasses(severity: Risk) {
  if (severity === "Low") return "bg-emerald-300";
  if (severity === "Medium") return "bg-amber-300";
  return "bg-rose-300";
}

function scoreRing(score?: number | null) {
  if (typeof score !== "number") return 0;
  return Math.max(0, Math.min(100, score));
}

function scoreLabel(score?: number | null) {
  if (typeof score !== "number") return "Awaiting image";
  if (score >= 70) return "High suspicion";
  if (score >= 40) return "Needs review";
  return "Low suspicion";
}

function SignalCard({ signal }: { signal: Signal }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className={`h-2.5 w-2.5 rounded-full ${severityDotClasses(signal.severity)}`} />

        <div className="font-medium text-white/90">{signal.title}</div>

        <div className={`rounded-full border px-2 py-0.5 text-[11px] ${riskBadgeClasses(signal.severity)}`}>
          {signal.severity}
        </div>
      </div>

      <p className="mt-2 text-sm leading-7 text-white/65">{signal.explanation}</p>
    </div>
  );
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [report, setReport] = useState<FakeSightReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const ringValue = scoreRing(report?.suspicionScore);

  function openFilePicker() {
    inputRef.current?.click();
  }

  function selectImage(selected: File | null) {
    setReport(null);
    setError("");

    if (!selected) {
      setFile(null);
      setPreview((oldPreview) => {
        if (oldPreview) URL.revokeObjectURL(oldPreview);
        return null;
      });
      return;
    }

    if (!selected.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }

    setFile(selected);
    setPreview((oldPreview) => {
      if (oldPreview) URL.revokeObjectURL(oldPreview);
      return URL.createObjectURL(selected);
    });
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] || null;
    selectImage(selected);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const droppedFile = event.dataTransfer.files?.[0] || null;
    selectImage(droppedFile);
  }

  async function analyzeImage() {
    if (!file) return;

    try {
      setLoading(true);
      setError("");
      setReport(null);

      const formData = new FormData();
      formData.append("image", file);

      const result = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await result.json();

      if (!result.ok) {
        setError(data.error || "Analysis failed.");
        return;
      }

      setReport(data.report);
    } catch (err) {
      console.error(err);
      setError("Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-120px] top-[80px] h-[320px] w-[320px] rounded-full bg-violet-600/[0.12] blur-[120px]" />
        <div className="absolute right-[-120px] top-[140px] h-[260px] w-[260px] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-6 md:px-8 lg:px-10">
        <header className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0b0b0f] px-5 py-4">
          <div className="flex items-center gap-3">
            <LogoMark />

            <div>
              <div className="text-xl font-semibold tracking-tight">FakeSight</div>
              <div className="text-xs text-white/[0.45]">AI content investigation platform</div>
            </div>
          </div>

          <div className="hidden md:block">
            <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/65">
              Detect • Explain • Verify
            </div>
          </div>
        </header>

        <section className="grid gap-12 py-12 lg:grid-cols-[1fr_0.92fr] lg:items-start lg:py-16">
          <div className="pt-2">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-sm text-violet-200">
              <span className="h-2 w-2 rounded-full bg-violet-300" />
              See what’s real before you believe it
            </div>

            <h1 className="max-w-4xl text-5xl font-semibold leading-[1.16] tracking-[-0.045em] md:text-[78px]">
              <span className="block">Detect</span>
              <span className="block">suspicious</span>
              <span className="-my-2 block bg-gradient-to-r from-white via-violet-200 to-cyan-200 bg-clip-text py-2 text-transparent">
                AI-generated
              </span>
              <span className="-my-2 block bg-gradient-to-r from-white via-violet-200 to-cyan-200 bg-clip-text py-2 text-transparent">
                images
              </span>
              <span className="block">with clarity.</span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/65 md:text-xl">
              FakeSight investigates visual content using stricter AI suspicion analysis, metadata
              checks, and explainable trust reports.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/75">
                AI suspicion score
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/75">
                Metadata checks
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/75">
                Visual signal analysis
              </div>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[#0b0b0f] p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05]">
                  <ScanIcon />
                </div>
                <div className="font-medium">Stricter review</div>
                <p className="mt-2 text-sm leading-6 text-white/55">
                  Hyperrealism is treated carefully, not as proof of authenticity.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0b0b0f] p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05]">
                  <SignalIcon />
                </div>
                <div className="font-medium">Explainable signals</div>
                <p className="mt-2 text-sm leading-6 text-white/55">
                  See visual and metadata reasons behind the result.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0b0b0f] p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05]">
                  <ShieldIcon />
                </div>
                <div className="font-medium">Trust-first design</div>
                <p className="mt-2 text-sm leading-6 text-white/55">
                  Careful language without pretending to be absolute proof.
                </p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-0.5 rounded-[28px] bg-gradient-to-br from-violet-500/[0.15] via-transparent to-cyan-400/10 blur-2xl" />

            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0b0b0f] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <div className="text-xl font-semibold">Investigate an image</div>
                  <div className="mt-1 text-sm text-white/[0.45]">
                    Upload content and generate a FakeSight V2 report
                  </div>
                </div>

                <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/60">
                  V2
                </div>
              </div>

              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              <div className="rounded-3xl border border-white/10 bg-[#101014] p-4">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={openFilePicker}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openFilePicker();
                    }
                  }}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsDragging(true);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsDragging(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsDragging(false);
                  }}
                  onDrop={handleDrop}
                  className={`flex min-h-[290px] w-full cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed px-6 py-8 text-center outline-none transition-colors ${
                    isDragging
                      ? "border-violet-300/60 bg-violet-500/[0.08]"
                      : "border-white/[0.12] bg-[#0a0a0e] hover:border-violet-400/25"
                  }`}
                >
                  {preview ? (
                    <img
                      src={preview}
                      alt="Uploaded preview"
                      className="max-h-64 rounded-2xl border border-white/10 object-contain shadow-2xl"
                    />
                  ) : (
                    <>
                      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-200">
                        <UploadGlyph />
                      </div>

                      <div className="text-xl font-medium text-white/90">
                        Drop an image here or click to upload
                      </div>

                      <div className="mt-2 text-sm text-white/[0.45]">
                        Supports screenshots, photos, and suspicious AI images
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={openFilePicker}
                    className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/[0.06]"
                  >
                    Choose image
                  </button>

                  <button
                    type="button"
                    onClick={analyzeImage}
                    disabled={!file || loading}
                    className="inline-flex flex-1 items-center justify-center rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {loading ? "Investigating..." : "Analyze with FakeSight"}
                  </button>
                </div>

                {file && (
                  <div className="mt-3 text-xs text-white/[0.45]">
                    Selected: <span className="text-white/70">{file.name}</span>
                  </div>
                )}
              </div>

              <div className="mt-5 rounded-3xl border border-white/10 bg-[#101014] p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold">FakeSight Report</div>
                    <div className="text-sm text-white/[0.45]">
                      Visual analysis + metadata investigation
                    </div>
                  </div>

                  <div className={`rounded-full border px-3 py-1 text-xs ${riskBadgeClasses(report?.risk)}`}>
                    {report?.risk ? `${report.risk} risk` : loading ? "Scanning..." : "Awaiting analysis"}
                  </div>
                </div>

                {loading ? (
                  <div className="space-y-4">
                    <div className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />
                    <div className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />
                    <div className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />
                  </div>
                ) : error ? (
                  <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">
                    {error}
                  </div>
                ) : report ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-[190px_1fr]">
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                          AI suspicion
                        </div>

                        <div className="mt-5 flex items-center justify-center">
                          <div
                            className="relative flex h-28 w-28 items-center justify-center rounded-full"
                            style={{
                              background: `conic-gradient(
                                rgba(244,63,94,0.95) 0%,
                                rgba(139,92,246,0.95) ${ringValue}%,
                                rgba(255,255,255,0.08) ${ringValue}%,
                                rgba(255,255,255,0.08) 100%
                              )`,
                            }}
                          >
                            <div className="flex h-[92px] w-[92px] flex-col items-center justify-center rounded-full bg-[#09090B]">
                              <div className="text-3xl font-semibold">{report.suspicionScore}</div>
                              <div className="text-xs text-white/40">/100</div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 text-center text-sm text-white/60">
                          {scoreLabel(report.suspicionScore)}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                            Verdict
                          </div>

                          <div className={`rounded-full border px-2 py-0.5 text-[11px] ${confidenceBadgeClasses(report.confidence)}`}>
                            {report.confidence} confidence
                          </div>
                        </div>

                        <div className="text-2xl font-semibold">{report.verdict}</div>

                        <p className="mt-3 text-sm leading-7 text-white/70">{report.summary}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                        Visual signals
                      </div>

                      <div className="mt-4 space-y-3">
                        {report.visualSignals.map((signal, index) => (
                          <SignalCard key={index} signal={signal} />
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                        Metadata signals
                      </div>

                      <div className="mt-4 space-y-3">
                        {report.metadataSignals.map((signal, index) => (
                          <SignalCard key={index} signal={signal} />
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-cyan-200/75">
                        Recommendation
                      </div>

                      <p className="mt-3 text-sm leading-7 text-cyan-50/80">
                        {report.recommendation}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-xs leading-6 text-white/[0.45]">{report.disclaimer}</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-[190px_1fr]">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                        AI suspicion
                      </div>

                      <div className="mt-5 flex items-center justify-center">
                        <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-3xl font-semibold text-white/25">
                          --
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                          Summary
                        </div>

                        <p className="mt-3 text-sm text-white/[0.45]">
                          Upload an image to generate a FakeSight V2 investigation report.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                          Signals
                        </div>

                        <p className="mt-3 text-sm text-white/[0.45]">
                          Visual and metadata signals will appear here after analysis.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="pb-14">
          <div className="mb-6">
            <div className="text-sm uppercase tracking-[0.22em] text-white/40">Why FakeSight</div>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              A cleaner trust layer for the AI internet
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-[#0b0b0f] p-6">
              <div className="mb-4 text-lg font-semibold">Simple to understand</div>

              <p className="text-sm leading-7 text-white/60">
                FakeSight turns complex visual analysis into a result normal users can actually
                read and understand.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0b0b0f] p-6">
              <div className="mb-4 text-lg font-semibold">More cautious scoring</div>

              <p className="text-sm leading-7 text-white/60">
                The score now measures AI suspicion instead of pretending to prove authenticity.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0b0b0f] p-6">
              <div className="mb-4 text-lg font-semibold">Built to improve</div>

              <p className="text-sm leading-7 text-white/60">
                This foundation can later expand with test datasets, user feedback, and source
                provenance checks.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}