import OpenAI from "openai";
import { NextResponse } from "next/server";
import { parse as parseExif } from "exifr";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

type ExtractedMetadata = {
  file: {
    name: string;
    type: string;
    sizeBytes: number;
    sizeMB: number;
  };
  dimensions: {
    width: number | null;
    height: number | null;
    aspectRatio: string | null;
  };
  exif: Record<string, string>;
  heuristicSignals: Signal[];
};

function toMB(bytes: number) {
  return Math.round((bytes / 1024 / 1024) * 100) / 100;
}

function safeString(value: unknown) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function getImageDimensions(buffer: Buffer) {
  // PNG
  if (
    buffer.length >= 24 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }

  // JPEG
  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;

    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }

      const marker = buffer[offset + 1];

      if (marker === 0xd9 || marker === 0xda) break;

      const length = buffer.readUInt16BE(offset + 2);

      const isStartOfFrame =
        marker === 0xc0 ||
        marker === 0xc1 ||
        marker === 0xc2 ||
        marker === 0xc3 ||
        marker === 0xc5 ||
        marker === 0xc6 ||
        marker === 0xc7 ||
        marker === 0xc9 ||
        marker === 0xca ||
        marker === 0xcb ||
        marker === 0xcd ||
        marker === 0xce ||
        marker === 0xcf;

      if (isStartOfFrame && offset + 9 < buffer.length) {
        return {
          width: buffer.readUInt16BE(offset + 7),
          height: buffer.readUInt16BE(offset + 5),
        };
      }

      offset += 2 + length;
    }
  }

  // WEBP VP8X
  if (
    buffer.length >= 30 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP" &&
    buffer.toString("ascii", 12, 16) === "VP8X"
  ) {
    const width = 1 + buffer.readUIntLE(24, 3);
    const height = 1 + buffer.readUIntLE(27, 3);

    return { width, height };
  }

  return {
    width: null,
    height: null,
  };
}

async function extractMetadata(file: File, buffer: Buffer): Promise<ExtractedMetadata> {
  const dimensions = getImageDimensions(buffer);

  let exifRaw: Record<string, unknown> | null = null;

  try {
    exifRaw = ((await parseExif(buffer, {
      tiff: true,
      ifd0: true,
      ifd1: true,
      exif: true,
      gps: true,
      xmp: true,
      icc: true,
      jfif: true,
      ihdr: true,
    })) || null) as Record<string, unknown> | null;
  } catch {
    exifRaw = null;
  }

  const importantKeys = [
    "Make",
    "Model",
    "LensModel",
    "Software",
    "CreatorTool",
    "CreateDate",
    "ModifyDate",
    "DateTimeOriginal",
    "OffsetTimeOriginal",
    "ImageWidth",
    "ImageHeight",
    "ColorSpace",
    "ProfileDescription",
    "Artist",
    "Copyright",
    "GPSLatitude",
    "GPSLongitude",
  ];

  const exif: Record<string, string> = {};

  if (exifRaw) {
    for (const key of importantKeys) {
      if (exifRaw[key] !== undefined && exifRaw[key] !== null) {
        exif[key] = safeString(exifRaw[key]);
      }
    }
  }

  const softwareText = `${exif.Software || ""} ${exif.CreatorTool || ""}`.toLowerCase();

  const hasCameraMakeOrModel = Boolean(exif.Make || exif.Model);
  const hasCreationDate = Boolean(exif.CreateDate || exif.DateTimeOriginal);
  const hasSoftware = Boolean(exif.Software || exif.CreatorTool);

  const heuristicSignals: Signal[] = [];

  if (!hasCameraMakeOrModel) {
    heuristicSignals.push({
      title: "No camera make or model found",
      explanation:
        "The file does not expose camera make/model metadata. This does not prove AI generation, because many platforms strip metadata, but it lowers provenance confidence.",
      severity: "Medium",
    });
  } else {
    heuristicSignals.push({
      title: "Camera metadata found",
      explanation: `The image includes camera metadata: ${[exif.Make, exif.Model]
        .filter(Boolean)
        .join(" ")}.`,
      severity: "Low",
    });
  }

  if (!hasCreationDate) {
    heuristicSignals.push({
      title: "No original capture date found",
      explanation:
        "The file does not include an original capture timestamp. Missing timestamps are common online, but they reduce the ability to verify origin.",
      severity: "Low",
    });
  }

  if (hasSoftware) {
    const aiTerms = [
      "midjourney",
      "stable diffusion",
      "stability",
      "dall",
      "openai",
      "comfyui",
      "automatic1111",
      "invokeai",
      "firefly",
      "leonardo",
      "runway",
    ];

    const editingTerms = ["photoshop", "lightroom", "gimp", "canva", "affinity"];

    if (aiTerms.some((term) => softwareText.includes(term))) {
      heuristicSignals.push({
        title: "AI-generation software metadata detected",
        explanation: `The file metadata references software that may be associated with AI generation: ${
          exif.Software || exif.CreatorTool
        }.`,
        severity: "High",
      });
    } else if (editingTerms.some((term) => softwareText.includes(term))) {
      heuristicSignals.push({
        title: "Editing software metadata detected",
        explanation: `The file metadata references editing software: ${
          exif.Software || exif.CreatorTool
        }. This suggests the file may have been exported or edited.`,
        severity: "Medium",
      });
    } else {
      heuristicSignals.push({
        title: "Software metadata found",
        explanation: `The file includes software metadata: ${exif.Software || exif.CreatorTool}.`,
        severity: "Low",
      });
    }
  }

  if (dimensions.width && dimensions.height) {
    const aspectRatioNumber = dimensions.width / dimensions.height;
    const aspectRatio = aspectRatioNumber.toFixed(3);

    if (!hasCameraMakeOrModel && dimensions.width === dimensions.height) {
      heuristicSignals.push({
        title: "Square image with limited provenance",
        explanation:
          "The image is square and lacks camera metadata. This pattern is common in generated or social-platform-exported images, though it is not proof.",
        severity: "Medium",
      });
    }

    return {
      file: {
        name: file.name,
        type: file.type,
        sizeBytes: file.size,
        sizeMB: toMB(file.size),
      },
      dimensions: {
        width: dimensions.width,
        height: dimensions.height,
        aspectRatio,
      },
      exif,
      heuristicSignals,
    };
  }

  return {
    file: {
      name: file.name,
      type: file.type,
      sizeBytes: file.size,
      sizeMB: toMB(file.size),
    },
    dimensions: {
      width: null,
      height: null,
      aspectRatio: null,
    },
    exif,
    heuristicSignals,
  };
}

