// Limit at a point: ((c x + b)(x - a)) / (x - a); evaluate lim_{x->a}
document.addEventListener("DOMContentLoaded", () => {
  // Init model for AI feedback
  const savedModel = localStorage.getItem("gpt_model") || "gpt-4o-mini";
  window.openAIService?.initialize(savedModel);

  // DOM
  const el = {
    functionDisplay: g("functionDisplay"),
    ans1: g("ans1"),
    feedback1: g("feedback1"),

    reasoningInput: g("reasoningInput"),
    reasoningPreview: g("reasoningPreview"),
    latexValidation: g("latex-validation"),

    ans1Icon: g("ans1-icon"),
    reasoningIcon: g("reasoning-icon"),
    latexIcon: g("latex-icon"),

    newQuestionBtn: g("newQuestionBtn"),
    hintBtn: g("hintBtn"),
    notationBtn: g("notationBtn"),
    clearBtn: g("clearBtn"),
    checkBtn: g("checkBtn"),
    showSolutionBtn: g("showSolutionBtn"),
    showStepsBtn: g("showStepsBtn"),

    hintContainer: g("hintContainer"),
    notationContainer: g("notationContainer"),
    aiFeedbackEnhanced: g("aiFeedbackEnhanced"),
    aiFeedbackContent: g("aiFeedbackContent"),

    stepByStep: g("stepByStep"),
    stepsContent: g("stepsContent"),
    solution: g("solution"),
    solutionContent: g("solutionContent"),
    scoreBanner: g("scoreBanner"),
  };

  // Helpers
  const mj = (s) => `\\(${s}\\)`;
  const mjBlock = (s) => `\\[${s}\\]`;
  const typeset = (node) =>
    window.MathJax?.typesetPromise([node]).catch(() => {});
  function g(id) {
    return document.getElementById(id);
  }
  function show(n) {
    n.classList.remove("hidden");
  }
  function hide(n) {
    n.classList.add("hidden");
  }
  function setIcon(span, ok) {
    span.textContent = ok ? "✓" : "✗";
    span.className = ok ? "status-check" : "status-cross";
  }

  // State
  const S = { a: 2, b: 1, c: 3, correct: null, latex: "" };

  // Random ints
  function rand(lo, hi) {
    return lo + Math.floor(Math.random() * (hi - lo + 1));
  }

  function genQuestion() {
    S.a = rand(-5, 6);
    S.c = rand(-5, 6);
    if (S.c === 0) S.c = 2;
    S.b = rand(-8, 8);

    S.correct = S.c * S.a + S.b; // (c a + b)
    S.latex = `\\lim_{x\\to ${S.a}} \\dfrac{(${S.c}x+${S.b})(x-${S.a})}{x-${S.a}}`;

    el.functionDisplay.innerHTML = mjBlock(S.latex);
    typeset(el.functionDisplay);

    // reset UI
    el.ans1.value = "";
    el.feedback1.textContent = "";
    hide(el.feedback1);
    el.reasoningInput.value = "";
    el.reasoningPreview.textContent = "Your reasoning will appear here…";
    hide(el.latexValidation);
    setIcon(el.ans1Icon, false);
    setIcon(el.reasoningIcon, false);
    setIcon(el.latexIcon, true);
    el.checkBtn.disabled = true;

    hide(el.hintContainer);
    hide(el.notationContainer);
    hide(el.aiFeedbackEnhanced);
    hide(el.scoreBanner);
    hide(el.stepByStep);
    hide(el.solution);
    el.aiFeedbackContent.innerHTML = "";
    el.stepsContent.innerHTML = "";
    el.solutionContent.innerHTML = "";
  }

  // Parse numeric/fraction string
  function parseAnswer(text) {
    const s = text.trim();
    if (!s) return null;
    const frac = s.match(/^\s*([+-]?\d+)\s*\/\s*([+-]?\d+)\s*$/);
    if (frac) {
      const num = parseInt(frac[1], 10);
      const den = parseInt(frac[2], 10);
      if (den === 0) return null;
      return num / den;
    }
    const val = Number(s);
    if (!Number.isFinite(val)) return null;
    return val;
  }

  function validate() {
    const a1 = !!el.ans1.value.trim();
    const r = !!el.reasoningInput.value.trim();
    setIcon(el.ans1Icon, a1);
    setIcon(el.reasoningIcon, r);
    el.checkBtn.disabled = !(a1 && r);
  }

  // Live LaTeX preview for reasoning
  let mjTimer;
  function updatePreview() {
    const text = el.reasoningInput.value;
    if (!text.trim()) {
      el.reasoningPreview.textContent = "Your reasoning will appear here…";
      hide(el.latexValidation);
      setIcon(el.latexIcon, true);
      return;
    }

    const validation = window.MathUtils?.validateLatexSyntax
      ? window.MathUtils.validateLatexSyntax(text)
      : { isValid: true, errors: [] };

    setIcon(el.latexIcon, validation.isValid);
    if (!validation.isValid) {
      show(el.latexValidation);
      el.latexValidation.className = "latex-validation latex-invalid";
      el.latexValidation.innerHTML = `<strong>LaTeX issues:</strong><ul>${validation.errors
        .map((e) => `<li>${e}</li>`)
        .join("")}</ul>`;
    } else {
      hide(el.latexValidation);
    }

    const html = text
      .replace(/\$\$(.*?)\$\$/gs, '<div class="math-display">\\[$1\\]</div>')
      .replace(/\$(.*?)\$/gs, '<span class="math-inline">\\($1\\)</span>')
      .replace(/\n/g, "<br>");
    el.reasoningPreview.innerHTML = html;

    if (mjTimer) clearTimeout(mjTimer);
    mjTimer = setTimeout(() => typeset(el.reasoningPreview), 220);
  }

  function check() {
    const userText = el.ans1.value.trim();
    const val = parseAnswer(userText);
    const ok = val !== null && Math.abs(val - S.correct) < 1e-9;

    el.feedback1.innerHTML = ok
      ? "✓ Correct. After canceling $(x-a)$, substitute $x=a$."
      : `✗ Not quite. Factor and cancel $(x-${S.a})$, then plug in $x=${S.a}$.`;
    el.feedback1.className = "feedback " + (ok ? "correct" : "incorrect");
    show(el.feedback1);

    el.scoreBanner.className = "feedback " + (ok ? "correct" : "incorrect");
    el.scoreBanner.textContent = ok
      ? "Great job! Your limit is correct."
      : "Some parts need revision. Open hints or steps.";
    show(el.scoreBanner);

    // Immediately generate AI feedback using user input + reasoning
    aiFeedback(ok);
  }

  function renderSteps() {
    const steps = [
      `Direct substitution: ${mj(
        `\\dfrac{(${S.c}${"x"}+${S.b})(x-${S.a})}{x-${S.a}}\\Bigg|_{x=${
          S.a
        }} = 0/0`
      )}`,
      `Factor & cancel (for $x\\ne ${S.a}$): ${mj(
        `\\dfrac{(${S.c}x+${S.b})(x-${S.a})}{x-${S.a}} = ${S.c}x+${S.b}`
      )}`,
      `Evaluate at $x=${S.a}$: ${mj(
        `${S.c}\\cdot ${S.a} + ${S.b} = ${S.correct}`
      )}`,
    ];
    el.stepsContent.innerHTML = `<p>${mjBlock(S.latex)}</p><ol>${steps
      .map((s) => `<li>${s}</li>`)
      .join("")}</ol>
       <p><strong>Final:</strong> ${mj(
         `\\lim_{x\\to ${S.a}}\\dfrac{(${S.c}x+${S.b})(x-${S.a})}{x-${S.a}}=${S.correct}`
       )}</p>`;
    show(el.stepByStep);
    typeset(el.stepsContent);
  }

  function renderSolution() {
    el.solutionContent.innerHTML = `<p>For $x\\ne ${S.a}$, ${mj(
      `\\dfrac{(${S.c}x+${S.b})(x-${S.a})}{x-${S.a}}`
    )} simplifies to
      ${mj(
        `${S.c}x+${S.b}`
      )}. Thus the limit equals the value of this linear function at $x=${S.a}$:
      ${mj(`${S.c}\\cdot ${S.a} + ${S.b} = ${S.correct}`)}.</p>
      <p><strong>Answer:</strong> ${mj(`${S.correct}`)}</p>`;
    show(el.solution);
    typeset(el.solutionContent);
  }

  async function aiFeedback(allCorrect) {
    const userAnswer = el.ans1.value.trim();
    const reasoning = el.reasoningInput.value.trim();

    const questionData = {
      question: "Evaluate the limit after simplifying.",
      latex: S.latex,
      parameters: { a: S.a, b: S.b, c: S.c },
      correctAnswer: { value: S.correct },
    };

    try {
      el.aiFeedbackContent.innerHTML = "<p>Generating AI feedback…</p>";
      show(el.aiFeedbackEnhanced);

      const obj = await window.openAIService.generateFeedback(
        questionData,
        { value: userAnswer },
        reasoning,
        allCorrect
      );

      el.aiFeedbackContent.innerHTML = window.AIRender.renderCard(obj);
      typeset(el.aiFeedbackContent);
    } catch (e) {
      el.aiFeedbackContent.innerHTML = `<p style="color:#dc3545;"><strong>Error:</strong> ${e.message}</p>
         <p>Check your OpenAI settings.</p>`;
      show(el.aiFeedbackEnhanced);
    }
  }

  function clearAll() {
    el.ans1.value = "";
    hide(el.feedback1);
    hide(el.aiFeedbackEnhanced);
    hide(el.scoreBanner);
    hide(el.stepByStep);
    hide(el.solution);
    hide(el.hintContainer);
    hide(el.notationContainer);

    el.reasoningInput.value = "";
    el.reasoningPreview.textContent = "Your reasoning will appear here…";
    hide(el.latexValidation);

    setIcon(el.ans1Icon, false);
    setIcon(el.reasoningIcon, false);
    setIcon(el.latexIcon, true);
    el.checkBtn.disabled = true;
  }

  // Events
  el.newQuestionBtn.addEventListener("click", genQuestion);
  el.hintBtn.addEventListener("click", () => {
    el.hintContainer.classList.toggle("hidden");
  });
  el.notationBtn.addEventListener("click", () => {
    el.notationContainer.classList.toggle("hidden");
    window.MathJax?.typesetPromise([el.notationContainer]);
  });
  el.clearBtn.addEventListener("click", clearAll);
  el.checkBtn.addEventListener("click", check);
  el.showStepsBtn.addEventListener("click", renderSteps);
  el.showSolutionBtn.addEventListener("click", renderSolution);

  el.ans1.addEventListener("input", validate);
  el.reasoningInput.addEventListener("input", () => {
    validate();
    updatePreview();
  });

  // Init
  genQuestion();
  validate();
  updatePreview();
});
