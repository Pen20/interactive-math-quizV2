// /js/openai-service.js
class OpenAIService {
  constructor() {
    this.baseURL = "/api/openai/feedback";
    this.model = localStorage.getItem("openai_model") || "gpt-4o-mini";
  }

  initialize(model = "gpt-4o-mini") {
    this.model = model;
    localStorage.setItem("openai_model", model);
  }

  #safeStr(v) {
    if (v == null) return "";
    return typeof v === "string" ? v : JSON.stringify(v);
  }

  /**
   * Heuristic reasoning assessor.
   * Returns { score: 0..1, tier: "poor"|"ok"|"good", details: {...} }
   * - length/word count
   * - presence of math keywords
   * - LaTeX balance/validity via window.MathUtils (if present)
   */
  #assessReasoning(text) {
    const s = (text || "").trim();
    if (!s) return { score: 0, tier: "poor", details: { empty: true } };

    const words = s.split(/\s+/).length;
    let score = 0;

    // 1) Enough substance
    if (words >= 20) score += 0.35; // minimal explanation
    if (words >= 40) score += 0.1; // bonus for detail

    // 2) Useful math vocabulary
    const vocab = [
      "because",
      "therefore",
      "thus",
      "so that",
      "hence",
      "implies",
      "differentiate",
      "derive",
      "substitute",
      "factor",
      "cancel",
      "simplify",
      "chain rule",
      "product rule",
      "quotient rule",
      "log",
      "trig",
      "sine",
      "cosine",
      "domain",
      "range",
      "limit",
      "continuous",
      "indeterminate",
      "0/0",
    ];
    const found = vocab.filter((v) => s.toLowerCase().includes(v));
    score += Math.min(found.length * 0.03, 0.18); // cap vocab contribution

    // 3) LaTeX validity (if the shared validator exists)
    if (
      window.MathUtils &&
      typeof window.MathUtils.validateLatexSyntax === "function"
    ) {
      const val = window.MathUtils.validateLatexSyntax(s);
      if (val.isValid) score += 0.22; // reward clean TeX
      else score += Math.max(0.0, 0.22 - 0.05 * (val.errors?.length || 1));
    }

    // Clamp
    score = Math.max(0, Math.min(1, score));

    let tier = "poor";
    if (score >= 0.7) tier = "good";
    else if (score >= 0.4) tier = "ok";

    return { score, tier, details: { words, vocabFound: found.length } };
  }

  /**
   * Combines answers correctness + reasoning quality to a final correctness.
   * - answersCorrect === false -> "incorrect"
   * - answersCorrect === true  -> "good" reasoning -> "correct"
   *                            -> "ok" reasoning   -> "partially-correct"
   *                            -> "poor" reasoning -> "incorrect"
   */
  #combineCorrectness(answersCorrect, reasoningTier) {
    if (!answersCorrect) return "incorrect";
    if (reasoningTier === "good") return "correct";
    if (reasoningTier === "ok") return "partially-correct";
    return "incorrect";
  }

  async generateFeedback(questionData, userAnswer, reasoning, isCorrect) {
    // Evaluate the reasoning locally first
    const rEval = this.#assessReasoning(reasoning);
    const combinedCorrectness = this.#combineCorrectness(
      !!isCorrect,
      rEval.tier
    );

    // We still ask the model for a short paragraph, but the badge will follow our
    // combinedCorrectness (so a right answer + bad reasoning shows "Incorrect").
    const systemPrompt = `
You are an intelligent math tutoring assistant.

Write ONE short paragraph (3–5 sentences) giving feedback to the student about
their answer and reasoning. Be friendly and concise. Use LaTeX between \\( \\)
for math. Do not return JSON.

When the student's final answer is correct but the explanation is weak or flawed,
praise the result briefly but point out issues and give a concrete tip to improve their reasoning.
`;

    const userPrompt = `
QUESTION: ${JSON.stringify(questionData?.question ?? "")}
PARAMETERS: ${JSON.stringify(questionData?.parameters ?? {})}

STUDENT_ANSWER(S): ${JSON.stringify(userAnswer ?? "")}
STUDENT_REASONING: ${JSON.stringify(reasoning ?? "")}

ANSWERS_CORRECT: ${isCorrect ? "true" : "false"}
REASONING_EVAL: ${JSON.stringify(rEval)}

CORRECT_ANSWER: ${JSON.stringify(questionData?.correctAnswer ?? "")}

Write the feedback paragraph now.
`;

    const r = await fetch(this.baseURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 450,
        temperature: 0.3,
      }),
    });

    const text = await r.text();
    if (!r.ok) {
      try {
        throw new Error(JSON.parse(text)?.error || `HTTP ${r.status}`);
      } catch {
        throw new Error(`HTTP ${r.status}`);
      }
    }

    // Server returns { content: "plain paragraph OR JSON, depending on your backend" }
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      // extremely rare; treat raw as summary
      return this.#fallbackStructured(text, combinedCorrectness);
    }

    const content = typeof payload?.content === "string" ? payload.content : "";
    if (!content)
      return this.#fallbackStructured("No content.", combinedCorrectness);

    // If your backend already formats JSON, try to keep it. Otherwise wrap.
    try {
      const obj = JSON.parse(content);

      return {
        summary: obj.summary || content, // if it actually was JSON, use its summary
        correctness: combinedCorrectness,
        strengths: Array.isArray(obj.strengths)
          ? obj.strengths
          : isCorrect
          ? ["Correct result obtained."]
          : [],
        issues: Array.isArray(obj.issues)
          ? obj.issues
          : isCorrect
          ? rEval.tier === "good"
            ? []
            : ["Reasoning is incomplete or contains mistakes."]
          : ["Answer is incorrect."],
        next_steps: Array.isArray(obj.next_steps)
          ? obj.next_steps
          : combinedCorrectness === "correct"
          ? []
          : [
              "Tidy your algebraic justification.",
              "State the rule you used (e.g., chain/quotient).",
            ],
        key_concepts: Array.isArray(obj.key_concepts)
          ? obj.key_concepts
          : ["Reasoning quality"],
        math_highlight: obj.math_highlight ?? "",
      };
    } catch {
      // Plain paragraph => wrap it
      return this.#fallbackStructured(content, combinedCorrectness);
    }
  }

  #fallbackStructured(text, correctness) {
    // correctness is already the combined one
    const good = correctness === "correct";
    const partial = correctness === "partially-correct";
    const issues = good
      ? []
      : partial
      ? ["Reasoning is present but not fully correct or complete."]
      : ["Answer and/or reasoning are incorrect."];

    const nextSteps = good
      ? []
      : partial
      ? ["Clarify each step and cite the exact rule (e.g., chain rule)."]
      : ["Rework the solution and write a clear justification."];

    return {
      summary:
        text ||
        (good
          ? "Answer and reasoning are solid."
          : partial
          ? "Answer is right, but reasoning needs improvement."
          : "This needs correction."),
      correctness,
      strengths: good
        ? ["Correct result with clear reasoning."]
        : partial
        ? ["Correct final result."]
        : [],
      issues,
      next_steps: nextSteps,
      key_concepts: good ? ["Complete justification"] : ["Reasoning quality"],
      math_highlight: "",
    };
  }

  async generateQuickFeedback(question, userAnswer, isCorrect) {
    const prompt = `Question: ${this.#safeStr(question)}
Student Answer: ${this.#safeStr(userAnswer)}
Correct: ${isCorrect ? "Yes" : "No"}

Provide brief, encouraging feedback in 2–3 sentences.`;

    const r = await fetch(this.baseURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    const text = await r.text();
    if (!r.ok) {
      try {
        throw new Error(JSON.parse(text)?.error || `HTTP ${r.status}`);
      } catch {
        throw new Error(`HTTP ${r.status}`);
      }
    }
    const payload = JSON.parse(text);
    return payload.content || "";
  }
}

window.openAIService = new OpenAIService();
