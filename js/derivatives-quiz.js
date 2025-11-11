// js/derivatives-quiz.js
document.addEventListener("DOMContentLoaded", () => {
  /* =========================
   * DOM
   * ========================= */
  const answer1Input = document.getElementById("answer1");
  const answer2Input = document.getElementById("answer2");

  const preview1 = document.getElementById("preview-answer1");
  const preview2 = document.getElementById("preview-answer2");
  const previewContent1 = preview1?.querySelector(
    ".derivative-preview-content"
  );
  const previewContent2 = preview2?.querySelector(
    ".derivative-preview-content"
  );

  const validation1 = document.getElementById("validation-answer1");
  const validation2 = document.getElementById("validation-answer2");

  const reasoningInput = document.getElementById("reasoning-input");
  const mathPreviewContent = document.getElementById("math-preview-content");
  const latexValidation = document.getElementById("latex-validation");

  const checkAnswerBtn = document.getElementById("check-answer");
  const showSolutionBtn = document.getElementById("show-solution");
  const showStepsBtn = document.getElementById("show-steps");
  const clearAllBtn = document.getElementById("clear-all");
  const newQuestionBtn = document.getElementById("new-question");
  const showHintsBtn = document.getElementById("show-hints");
  const fillExamplesBtn = document.getElementById("fill-examples");

  const answer1Status = document.getElementById("answer1-status-icon");
  const answer2Status = document.getElementById("answer2-status-icon");
  const reasoningStatus = document.getElementById("reasoning-status-icon");
  const latexStatus = document.getElementById("latex-status-icon");

  const function1Display = document.getElementById("function1-display");
  const function2Display = document.getElementById("function2-display");

  const feedbackArea = document.getElementById("feedback");
  const stepByStepArea = document.getElementById("step-by-step");
  const solutionArea = document.getElementById("solution");
  const stepsContent = document.getElementById("steps-content");
  const solutionContent = document.getElementById("solution-content");

  const aiFeedbackSection = document.getElementById("ai-feedback-section");
  const aiFeedbackContent = document.getElementById("ai-feedback-content");

  const hintArea = document.getElementById("hint");
  const examplesArea = document.getElementById("examples");

  /* =========================
   * DATA
   * ========================= */
  let currentQuestion = {
    part1: {
      function: "f(x) = 3\\cos(2x) + 4\\sin(3x)",
      answer: "-6\\sin(2x) + 12\\cos(3x)",
      steps: [
        "Apply the chain rule to each term separately",
        "For 3\\cos(2x): derivative = 3 \\cdot (-2\\sin(2x)) = -6\\sin(2x)",
        "For 4\\sin(3x): derivative = 4 \\cdot (3\\cos(3x)) = 12\\cos(3x)",
        "Combine the results: f'(x) = -6\\sin(2x) + 12\\cos(3x)",
      ],
    },
    part2: {
      function: "g(y) = \\ln(2y^2 + 3y + 1)",
      answer: "\\frac{4y + 3}{2y^2 + 3y + 1}",
      steps: [
        "Use the chain rule for logarithms: \\frac{d}{dy}[\\ln(u(y))] = \\frac{u'(y)}{u(y)}",
        "Let u(y) = 2y^2 + 3y + 1",
        "Find u'(y) = 4y + 3",
        "Apply the formula: g'(y) = \\frac{4y + 3}{2y^2 + 3y + 1}",
      ],
    },
  };

  /* =========================
   * INIT
   * ========================= */
  initQuiz();

  function initQuiz() {
    updateQuestionDisplay();
    setupEventListeners();
    // initial preview/validation states
    updatePreview(answer1Input, previewContent1, preview1);
    updatePreview(answer2Input, previewContent2, preview2);
    updateMathPreview();
    updateInputStatus();
  }

  function updateQuestionDisplay() {
    if (function1Display)
      function1Display.innerHTML = `\\( ${currentQuestion.part1.function} \\)`;
    if (function2Display)
      function2Display.innerHTML = `\\( ${currentQuestion.part2.function} \\)`;
    if (window.MathJax)
      MathJax.typesetPromise([function1Display, function2Display]);
  }

  /* =========================
   * EVENTS
   * ========================= */
  function setupEventListeners() {
    answer1Input?.addEventListener("input", () => {
      updatePreview(answer1Input, previewContent1, preview1);
      updateInputStatus();
    });

    answer2Input?.addEventListener("input", () => {
      updatePreview(answer2Input, previewContent2, preview2);
      updateInputStatus();
    });

    reasoningInput?.addEventListener("input", () => {
      updateMathPreview();
      updateInputStatus();
    });

    checkAnswerBtn?.addEventListener("click", checkAnswers);
    showSolutionBtn?.addEventListener("click", showSolution);
    showStepsBtn?.addEventListener("click", showSteps);
    clearAllBtn?.addEventListener("click", clearAll);
    newQuestionBtn?.addEventListener("click", generateNewQuestion);
    showHintsBtn?.addEventListener("click", toggleHints);
    fillExamplesBtn?.addEventListener("click", fillWithExamples);
  }

  /* =========================
   * PREVIEW (answers)
   * ========================= */
  function updatePreview(inputEl, previewContentEl, previewContainerEl) {
    if (!inputEl || !previewContentEl || !previewContainerEl) return;

    const value = (inputEl.value || "").trim();
    if (!value) {
      previewContentEl.innerHTML =
        '<span class="derivative-preview-placeholder">Your derivative will appear here as you type…</span>';
      previewContainerEl.classList.remove("preview-valid", "preview-invalid");
      return;
    }

    let latex = value;
    const hasDelims =
      (latex.startsWith("\\(") && latex.endsWith("\\)")) ||
      (latex.startsWith("\\[") && latex.endsWith("\\]")) ||
      (latex.startsWith("$") && latex.endsWith("$"));
    if (!hasDelims) latex = `\\( ${latex} \\)`;

    previewContentEl.innerHTML = latex;
    if (window.MathJax) {
      MathJax.typesetPromise([previewContentEl])
        .then(() => {
          previewContainerEl.classList.add("preview-valid");
          previewContainerEl.classList.remove("preview-invalid");
        })
        .catch(() => {
          previewContentEl.innerHTML =
            '<span style="color:#dc3545;">Invalid LaTeX syntax</span>';
          previewContainerEl.classList.remove("preview-valid");
          previewContainerEl.classList.add("preview-invalid");
        });
    }
  }

  /* =========================
   * REASONING PREVIEW + LaTeX validation
   * ========================= */
  function updateMathPreview() {
    if (!reasoningInput || !mathPreviewContent || !latexValidation) return;

    const value = (reasoningInput.value || "").trim();
    if (!value) {
      mathPreviewContent.innerHTML =
        "Your mathematical notation will appear here as you type...";
      latexValidation.classList.add("hidden");
      setStatus(latexStatus, false);
      return;
    }

    // Prefer shared validator when present
    const check = window.MathUtils
      ? window.MathUtils.validateLatexSyntax(value)
      : fallbackValidateLatex(value);

    if (check.isValid) {
      latexValidation.innerHTML =
        '<span class="latex-valid">✓ Valid LaTeX syntax</span>';
      latexValidation.classList.remove("hidden");
      setStatus(latexStatus, true);

      mathPreviewContent.innerHTML = value;
      if (window.MathJax) {
        MathJax.typesetPromise([mathPreviewContent]).catch(() => {
          mathPreviewContent.innerHTML =
            '<span style="color:#dc3545;">Error rendering LaTeX</span>';
        });
      }
    } else {
      latexValidation.innerHTML = `<span class="latex-invalid">✗ LaTeX errors: ${check.errors.join(
        ", "
      )}</span>`;
      latexValidation.classList.remove("hidden");
      setStatus(latexStatus, false);
      mathPreviewContent.innerHTML = "Fix LaTeX errors to see preview...";
    }
  }

  function fallbackValidateLatex(text) {
    const errs = [];
    const open = (text.match(/(?<!\\){/g) || []).length;
    const close = (text.match(/(?<!\\)}/g) || []).length;
    if (open !== close) errs.push("unbalanced braces");
    const singles = (
      text.replace(/\$\$[\s\S]*?\$\$/g, "").match(/(?<!\\)\$/g) || []
    ).length;
    if (singles % 2) errs.push("unbalanced $ delimiters");
    return { isValid: errs.length === 0, errors: errs };
  }

  /* =========================
   * STATUS + CHECK BUTTON
   * ========================= */
  function updateInputStatus() {
    const a1 = !!answer1Input?.value.trim();
    const a2 = !!answer2Input?.value.trim();
    const rs = !!reasoningInput?.value.trim();

    setStatus(answer1Status, a1);
    setStatus(answer2Status, a2);
    setStatus(reasoningStatus, rs);

    const latexOk = latexStatus?.classList.contains("status-check");
    if (checkAnswerBtn) checkAnswerBtn.disabled = !(a1 && a2 && rs && latexOk);
  }

  function setStatus(iconEl, good) {
    if (!iconEl) return;
    iconEl.textContent = good ? "✓" : "✗";
    iconEl.className = good ? "status-check" : "status-cross";
  }

  /* =========================
   * ANSWER CHECK
   * ========================= */
  function normalizeAnswer(ans) {
    return (ans || "")
      .replace(/\s+/g, "")
      .replace(/\\cdot/g, "")
      .replace(/\*/g, "")
      .replace(/\\left|\\right/g, "")
      .toLowerCase();
  }

  async function checkAnswers() {
    const u1 = (answer1Input.value || "").trim();
    const u2 = (answer2Input.value || "").trim();
    const reasoning = (reasoningInput.value || "").trim();

    const ok1 =
      normalizeAnswer(u1) === normalizeAnswer(currentQuestion.part1.answer);
    const ok2 =
      normalizeAnswer(u2) === normalizeAnswer(currentQuestion.part2.answer);

    // field-level messages
    if (validation1) {
      validation1.textContent = ok1 ? "✓ Correct!" : "✗ Incorrect. Try again.";
      validation1.style.color = ok1 ? "#28a745" : "#dc3545";
    }
    if (validation2) {
      validation2.textContent = ok2 ? "✓ Correct!" : "✗ Incorrect. Try again.";
      validation2.style.color = ok2 ? "#28a745" : "#dc3545";
    }

    // reasoning quality gate
    const rq = scoreReasoning(reasoning);

    // overall UI feedback
    const bothAnswersCorrect = ok1 && ok2;
    if (feedbackArea) {
      feedbackArea.textContent = bothAnswersCorrect
        ? "Great job! Both derivatives are correct."
        : "Some answers need correction. Check the hints or solution for help.";
      feedbackArea.className = bothAnswersCorrect
        ? "feedback correct"
        : "feedback incorrect";
      feedbackArea.classList.remove("hidden");
    }

    // correctness label for AI = answers AND reasoning
    let correctnessLabel = "incorrect";
    if (bothAnswersCorrect && rq.ok) correctnessLabel = "correct";
    else if (bothAnswersCorrect || rq.ok)
      correctnessLabel = "partially-correct";

    await generateAIFeedback({
      correctnessLabel,
      bothAnswersCorrect,
      reasoningScore: rq,
      userAnswers: { part1: u1, part2: u2 },
      reasoning,
    });
  }

  /* =========================
   * REASONING SCORING
   * ========================= */
  function scoreReasoning(text) {
    const t = (text || "").toLowerCase();
    const minLen = 25; // short notes are often not substantive
    const hasMath = /\$|\\\(|\\\[|\\frac|\\sin|\\cos|\\ln|\\cdot/.test(t);
    const keywords = [
      "chain rule",
      "differentiate",
      "derivative",
      "apply",
      "u(y)",
      "let u",
      "inner",
    ];
    const hits = keywords.filter((k) => t.includes(k)).length;

    // LaTeX validity from status icon
    const latexOk = latexStatus?.classList.contains("status-check");

    const ok = t.length >= minLen && hasMath && hits >= 1 && latexOk;
    const issues = [];
    if (t.length < minLen) issues.push("Reasoning is too brief.");
    if (!hasMath) issues.push("No mathematical notation used.");
    if (hits < 1) issues.push("Key concept (e.g., chain rule) not referenced.");
    if (!latexOk) issues.push("LaTeX has syntax errors.");

    const strengths = [];
    if (t.length >= minLen) strengths.push("Explanation length is sufficient.");
    if (hasMath) strengths.push("Uses mathematical notation.");
    if (hits >= 1) strengths.push("References key differentiation concept(s).");
    if (latexOk) strengths.push("Valid LaTeX syntax.");

    return { ok, strengths, issues };
  }

  /* =========================
   * AI FEEDBACK (uses global services when available)
   * ========================= */
  async function generateAIFeedback(ctx) {
    const {
      correctnessLabel,
      bothAnswersCorrect,
      reasoningScore,
      userAnswers,
      reasoning,
    } = ctx;

    try {
      const questionData = {
        question: `Find derivatives: ${currentQuestion.part1.function} and ${currentQuestion.part2.function}`,
        parameters: {
          type: "derivatives",
          part1: currentQuestion.part1.function,
          part2: currentQuestion.part2.function,
        },
        correctAnswer: {
          part1: currentQuestion.part1.answer,
          part2: currentQuestion.part2.answer,
        },
      };

      // Prefer your OpenAI service; otherwise fallback locally
      let feedbackObj;
      if (window.openAIService?.generateFeedback) {
        // Single-string user answer for API
        const userAnswerStr = `Part 1: ${userAnswers.part1}; Part 2: ${userAnswers.part2}`;
        feedbackObj = await window.openAIService.generateFeedback(
          questionData,
          userAnswerStr,
          reasoning,
          bothAnswersCorrect // keep for compatibility; we override correctness after
        );
      } else {
        feedbackObj = {};
      }

      // Ensure cross-quiz consistent correctness policy:
      // Correct only if answers AND reasoning are good.
      feedbackObj = {
        summary:
          feedbackObj.summary ||
          (correctnessLabel === "correct"
            ? "Nice work—your derivatives and reasoning are both sound."
            : correctnessLabel === "partially-correct"
            ? "You got part of it right. Review the weaker parts noted below."
            : "There are important issues to fix. Use the notes below to revise."),
        correctness: correctnessLabel,
        strengths: feedbackObj.strengths || reasoningScore.strengths,
        issues:
          feedbackObj.issues ||
          (correctnessLabel === "correct" ? [] : reasoningScore.issues),
        next_steps:
          feedbackObj.next_steps ||
          (correctnessLabel === "correct"
            ? [
                "Practice mixed trig/log derivatives",
                "Keep presenting clean LaTeX.",
              ]
            : [
                "Re-derive each term with the chain rule carefully.",
                "Tighten reasoning with clear steps and valid LaTeX.",
              ]),
        key_concepts: feedbackObj.key_concepts || [
          "Differentiation",
          "Chain rule",
          "Trigonometric derivatives",
          "Logarithmic derivatives",
        ],
        math_highlight:
          feedbackObj.math_highlight ||
          (bothAnswersCorrect ? currentQuestion.part1.answer : ""),
      };

      // Render card
      if (window.AIRender?.renderCard) {
        aiFeedbackContent.innerHTML = window.AIRender.renderCard(feedbackObj);
      } else {
        aiFeedbackContent.innerHTML = `<div class="ai-card"><strong>AI Feedback</strong><p>${escapeHTML(
          feedbackObj.summary
        )}</p></div>`;
      }
      aiFeedbackSection.classList.remove("hidden");

      if (window.MathJax) MathJax.typesetPromise([aiFeedbackContent]);
    } catch (e) {
      console.error("AI feedback error:", e);
      aiFeedbackContent.innerHTML =
        '<p class="error-message">Unable to generate AI feedback right now.</p>';
      aiFeedbackSection.classList.remove("hidden");
    }
  }

  function escapeHTML(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /* =========================
   * SOLUTION / STEPS
   * ========================= */
  function showSolution() {
    if (!solutionContent || !solutionArea) return;
    solutionContent.innerHTML = `
      <div class="step">
        <div class="step-title">Part 1: Trigonometric Function</div>
        <p>Given: \\( ${currentQuestion.part1.function} \\)</p>
        <p>Solution: \\( ${currentQuestion.part1.answer} \\)</p>
      </div>
      <div class="step">
        <div class="step-title">Part 2: Logarithmic Function</div>
        <p>Given: \\( ${currentQuestion.part2.function} \\)</p>
        <p>Solution: \\( ${currentQuestion.part2.answer} \\)</p>
      </div>
    `;
    solutionArea.classList.remove("hidden");
    if (window.MathJax) MathJax.typesetPromise([solutionContent]);
  }

  function showSteps() {
    if (!stepsContent || !stepByStepArea) return;
    stepsContent.innerHTML = `
      <div class="step">
        <div class="step-title">Part 1: Trigonometric Function</div>
        <p>Given: \\( ${currentQuestion.part1.function} \\)</p>
        <ol>${currentQuestion.part1.steps
          .map((s) => `<li>${s}</li>`)
          .join("")}</ol>
        <p>Final answer: \\( ${currentQuestion.part1.answer} \\)</p>
      </div>
      <div class="step">
        <div class="step-title">Part 2: Logarithmic Function</div>
        <p>Given: \\( ${currentQuestion.part2.function} \\)</p>
        <ol>${currentQuestion.part2.steps
          .map((s) => `<li>${s}</li>`)
          .join("")}</ol>
        <p>Final answer: \\( ${currentQuestion.part2.answer} \\)</p>
      </div>
    `;
    stepByStepArea.classList.remove("hidden");
    if (window.MathJax) MathJax.typesetPromise([stepsContent]);
  }

  /* =========================
   * UTIL
   * ========================= */
  function clearAll() {
    if (answer1Input) answer1Input.value = "";
    if (answer2Input) answer2Input.value = "";
    if (reasoningInput) reasoningInput.value = "";

    if (validation1) validation1.textContent = "";
    if (validation2) validation2.textContent = "";

    feedbackArea?.classList.add("hidden");
    stepByStepArea?.classList.add("hidden");
    solutionArea?.classList.add("hidden");
    aiFeedbackSection?.classList.add("hidden");
    hintArea?.classList.add("hidden");
    examplesArea?.classList.add("hidden");

    updatePreview(answer1Input, previewContent1, preview1);
    updatePreview(answer2Input, previewContent2, preview2);
    updateMathPreview();
    updateInputStatus();
  }

  function generateNewQuestion() {
    // simple toggle between two presets
    if (currentQuestion.part1.function === "f(x) = 3\\cos(2x) + 4\\sin(3x)") {
      currentQuestion = {
        part1: {
          function: "f(x) = 2\\cos(4x) - 5\\sin(x)",
          answer: "-8\\sin(4x) - 5\\cos(x)",
          steps: [
            "Apply the chain rule to each term separately",
            "For 2\\cos(4x): derivative = 2 \\cdot (-4\\sin(4x)) = -8\\sin(4x)",
            "For -5\\sin(x): derivative = -5 \\cdot (\\cos(x)) = -5\\cos(x)",
            "Combine the results: f'(x) = -8\\sin(4x) - 5\\cos(x)",
          ],
        },
        part2: {
          function: "g(y) = \\ln(y^3 - 2y + 5)",
          answer: "\\frac{3y^2 - 2}{y^3 - 2y + 5}",
          steps: [
            "Use the chain rule for logarithms: \\frac{d}{dy}[\\ln(u(y))] = \\frac{u'(y)}{u(y)}",
            "Let u(y) = y^3 - 2y + 5",
            "Find u'(y) = 3y^2 - 2",
            "Apply the formula: g'(y) = \\frac{3y^2 - 2}{y^3 - 2y + 5}",
          ],
        },
      };
    } else {
      currentQuestion = {
        part1: {
          function: "f(x) = 3\\cos(2x) + 4\\sin(3x)",
          answer: "-6\\sin(2x) + 12\\cos(3x)",
          steps: [
            "Apply the chain rule to each term separately",
            "For 3\\cos(2x): derivative = 3 \\cdot (-2\\sin(2x)) = -6\\sin(2x)",
            "For 4\\sin(3x): derivative = 4 \\cdot (3\\cos(3x)) = 12\\cos(3x)",
            "Combine the results: f'(x) = -6\\sin(2x) + 12\\cos(3x)",
          ],
        },
        part2: {
          function: "g(y) = \\ln(2y^2 + 3y + 1)",
          answer: "\\frac{4y + 3}{2y^2 + 3y + 1}",
          steps: [
            "Use the chain rule for logarithms: \\frac{d}{dy}[\\ln(u(y))] = \\frac{u'(y)}{u(y)}",
            "Let u(y) = 2y^2 + 3y + 1",
            "Find u'(y) = 4y + 3",
            "Apply the formula: g'(y) = \\frac{4y + 3}{2y^2 + 3y + 1}",
          ],
        },
      };
    }

    updateQuestionDisplay();
    clearAll();
  }

  function toggleHints() {
    if (!hintArea) return;
    if (hintArea.classList.contains("hidden")) {
      hintArea.classList.remove("hidden");
      examplesArea?.classList.add("hidden");
    } else {
      hintArea.classList.add("hidden");
    }
  }

  function fillWithExamples() {
    if (!answer1Input || !answer2Input || !reasoningInput) return;

    answer1Input.value = "-6\\sin(2x) + 12\\cos(3x)";
    answer2Input.value = "\\frac{4y + 3}{2y^2 + 3y + 1}";
    reasoningInput.value = `For Part 1:
Using the chain rule:
\\[\\frac{d}{dx}[3\\cos(2x)] = 3 \\cdot (-2\\sin(2x)) = -6\\sin(2x)\\]
\\[\\frac{d}{dx}[4\\sin(3x)] = 4 \\cdot (3\\cos(3x)) = 12\\cos(3x)\\]
So $f'(x) = -6\\sin(2x) + 12\\cos(3x)$

For Part 2:
Using the chain rule for logarithms:
\\[g'(y) = \\frac{d}{dy}[\\ln(u(y))] = \\frac{u'(y)}{u(y)}\\]
Where $u(y) = 2y^2 + 3y + 1$ and $u'(y) = 4y + 3$
So $g'(y) = \\frac{4y + 3}{2y^2 + 3y + 1}$`;

    updatePreview(answer1Input, previewContent1, preview1);
    updatePreview(answer2Input, previewContent2, preview2);
    updateMathPreview();
    updateInputStatus();
  }
});