function normalizeReport(report: FakeSightReport): FakeSightReport {
  const suspicionScore = Math.max(0, Math.min(100, Math.round(report.suspicionScore)));

  let risk: Risk = report.risk;

  if (suspicionScore >= 70) risk = "High";
  else if (suspicionScore >= 40) risk = "Medium";
  else risk = "Low";

  return {
    ...report,
    suspicionScore,
    risk,
    visualSignals: report.visualSignals.slice(0, 5),
    metadataSignals: report.metadataSignals.slice(0, 5),
  };
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Server is missing OPENAI_API_KEY." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No image uploaded." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Uploaded file must be an image." }, { status: 400 });
    }

    const maxSize = 8 * 1024 * 1024;

    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Image is too large. Please upload an image under 8MB." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const metadata = await extractMetadata(file, buffer);

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
You are FakeSight V2, a skeptical AI-image investigation system.

Goal:
Estimate whether the uploaded image may be AI-generated, synthetic, or heavily manipulated.

Important scoring:
- Return suspicionScore from 0 to 100.
- 0 = likely authentic / low AI suspicion.
- 100 = highly suspicious / strong AI-generation or manipulation signals.
- Do NOT use photorealism as proof of authenticity.
- Hyperrealistic, commercial-perfect, overly polished images can still be AI-generated.
- Be stricter than a casual visual inspection.
- Prefer "Needs review" when uncertain.
- Missing metadata is not proof, but it reduces provenance confidence.
- Camera metadata is helpful, but it is not absolute proof either.
- Do not claim certainty.
- Never say "definitely fake" or "definitely real".

Analyze these visual categories:
1. Anatomy, hands, eyes, teeth, skin, hair, fabric, reflections.
2. Lighting consistency, shadows, depth, camera behavior, bokeh.
3. Texture realism, repeated details, over-smoothing, plastic-like surfaces.
4. Background logic, object continuity, text/logos/signage.
5. Scene plausibility and whether the image feels staged, synthetic, or over-rendered.

Analyze these metadata categories:
1. Camera make/model.
2. Capture timestamp.
3. Software/export tags.
4. Image dimensions and aspect ratio.
5. Whether provenance is strong, weak, or missing.

Return a balanced report. If the image is hyperrealistic but lacks provenance and contains subtle synthetic cues, do not give it a low suspicion score.

Metadata extracted from the uploaded file:
${JSON.stringify(metadata, null, 2)}
`,
            },
            {
              type: "input_image",
              image_url: `data:${file.type};base64,${base64}`,
              detail: "high",
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "fakesight_v2_report",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              suspicionScore: {
                type: "number",
                description:
                  "AI/manipulation suspicion score from 0 to 100. Higher means more suspicious.",
              },
              risk: {
                type: "string",
                enum: ["Low", "Medium", "High"],
              },
              confidence: {
                type: "string",
                enum: ["Low", "Medium", "High"],
                description:
                  "Confidence in the investigation result. Use Low when evidence is weak or ambiguous.",
              },
              verdict: {
                type: "string",
                description:
                  "Short cautious verdict such as 'Low suspicion', 'Needs review', or 'Highly suspicious'.",
              },
              summary: {
                type: "string",
                description:
                  "Two to three sentence explanation of the overall result.",
              },
              visualSignals: {
                type: "array",
                minItems: 3,
                maxItems: 5,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string" },
                    explanation: { type: "string" },
                    severity: {
                      type: "string",
                      enum: ["Low", "Medium", "High"],
                    },
                  },
                  required: ["title", "explanation", "severity"],
                },
              },
              metadataSignals: {
                type: "array",
                minItems: 2,
                maxItems: 5,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string" },
                    explanation: { type: "string" },
                    severity: {
                      type: "string",
                      enum: ["Low", "Medium", "High"],
                    },
                  },
                  required: ["title", "explanation", "severity"],
                },
              },
              recommendation: {
                type: "string",
                description:
                  "Practical next step, such as reverse image search, checking original source, or requesting source file.",
              },
              disclaimer: {
                type: "string",
                description:
                  "Reminder that this is investigative analysis, not absolute proof.",
              },
            },
            required: [
              "suspicionScore",
              "risk",
              "confidence",
              "verdict",
              "summary",
              "visualSignals",
              "metadataSignals",
              "recommendation",
              "disclaimer",
            ],
          },
        },
      },
    });

    const parsed = JSON.parse(response.output_text) as FakeSightReport;
    const report = normalizeReport(parsed);

    return NextResponse.json({
      report,
      metadata,
    });
  } catch (error) {
    console.error("FakeSight analysis failed:", error);

    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}