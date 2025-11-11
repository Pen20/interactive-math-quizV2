// js/ai-render.js
// Universal AI feedback renderer + shared LaTeX validator.
// Works across ALL quiz pages, regardless of how many answers a question has.
// Produces the "pill + two columns + next steps + chips" card that matches your screenshot.

(function () {
  /* =========================================================
   * 1) Robust LaTeX validator shared by every page
   * ========================================================= */
  const MathUtils = window.MathUtils || {};

  /**
   * validateLatexSyntax(str)
   * - Returns { isValid: boolean, errors: string[] }
   * - Non-intrusive checks (balanced braces / delimiters, basic \frac form)
   */
  MathUtils.validateLatexSyntax = function validateLatexSyntax(input) {
    const errors = [];
    const s = String(input ?? "");

    // Balanced braces { }
    const open = (s.match(/(?<!\\){/g) || []).length;
    const close = (s.match(/(?<!\\)}/g) || []).length;
    if (open !== close)
      errors.push(`Unbalanced braces: ${open} “{” vs ${close} “}”.`);

    // $ ... $ pairs (ignore $$...$$ blocks first)
    const noDisplay = s.replace(/\$\$[\s\S]*?\$\$/g, "");
    const singles = (noDisplay.match(/(?<!\\)\$/g) || []).length;
    if (singles % 2) errors.push("Unbalanced $ delimiters.");

    // \[ \] and \( \)
    const lSq = (s.match(/(?<!\\)\\\[/g) || []).length;
    const rSq = (s.match(/(?<!\\)\\\]/g) || []).length;
    if (lSq !== rSq) errors.push("Unbalanced \\[ \\] delimiters.");

    const lPar = (s.match(/(?<!\\)\\\(/g) || []).length;
    const rPar = (s.match(/(?<!\\)\\\)/g) || []).length;
    if (lPar !== rPar) errors.push("Unbalanced \\( \\) delimiters.");

    // Basic \frac{num}{den} shape
    const fracAll = s.match(/\\frac/g) || [];
    const fracOk = s.match(/\\frac\{[^{}]+\}\{[^{}]+\}/g) || [];
    if (fracAll.length !== fracOk.length)
      errors.push("Each \\frac must be \\frac{num}{den}.");

    return { isValid: errors.length === 0, errors };
  };

  window.MathUtils = MathUtils;

  /* =========================================================
   * 2) Universal AI feedback renderer (screenshot style)
   * =========================================================
   *
   * INPUT OBJECT SHAPE (flexible):
   * {
   *   summary: "Short paragraph",
   *   correctness: "correct" | "incorrect" | "partially-correct",
   *   strengths: ["...","..."],   // any length (0..n)
   *   issues:    ["...","..."],
   *   next_steps:["...","..."],
   *   key_concepts: ["...","..."],    // will render as chips/badges
   *   // Optional math highlights. You can pass:
   *   // - a string:        "x^2 + 1"
   *   // - an array:        ["x^2 + 1", "\\frac{a}{b}"]
   *   // - an object map:   { part1: "…", part2: "…" }
   *   math_highlight: string | string[] | Record<string,string>
   * }
   *
   * RETURNS: HTML string (no side effects)
   */

  function esc(s) {
    return (s ?? "").toString();
  }

  function normalizeCorrectness(v) {
    const s = String(v || "").toLowerCase();
    if (s === "correct") return "correct";
    if (s === "partially-correct" || s === "partial" || s === "partially")
      return "partially-correct";
    return "incorrect";
  }

  function statusPill(cls) {
    const norm = normalizeCorrectness(cls);
    const map = {
      correct: { t: "Correct", c: "aifx-pill aifx-ok" },
      "partially-correct": { t: "Partially Correct", c: "aifx-pill aifx-warn" },
      incorrect: { t: "Incorrect", c: "aifx-pill aifx-bad" },
    };
    const m = map[norm];
    return `<span class="${m.c}">${m.t}</span>`;
  }

  function list(items) {
    if (!items || !items.length) return "<p>—</p>";
    return `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
  }

  function chips(items) {
    if (!items || !items.length) return "";
    return `<div class="aifx-badges">${items
      .map((k) => `<span class="aifx-badge">${esc(k)}</span>`)
      .join("")}</div>`;
  }

  function renderMathHighlights(high) {
    if (!high) return "";

    // Allow: string | string[] | object map
    let blocks = [];
    if (typeof high === "string") {
      blocks = [high];
    } else if (Array.isArray(high)) {
      blocks = high.slice();
    } else if (typeof high === "object") {
      blocks = Object.entries(high).map(
        ([k, v]) =>
          `<div class="aifx-math-label">${esc(k)}</div> \\(${esc(v)}\\)`
      );
      return `
        <div class="aifx-math-wrap">
          ${blocks.map((b) => `<div class="aifx-math">${b}</div>`).join("")}
        </div>
      `;
    }

    return `
      <div class="aifx-math-wrap">
        ${blocks
          .map((b) => `<div class="aifx-math">\\(${esc(b)}\\)</div>`)
          .join("")}
      </div>
    `;
  }

  /**
   * renderCard(feedback)
   * Returns an HTML string for the feedback card.
   */
  function renderCard(obj) {
    const pill = statusPill(obj?.correctness);

    return `
      <div class="aifx-box">
        <div class="aifx-head">
          <div class="aifx-title">AI Feedback</div>
          ${pill}
        </div>

        <div class="aifx-body">
          ${obj?.summary ? `<p>${esc(obj.summary)}</p>` : ""}

          ${renderMathHighlights(obj?.math_highlight)}

          <div class="aifx-split">
            <div class="aifx-col">
              <h5>Strengths</h5>
              ${list(obj?.strengths)}
            </div>
            <div class="aifx-col">
              <h5>Issues</h5>
              ${list(obj?.issues)}
            </div>
          </div>

          <div class="aifx-col" style="margin-top:12px;">
            <h5>Next Steps</h5>
            ${list(obj?.next_steps)}
          </div>

          ${chips(obj?.key_concepts)}
        </div>
      </div>
    `;
  }

  /**
   * Convenience builder for quick usage:
   * AIRender.build({ summary, correctness, strengths, issues, next_steps, key_concepts, math_highlight })
   * -> returns HTML (same as renderCard)
   */
  function build(parts) {
    return renderCard(parts || {});
  }

  // Expose API
  window.AIRender = {
    renderCard,
    build,
    normalizeCorrectness,
  };
})();
