import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import type { CoachingResponse } from "@/lib/types";

const SYSTEM_PROMPT = `You are a friendly stock market education coach for beginners. You just reviewed a student's performance in a chart-reading game with 3 levels:
- Level 1: Indicator Recognition (identify which chart shows a buy signal)
- Level 2: Read the Signal (interpret what a single indicator is telling you — buy, sell, or wait)
- Level 3: Confluence (read two indicators together to decide buy/wait/sell)

RULES:
- Use simple, encouraging language a beginner can understand.
- Use the game's friendly names: "Momentum Meter" (RSI), "Trend Momentum" (MACD), "Price Squeeze Bands" (Bollinger Bands), "Average Crossover" (Moving Average Crossover), "Speed Gauge" (Stochastic).
- Be specific about what they did well and where they struggled. Reference actual rounds and indicators.
- NEVER promise profits or use certainties. Use words like "likely", "potential", "historically".
- Keep each section concise (2-4 bullet points max).

Respond in this exact JSON format:
{
  "strengths": ["string", ...],
  "weaknesses": ["string", ...],
  "encouragement": "string",
  "nextSteps": ["string", ...],
  "funFact": "string"
}

- strengths: 2-4 specific things they did well (empty array if they struggled everywhere)
- weaknesses: 1-3 specific areas to improve (empty array if perfect scores)
- encouragement: 1-2 sentence personalized encouragement
- nextSteps: 2-3 actionable learning suggestions for what to focus on next
- funFact: One interesting, beginner-friendly stock market insight`;

interface RoundDigest {
  round: number;
  question: string;
  indicators: string[];
  playerAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanationHeadline: string;
}

interface LevelDigest {
  level: number;
  difficulty: string;
  score: number;
  stars: number;
  passed: boolean;
  bestStreak: number;
  rounds: RoundDigest[];
}

interface CoachingRequest {
  levels: LevelDigest[];
}

function buildPrompt(data: CoachingRequest): string {
  const totalScore = data.levels.reduce((s, l) => s + l.score, 0);
  const totalStars = data.levels.reduce((s, l) => s + l.stars, 0);
  const maxScore = data.levels.length * 10;

  const levelNames: Record<number, string> = {
    1: "Indicator Recognition",
    2: "Read the Signal",
    3: "Confluence",
  };

  let prompt = `Here are the student's game results:\n\n`;
  prompt += `Overall: ${totalScore}/${maxScore} correct, ${totalStars}/${data.levels.length * 3} stars\n\n`;

  for (const level of data.levels) {
    prompt += `Level ${level.level} — ${levelNames[level.level] ?? "Unknown"} (${level.difficulty}, ${level.score}/10, ${level.stars} star${level.stars !== 1 ? "s" : ""}, best streak: ${level.bestStreak}):\n`;

    const wrongRounds = level.rounds.filter((r) => !r.isCorrect);
    if (wrongRounds.length === 0) {
      prompt += `  Perfect score! Got all 10 rounds correct.\n`;
    } else {
      for (const r of wrongRounds) {
        prompt += `  Round ${r.round}: "${r.question}" — picked ${r.playerAnswer}, correct was ${r.correctAnswer}. Indicators: ${r.indicators.join(", ")}. Key: ${r.explanationHeadline}\n`;
      }
    }
    prompt += "\n";
  }

  // Add pattern analysis
  const allWrong = data.levels.flatMap((l) =>
    l.rounds.filter((r) => !r.isCorrect)
  );
  if (allWrong.length > 0) {
    const indicatorCounts: Record<string, number> = {};
    for (const r of allWrong) {
      for (const ind of r.indicators) {
        indicatorCounts[ind] = (indicatorCounts[ind] ?? 0) + 1;
      }
    }
    const sorted = Object.entries(indicatorCounts).sort((a, b) => b[1] - a[1]);
    prompt += `Mistake patterns:\n`;
    for (const [ind, count] of sorted) {
      prompt += `- ${count} wrong answer${count > 1 ? "s" : ""} involved ${ind}\n`;
    }
  }

  return prompt;
}

function isValidCoachingResponse(data: unknown): data is CoachingResponse {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    Array.isArray(obj.strengths) &&
    Array.isArray(obj.weaknesses) &&
    typeof obj.encouragement === "string" &&
    Array.isArray(obj.nextSteps) &&
    typeof obj.funFact === "string"
  );
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
    return NextResponse.json(
      { error: "Gemini API key not configured" },
      { status: 503 }
    );
  }

  let body: CoachingRequest;
  try {
    body = await request.json();
    if (!body.levels || !Array.isArray(body.levels)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
      systemInstruction: SYSTEM_PROMPT,
    });

    const prompt = buildPrompt(body);
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const coaching = JSON.parse(text);

    if (!isValidCoachingResponse(coaching)) {
      return NextResponse.json(
        { error: "Invalid response from AI" },
        { status: 500 }
      );
    }

    return NextResponse.json(coaching);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Coaching generation failed: ${message}` },
      { status: 500 }
    );
  }
}
