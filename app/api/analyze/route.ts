import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type FakeSightReport = {
  score: number;
  risk: "Low" | "Medium" | "High";
  verdict: string;
  summary: string;
  signals: {
    title: string;
    explanation: string;
    severity: "Low" | "Medium" | "High";
  }[];
  recommendation: string;
  disclaimer: string;
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No image uploaded" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Uploaded file must be an image" }, { status: 400 });
    }

    const maxSize = 8 * 1024 * 1024;

    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Image is too large. Please upload an image under 8MB." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
You are FakeSight, an AI-assisted visual investigation system.

Analyze the uploaded image for suspicious signals related to:
- AI generation
- digital manipulation
- unrealistic lighting
- texture artifacts
- unnatural anatomy or object structure
- suspicious background details
- overly smooth or inconsistent surfaces
- signs that the scene may be synthetic

Important rules:
- Do not claim certainty.
- Do not say the image is definitely fake.
- Give cautious investigative language.
- Score means authenticity confidence:
  0 = extremely suspicious
  100 = likely authentic
- If the image is obviously fictional, surreal, staged, or impossible, reflect that in the score and summary.
`,
            },
            {
              type: "input_image",
              image_url: `data:${file.type};base64,${base64}`,
              detail: "auto",
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "fakesight_report",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              score: {
                type: "number",
                description:
                  "Authenticity confidence score from 0 to 100. Lower means more suspicious.",
              },
              risk: {
                type: "string",
                enum: ["Low", "Medium", "High"],
              },
              verdict: {
                type: "string",
                description:
                  "Short verdict label such as 'Highly suspicious', 'Needs review', or 'Likely authentic'.",
              },
              summary: {
                type: "string",
                description:
                  "One to two sentence summary of the investigation result.",
              },
              signals: {
                type: "array",
                minItems: 3,
                maxItems: 5,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: {
                      type: "string",
                    },
                    explanation: {
                      type: "string",
                    },
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
                  "Practical next step for the user, such as checking the original source or reverse image searching.",
              },
              disclaimer: {
                type: "string",
                description:
                  "Reminder that this is not absolute proof, only investigative analysis.",
              },
            },
            required: [
              "score",
              "risk",
              "verdict",
              "summary",
              "signals",
              "recommendation",
              "disclaimer",
            ],
          },
        },
      },
    });

    const report = JSON.parse(response.output_text) as FakeSightReport;

    return NextResponse.json({ report });
  } catch (error) {
    console.error("FakeSight analysis failed:", error);

    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}