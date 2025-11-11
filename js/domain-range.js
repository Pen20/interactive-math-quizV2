// Domain & Range ( f(x) = a + c |x^2 - b|, c > 0 ) – wired to your HTML IDs
document.addEventListener("DOMContentLoaded", () => {
  // ---- Model init ----
  const savedModel = localStorage.getItem("gpt_model") || "gpt-4o-mini";
  if (window.openAIService?.initialize)
    window.openAIService.initialize(savedModel);

  // ---- Element refs (match your HTML) ----
  const el = {
    ans1: byId("ans1"),
    ans2: byId("ans2"),
    validation1: byId("validation-ans1"),
    validation2: byId("validation-ans2"),

    functionDisplay: byId("function-display"),
    functionDisplay2: byId("function-display-2"),

    reasoningInput: byId("reasoning-input"),
    mathPreviewContent: byId("math-preview-content"),
    latexValidation: byId("latex-validation"),

    ans1Status: byId("ans1-status-icon"),
    ans2Status: byId("ans2-status-icon"),
    reasoningStatus: byId("reasoning-status-icon"),
    latexStatus: byId("latex-status-icon"),

    checkBtn: byId("check-answer"),
    showSolutionBtn: byId("show-solution"),
    showStepsBtn: byId("show-steps"),
    clearAllBtn: byId("clear-all"),
    newQuestionBtn: byId("new-question"),
    showHintsBtn: byId("show-hints"),
    fillExamplesBtn: byId("fill-examples"),

    feedbackArea: byId("feedback"),
    stepsArea: byId("step-by-step"),
    solutionArea: byId("solution"),
    stepsContent: byId("steps-content"),
    solutionContent: byId("solution-content"),

    aiFeedbackArea: byId("ai-feedback-enhanced"),
    aiFeedbackContent: byId("ai-feedback-content-enhanced"),

    hintArea: byId("hint"),
    examplesArea: byId("examples"),

    preview1: byId("preview-ans1"),
    preview2: byId("preview-ans2"),
  };

  const previewContent1 = el.preview1.querySelector(
    ".domain-range-preview-content"
  );
  const previewContent2 = el.preview2.querySelector(
    ".domain-range-preview-content"
  );

  // ---- MathJax helper ----
  const typeset = (nodes) =>
    window.MathJax?.typesetPromise(nodes).catch(() => {});
  let mjTimer;

  // ---- Question bank (same values as in HTML) ----
  const questionBank = [
    {
      a: 1,
      b: 1,
      c: 1,
      domain: "oo(-inf,inf)",
      range: "co(1,inf)",
      steps: [
        "The function contains x² and absolute value, both defined for all real numbers",
        "There are no restrictions like division by zero or square roots of negative numbers",
        "Therefore, Dom(f) = ℝ = (-∞, ∞)",
        "Since |x² - 1| ≥ 0 and c = 1 > 0, we have f(x) ≥ 1",
        "The minimum occurs when |x² - 1| = 0, i.e., when x² = 1",
        "As |x| → ∞, |x² - 1| → ∞, so f(x) → ∞",
        "Therefore, Range(f) = [1, ∞)",
      ],
    },
    {
      a: 2,
      b: 4,
      c: 3,
      domain: "oo(-inf,inf)",
      range: "co(2,inf)",
      steps: [
        "The function contains x² and absolute value, both defined for all real numbers",
        "There are no restrictions like division by zero or square roots of negative numbers",
        "Therefore, Dom(f) = ℝ = (-∞, ∞)",
        "Since |x² - 4| ≥ 0 and c = 3 > 0, we have f(x) ≥ 2",
        "The minimum occurs when |x² - 4| = 0, i.e., when x² = 4",
        "As |x| → ∞, |x² - 4| → ∞, so f(x) → ∞",
        "Therefore, Range(f) = [2, ∞)",
      ],
    },
    {
      a: -1,
      b: 9,
      c: 2,
      domain: "oo(-inf,inf)",
      range: "co(-1,inf)",
      steps: [
        "The function contains x² and absolute value, both defined for all real numbers",
        "There are no restrictions like division by zero or square roots of negative numbers",
        "Therefore, Dom(f) = ℝ = (-∞, ∞)",
        "Since |x² - 9| ≥ 0 and c = 2 > 0, we have f(x) ≥ -1",
        "The minimum occurs when |x² - 9| = 0, i.e., when x² = 9",
        "As |x| → ∞, |x² - 9| → ∞, so f(x) → ∞",
        "Therefore, Range(f) = [-1, ∞)",
      ],
    },
  ];

  // ---- State ----
  let idx = 0;

  // ---- Init ----
  initQuiz();

  // ========= Functions =========

  function byId(id) {
    return document.getElementById(id);
  }

  function initQuiz() {
    updateQuestionDisplay();
    attachListeners();
    updateInputStatus();
    updatePreview(el.ans1, previewContent1, el.preview1);
    updatePreview(el.ans2, previewContent2, el.preview2);
  }

  function currentQ() {
    return questionBank[idx];
  }

  function updateQuestionDisplay() {
    const q = currentQ();
    const tex = `${q.a} + ${q.c}\\,\\lvert x^2 - ${q.b}\\rvert`;
    el.functionDisplay.innerHTML = `\\( f(x) = ${tex} \\)`;
    el.functionDisplay2.innerHTML = `\\( f(x) = ${tex} \\)`;
    typeset([el.functionDisplay, el.functionDisplay2]);
  }

  function attachListeners() {
    // Inputs
    el.ans1.addEventListener("input", () => {
      updatePreview(el.ans1, previewContent1, el.preview1);
      updateInputStatus();
    });
    el.ans2.addEventListener("input", () => {
      updatePreview(el.ans2, previewContent2, el.preview2);
      updateInputStatus();
    });

    el.reasoningInput.addEventListener("input", () => {
      updateMathPreview();
      updateInputStatus();
    });

    // Buttons
    el.checkBtn.addEventListener("click", checkAnswers); // <-- AI feedback will run in here
    el.showSolutionBtn.addEventListener("click", showSolution);
    el.showStepsBtn.addEventListener("click", showSteps);
    el.clearAllBtn.addEventListener("click", clearAll);
    el.newQuestionBtn.addEventListener("click", generateNewQuestion);
    el.showHintsBtn.addEventListener("click", toggleHints);
    el.fillExamplesBtn.addEventListener("click", fillWithExamples);
  }

  // Live interval preview (same behavior as your inline version)
  function updatePreview(input, previewContent, previewContainer) {
    const value = (input.value || "").trim();

    if (!value) {
      previewContent.innerHTML =
        '<span class="domain-range-preview-placeholder">Your answer will appear here as you type...</span>';
      previewContainer.classList.remove("preview-valid", "preview-invalid");
      return;
    }

    try {
      const latex = convertIntervalToLatex(value);
      previewContent.innerHTML = latex;
      previewContainer.classList.add("preview-valid");
      previewContainer.classList.remove("preview-invalid");
      typeset([previewContent]);
    } catch {
      previewContent.innerHTML =
        '<span style="color:#dc3545;">Invalid interval notation</span>';
      previewContainer.classList.remove("preview-valid");
      previewContainer.classList.add("preview-invalid");
    }
  }

  // Your simple converter (kept as-is)
  function convertIntervalToLatex(interval) {
    let latex = interval;
    latex = latex.replace(/oo\(/g, "\\(");
    latex = latex.replace(/co\(/g, "\\[");
    latex = latex.replace(/inf/g, "\\infty");
    latex = latex.replace(/,/g, ", ");
    latex = latex.replace(/\)/g, "\\)");
    latex = latex.replace(/\]/g, "\\]");
    return `\\( ${latex} \\)`;
  }

  function updateMathPreview() {
    const value = (el.reasoningInput.value || "").trim();

    if (!value) {
      el.mathPreviewContent.textContent =
        "Your mathematical notation will appear here as you type...";
      el.latexValidation.classList.add("hidden");
      setStatusIcon(el.latexStatus, false);
      return;
    }

    const validation = window.MathUtils?.validateLatexSyntax
      ? window.MathUtils.validateLatexSyntax(value)
      : { isValid: true, errors: [] };

    setStatusIcon(el.latexStatus, validation.isValid);

    if (validation.isValid) {
      el.latexValidation.innerHTML =
        '<span class="latex-valid">✓ Valid LaTeX syntax</span>';
      el.latexValidation.classList.remove("hidden");
      el.mathPreviewContent.innerHTML = value;
      if (mjTimer) clearTimeout(mjTimer);
      mjTimer = setTimeout(() => typeset([el.mathPreviewContent]), 200);
    } else {
      el.latexValidation.innerHTML = `<span class="latex-invalid">✗ LaTeX errors: ${validation.errors.join(
        ", "
      )}</span>`;
      el.latexValidation.classList.remove("hidden");
      el.mathPreviewContent.textContent =
        "Your mathematical notation will appear here as you type...";
    }
  }

  function updateInputStatus() {
    const a1 = !!el.ans1.value.trim();
    const a2 = !!el.ans2.value.trim();
    const r = !!el.reasoningInput.value.trim();

    setStatusIcon(el.ans1Status, a1);
    setStatusIcon(el.ans2Status, a2);
    setStatusIcon(el.reasoningStatus, r);

    el.checkBtn.disabled = !(a1 && a2 && r);
  }

  function setStatusIcon(node, good) {
    node.textContent = good ? "✓" : "✗";
    node.className = good ? "status-check" : "status-cross";
  }

  // Normalize answer for comparison
  function normalize(s) {
    return (s || "").replace(/\s+/g, "").toLowerCase();
  }

  // ====== MAIN: Check + AI feedback ======
  async function checkAnswers() {
    const q = currentQ();
    const userAns1 = (el.ans1.value || "").trim();
    const userAns2 = (el.ans2.value || "").trim();
    const reasoning = (el.reasoningInput.value || "").trim();

    const isAns1Correct = normalize(userAns1) === normalize(q.domain);
    const isAns2Correct = normalize(userAns2) === normalize(q.range);
    const allCorrect = isAns1Correct && isAns2Correct;

    // UI correctness badges
    el.validation1.textContent = isAns1Correct
      ? "✓ Correct!"
      : "✗ Incorrect. Try again.";
    el.validation1.style.color = isAns1Correct ? "#28a745" : "#dc3545";

    el.validation2.textContent = isAns2Correct
      ? "✓ Correct!"
      : "✗ Incorrect. Try again.";
    el.validation2.style.color = isAns2Correct ? "#28a745" : "#dc3545";

    // High-level feedback banner
    el.feedbackArea.textContent = allCorrect
      ? "Great job! Both domain and range are correct."
      : "Some answers need correction. Check the hints or solution for help.";
    el.feedbackArea.className = allCorrect
      ? "feedback correct"
      : "feedback incorrect";
    el.feedbackArea.classList.remove("hidden");

    // === AI FEEDBACK (this is the new part) ===
    await generateAIFeedback(allCorrect, reasoning, userAns1, userAns2, q);
  }

  async function generateAIFeedback(isCorrect, reasoning, userDom, userRan, q) {
    try {
      const questionData = {
        question:
          "Find the domain and range of f(x) = a + c|x^2 - b| with c>0.",
        parameters: { a: q.a, b: q.b, c: q.c },
        correctAnswer: { domain: q.domain, range: q.range },
      };

      const userAnswer = { domain: userDom, range: userRan };

      // Ask the model (your openai-service.js) for feedback
      const feedback = await window.openAIService.generateFeedback(
        questionData,
        userAnswer,
        reasoning,
        isCorrect
      );

      // Render via your AIRender helper
      if (window.AIRender?.renderCard) {
        el.aiFeedbackContent.innerHTML = window.AIRender.renderCard(feedback);
      } else if (window.AIRender?.build) {
        el.aiFeedbackContent.innerHTML = window.AIRender.build(feedback);
      } else {
        // Minimal fallback
        el.aiFeedbackContent.innerHTML = fallbackFeedbackHTML(feedback);
      }

      el.aiFeedbackArea.classList.remove("hidden");
      typeset([el.aiFeedbackContent]);
    } catch (err) {
      console.error("AI feedback error:", err);
      el.aiFeedbackContent.innerHTML =
        "<p>Unable to generate AI feedback at this time.</p>";
      el.aiFeedbackArea.classList.remove("hidden");
    }
  }

  function fallbackFeedbackHTML(obj) {
    const parts = [];
    if (obj?.summary) parts.push(`<p>${obj.summary}</p>`);
    if (obj?.correctness)
      parts.push(`<p><strong>Status:</strong> ${obj.correctness}</p>`);
    if (obj?.math_highlight) parts.push(`<p>\\(${obj.math_highlight}\\)</p>`);
    if (obj?.issues?.length)
      parts.push(`<p><strong>Issues:</strong> ${obj.issues.join("; ")}</p>`);
    if (obj?.next_steps?.length)
      parts.push(`<p><strong>Next:</strong> ${obj.next_steps.join("; ")}</p>`);
    return parts.join("");
  }

  // ===== Other UI actions =====

  function showSolution() {
    const q = currentQ();
    el.solutionContent.innerHTML = `
      <div class="step">
        <div class="step-title">Domain</div>
        <p>Squares and absolute values are defined for all \\(x\\in\\mathbb{R}\\). Hence \\(Dom(f)=\\mathbb{R}=(-\\infty,\\infty)\\) → <code>${q.domain}</code>.</p>
      </div>
      <div class="step">
        <div class="step-title">Range</div>
        <p>Since \\(|x^2-${q.b}|\\ge 0\\) and \\(${q.c}>0\\), we get \\(f(x)=${q.a}+${q.c}|x^2-${q.b}|\\ge ${q.a}\\).
           The minimum occurs when \\(|x^2-${q.b}|=0\\) (i.e., \\(x=\\pm\\sqrt{${q.b}}\\)), so \\(f_{\\min}=${q.a}\\).
           As \\(|x|\\to\\infty\\), \\(|x^2-${q.b}|\\to\\infty\\Rightarrow f(x)\\to\\infty\\).</p>
        <p>Therefore \\(Range(f)=[${q.a},\\infty)\\) → <code>${q.range}</code>.</p>
      </div>`;
    el.solutionArea.classList.remove("hidden");
    typeset([el.solutionContent]);
  }

  function showSteps() {
    const q = currentQ();
    el.stepsContent.innerHTML = `
      <div class="step">
        <div class="step-title">Domain</div>
        <p>Given: \\( f(x) = ${q.a} + ${q.c}|x^2 - ${q.b}| \\)</p>
        <ol>${q.steps
          .slice(0, 3)
          .map((s) => `<li>${s}</li>`)
          .join("")}</ol>
        <p>Final answer: \\( Dom(f) = \\mathbb{R} = (-\\infty, \\infty) \\) → <code>${
          q.domain
        }</code></p>
      </div>
      <div class="step">
        <div class="step-title">Range</div>
        <p>Given: \\( f(x) = ${q.a} + ${q.c}|x^2 - ${q.b}| \\)</p>
        <ol>${q.steps
          .slice(3)
          .map((s) => `<li>${s}</li>`)
          .join("")}</ol>
        <p>Final answer: \\( Range(f) = [${q.a}, \\infty) \\) → <code>${
      q.range
    }</code></p>
      </div>`;
    el.stepsArea.classList.remove("hidden");
    typeset([el.stepsContent]);
  }

  function clearAll() {
    el.ans1.value = "";
    el.ans2.value = "";
    el.reasoningInput.value = "";
    el.validation1.textContent = "";
    el.validation2.textContent = "";
    el.feedbackArea.classList.add("hidden");
    el.stepsArea.classList.add("hidden");
    el.solutionArea.classList.add("hidden");
    el.aiFeedbackArea.classList.add("hidden");
    el.hintArea.classList.add("hidden");
    el.examplesArea.classList.add("hidden");

    updatePreview(el.ans1, previewContent1, el.preview1);
    updatePreview(el.ans2, previewContent2, el.preview2);
    updateMathPreview();
    updateInputStatus();
  }

  function generateNewQuestion() {
    idx = (idx + 1) % questionBank.length;
    updateQuestionDisplay();
    clearAll();
  }

  function toggleHints() {
    if (el.hintArea.classList.contains("hidden")) {
      el.hintArea.classList.remove("hidden");
      el.examplesArea.classList.add("hidden");
    } else {
      el.hintArea.classList.add("hidden");
    }
  }

  function fillWithExamples() {
    const q = currentQ();
    el.ans1.value = q.domain;
    el.ans2.value = q.range;
    el.reasoningInput.value = `Since $|x^2 - ${q.b}| \\ge 0$ for all real $x$, and $c = ${q.c} > 0$, we have:
$$f(x) = ${q.a} + ${q.c}|x^2 - ${q.b}| \\ge ${q.a}$$

The minimum occurs when $|x^2 - ${q.b}| = 0$, i.e., when $x^2 = ${q.b}$, giving $f(x) = ${q.a}$.

As $|x| \\to \\infty$, $|x^2 - ${q.b}| \\to \\infty$, so $f(x) \\to \\infty$.

Therefore:
$$Dom(f) = \\mathbb{R} = (-\\infty, \\infty)$$
$$Range(f) = [${q.a}, \\infty)$$`;

    updatePreview(el.ans1, previewContent1, el.preview1);
    updatePreview(el.ans2, previewContent2, el.preview2);
    updateMathPreview();
    updateInputStatus();
  }
});
