// js/equations-quiz.js
document.addEventListener("DOMContentLoaded", function () {
  // Initialize OpenAI service with saved model (no API key in browser)
  const savedModel = localStorage.getItem("gpt_model") || "gpt-4o-mini";
  if (window.openAIService?.initialize) {
    window.openAIService.initialize(savedModel);
  }

  const elements = {
    checkButton: document.getElementById("check-answer"),
    showSolutionButton: document.getElementById("show-solution"),
    showStepsButton: document.getElementById("show-steps"),
    clearButton: document.getElementById("clear-all"),
    showHintsButton: document.getElementById("show-hints"),
    newQuestionButton: document.getElementById("new-question"),
    feedbackDiv: document.getElementById("feedback"),
    solutionDiv: document.getElementById("solution"),
    stepByStepDiv: document.getElementById("step-by-step"),
    validationEquation1: document.getElementById("validation-equation1"),
    validationEquation2: document.getElementById("validation-equation2"),
    reasoningInput: document.getElementById("reasoning-input"),
    reasoningFeedback: document.getElementById("reasoning-feedback"),
    hint: document.getElementById("hint"),
    examples: document.getElementById("examples"),
    mathPreview: document.getElementById("math-preview-content"),
    aiFeedbackEnhanced: document.getElementById("ai-feedback-enhanced"),
    aiFeedbackContentEnhanced: document.getElementById(
      "ai-feedback-content-enhanced"
    ),
    questionText: document.getElementById("question-text"),
    stepsContent: document.getElementById("steps-content"),
    solutionContent: document.getElementById("solution-content"),
    equation1Input: document.getElementById("equation1"),
    equation2Input: document.getElementById("equation2"),
    latexValidation: document.getElementById("latex-validation"),
    equation1StatusIcon: document.getElementById("equation1-status-icon"),
    equation2StatusIcon: document.getElementById("equation2-status-icon"),
    reasoningStatusIcon: document.getElementById("reasoning-status-icon"),
    latexStatusIcon: document.getElementById("latex-status-icon"),
  };

  let currentExample = {
    eq1: { a: 2, b: 3, c: 5, string: "2x+3y=5" },
    eq2: { a: 2, b: 3, c: 7, string: "2x+3y=7" },
    question:
      "Give two equations in the form ax+by=c such that when you try to solve them simultaneously there are no solutions",
    topic: "equations",
  };

  let hintsShown = false;
  let mathjaxTimeout;
  let questionVariantCounter = 0;
  let questionOpenedAt = Date.now();
  let currentQuestionId = "";

  // --- Helpers ---
  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min; // inclusive
  }

  function formatEquation(a, b, c) {
    let eq = "";
    // x term
    if (a === 1) eq += "x";
    else if (a === -1) eq += "-x";
    else eq += a + "x";
    // y term
    if (b === 1) eq += "+y";
    else if (b === -1) eq += "-y";
    else if (b > 0) eq += "+" + b + "y";
    else eq += b + "y";
    // rhs
    eq += "=" + c;
    return eq;
  }

  // Generate parallel lines with same (a,b) but different c
  function generateRandomParallelEquations() {
    let a1, b1;
    // avoid zero slopes/degenerate
    do {
      a1 = randInt(-4, 4);
      b1 = randInt(-4, 4);
    } while (a1 === 0 || b1 === 0);

    const a2 = a1;
    const b2 = b1;

    // choose distinct constants; with equal a,b this guarantees "no solution"
    const c1 = randInt(-7, 7);
    let c2;
    do {
      c2 = randInt(-7, 7);
    } while (c2 === c1);

    return {
      eq1: { a: a1, b: b1, c: c1, string: formatEquation(a1, b1, c1) },
      eq2: { a: a2, b: b2, c: c2, string: formatEquation(a2, b2, c2) },
    };
  }

  function generateNewExample() {
    const pair = generateRandomParallelEquations();
    currentExample = {
      ...pair,
      question:
        "Give two equations in the form ax+by=c such that when you try to solve them simultaneously there are no solutions",
      topic: "equations",
    };
    questionVariantCounter += 1;
    currentQuestionId = `equations-nosolution-${questionVariantCounter}`;
    questionOpenedAt = Date.now();
    updateExampleDisplay();
    clearAll();
  }

  function updateExampleDisplay() {
    elements.questionText.innerHTML = `Give two equations in the form \\(ax+by=c\\) such that when you try to solve them simultaneously there are no solutions.`;
    if (window.MathJax) {
      MathJax.typesetPromise([elements.questionText]).catch(console.error);
    }
  }

  // --- Validation & UI state ---
  function isValidEquation(eq) {
    const parts = eq.split("=");
    if (parts.length !== 2) return false;
    const left = parts[0].toLowerCase();
    // bare minimum: contains x and y, and RHS is numeric
    const rhsOk = !isNaN(parseFloat(parts[1]));
    return left.includes("x") && left.includes("y") && rhsOk;
  }

  function validateEquation1Input() {
    const t = elements.equation1Input.value.trim();
    const ok = t.length > 0 && isValidEquation(t);
    elements.validationEquation1.textContent =
      !ok && t.length > 0
        ? "Equation 1 is not in the correct form (ax+by=c)"
        : "";
    updateEquation1Status(ok);
    return ok;
  }

  function validateEquation2Input() {
    const t = elements.equation2Input.value.trim();
    const ok = t.length > 0 && isValidEquation(t);
    elements.validationEquation2.textContent =
      !ok && t.length > 0
        ? "Equation 2 is not in the correct form (ax+by=c)"
        : "";
    updateEquation2Status(ok);
    return ok;
  }

  function validateReasoningInput() {
    const t = elements.reasoningInput.value.trim();
    const ok = t.length > 0;
    updateReasoningStatus(ok);
    return ok;
  }

  function updateEquation1Status(ok) {
    elements.equation1StatusIcon.textContent = ok ? "✓" : "✗";
    elements.equation1StatusIcon.className = ok
      ? "status-check"
      : "status-cross";
  }
  function updateEquation2Status(ok) {
    elements.equation2StatusIcon.textContent = ok ? "✓" : "✗";
    elements.equation2StatusIcon.className = ok
      ? "status-check"
      : "status-cross";
  }
  function updateReasoningStatus(ok) {
    elements.reasoningStatusIcon.textContent = ok ? "✓" : "✗";
    elements.reasoningStatusIcon.className = ok
      ? "status-check"
      : "status-cross";
  }
  function updateLatexStatus(ok) {
    elements.latexStatusIcon.textContent = ok ? "✓" : "✗";
    elements.latexStatusIcon.className = ok ? "status-check" : "status-cross";
  }

  function updateCheckAnswerButton() {
    const v1 = validateEquation1Input();
    const v2 = validateEquation2Input();
    const vr = validateReasoningInput();
    elements.checkButton.disabled = !(v1 && v2 && vr);
  }

  // --- Parsing & checks ---
  function parseEquation(eq) {
    const parts = eq.split("=");
    const left = parts[0].replace(/\s/g, "");
    const right = parseFloat(parts[1]);

    const xMatch = left.match(/([-+]?\d*)x/);
    const yMatch = left.match(/([-+]?\d*)y/);

    let a = 1,
      b = 1;
    if (xMatch) {
      if (xMatch[1] === "" || xMatch[1] === "+") a = 1;
      else if (xMatch[1] === "-") a = -1;
      else a = parseFloat(xMatch[1]);
    }
    if (yMatch) {
      if (yMatch[1] === "" || yMatch[1] === "+") b = 1;
      else if (yMatch[1] === "-") b = -1;
      else b = parseFloat(yMatch[1]);
    }
    return { a, b, c: right };
  }

  function checkNoSolution(eq1, eq2) {
    const ratioA = eq1.a / eq2.a;
    const ratioB = eq1.b / eq2.b;
    const ratioC = eq1.c / eq2.c;
    const eps = 1e-4;
    return Math.abs(ratioA - ratioB) < eps && Math.abs(ratioA - ratioC) > eps;
  }

  function checkSameLine(eq1, eq2) {
    const ratioA = eq1.a / eq2.a;
    const ratioB = eq1.b / eq2.b;
    const ratioC = eq1.c / eq2.c;
    const eps = 1e-4;
    return Math.abs(ratioA - ratioB) < eps && Math.abs(ratioA - ratioC) < eps;
  }

  // --- LaTeX preview ---
  function updateMathPreview() {
    const text = elements.reasoningInput.value;
    if (text.trim() === "") {
      elements.mathPreview.innerHTML =
        "Your mathematical notation will appear here as you type...";
      elements.latexValidation.classList.add("hidden");
      updateLatexStatus(true);
      return;
    }

    const validation = window.MathUtils.validateLatexSyntax(text);
    updateLatexStatus(validation.isValid);

    if (!validation.isValid) {
      elements.latexValidation.classList.remove("hidden");
      elements.latexValidation.className = "latex-validation latex-invalid";
      elements.latexValidation.innerHTML = `<strong>LaTeX Syntax Issues:</strong><ul>${validation.errors
        .map((e) => `<li>${e}</li>`)
        .join("")}</ul>`;
    } else {
      elements.latexValidation.classList.add("hidden");
    }

    const previewHtml = text
      .replace(/\$\$(.*?)\$\$/gs, '<div class="math-display">\\[$1\\]</div>')
      .replace(/\$(.*?)\$/gs, '<span class="math-inline">\\($1\\)</span>')
      .replace(/\n/g, "<br>");

    elements.mathPreview.innerHTML = previewHtml;

    if (mathjaxTimeout) clearTimeout(mathjaxTimeout);
    mathjaxTimeout = setTimeout(() => {
      if (window.MathJax) {
        MathJax.typesetPromise([elements.mathPreview]).catch(() => {
          elements.mathPreview.innerHTML = `<div style="color:#dc3545;"><strong>Math Rendering Error:</strong> Check for unmatched $, {, or } symbols.</div>
             <div style="margin-top:10px;font-family:monospace;white-space:pre-wrap;">${text}</div>`;
        });
      }
    }, 500);
  }

  // --- Solutions ---
  function updateSolutionSteps() {
    const eq1 = currentExample.eq1;
    const eq2 = currentExample.eq2;

    elements.stepsContent.innerHTML = `
      <div class="step">
        <div class="step-title">Step 1: Understanding the Problem</div>
        <p>We need two equations in the form \\(ax + by = c\\) that have no solution when solved simultaneously. This happens when the lines are parallel and distinct.</p>
      </div>
      <div class="step">
        <div class="step-title">Step 2: Conditions for No Solution</div>
        <p>For \\(a_1x + b_1y = c_1\\) and \\(a_2x + b_2y = c_2\\):</p>
        <ul>
          <li>Parallel if \\(\\frac{a_1}{a_2} = \\frac{b_1}{b_2}\\)</li>
          <li>No solution if \\(\\frac{a_1}{a_2} = \\frac{b_1}{b_2} \\neq \\frac{c_1}{c_2}\\)</li>
        </ul>
      </div>
      <div class="step">
        <div class="step-title">Step 3: Example Equations</div>
        <p>Use: \\(${eq1.string}\\) and \\(${eq2.string}\\)</p>
        <p>Here, \\(a_1=${eq1.a}, b_1=${eq1.b}, c_1=${eq1.c}\\) and \\(a_2=${
      eq2.a
    }, b_2=${eq2.b}, c_2=${eq2.c}\\).</p>
      </div>
      <div class="step">
        <div class="step-title">Step 4: Verify Ratios</div>
        <p>\\(\\frac{a_1}{a_2} = ${(eq1.a / eq2.a).toFixed(
          2
        )}\\), \\(\\frac{b_1}{b_2} = ${(eq1.b / eq2.b).toFixed(2)}\\)</p>
        <p>\\(\\frac{c_1}{c_2} = ${(eq1.c / eq2.c).toFixed(2)}\\)</p>
        <p>Since the first two are equal but differ from the third, there is no solution.</p>
      </div>
    `;
    if (window.MathJax)
      MathJax.typesetPromise([elements.stepsContent]).catch(console.error);
  }

  function updateCompleteSolution() {
    const eq1 = currentExample.eq1;
    const eq2 = currentExample.eq2;

    elements.solutionContent.innerHTML = `
      <p>Example of two equations with no solution:</p>
      <p>\\(${eq1.string}\\) &nbsp;&nbsp; (1)</p>
      <p>\\(${eq2.string}\\) &nbsp;&nbsp; (2)</p>
      <p>Solving yields a contradiction (e.g., subtracting gives \\(0 = ${
        eq2.c - eq1.c
      }\\)), so no solution exists.</p>
      <p>They are parallel (same coefficients), but constants differ.</p>
    `;
    if (window.MathJax)
      MathJax.typesetPromise([elements.solutionContent]).catch(console.error);
  }

  // --- Events ---
  elements.showHintsButton.addEventListener("click", function () {
    elements.hint.classList.remove("hidden");
    elements.examples.classList.remove("hidden");
    hintsShown = true;
    elements.showHintsButton.style.display = "none";
    if (window.MathJax)
      MathJax.typesetPromise([elements.hint, elements.examples]).catch(
        console.error
      );
  });

  // FIX: call the defined function
  elements.newQuestionButton.addEventListener("click", generateNewExample);

  elements.checkButton.addEventListener("click", async function () {
    const eq1Text = elements.equation1Input.value.trim();
    const eq2Text = elements.equation2Input.value.trim();
    const reasoningText = elements.reasoningInput.value.trim();
    const submittedAt = Date.now();

    const v1 = validateEquation1Input();
    const v2 = validateEquation2Input();
    const vr = validateReasoningInput();
    if (!(v1 && v2 && vr)) {
      if (!v1 && eq1Text.length > 0)
        elements.validationEquation1.textContent =
          "Please fix Equation 1 format";
      if (!v2 && eq2Text.length > 0)
        elements.validationEquation2.textContent =
          "Please fix Equation 2 format";
      if (!vr)
        elements.reasoningFeedback.textContent =
          "Please explain your reasoning first.";
      return;
    }

    const parsed1 = parseEquation(eq1Text);
    const parsed2 = parseEquation(eq2Text);
    const hasNoSolution = checkNoSolution(parsed1, parsed2);
    const isSameLine = checkSameLine(parsed1, parsed2);
    const isCorrect = hasNoSolution && !isSameLine;

    elements.aiFeedbackContentEnhanced.innerHTML =
      "<p>Generating AI feedback...</p>";
    elements.aiFeedbackEnhanced.classList.remove("hidden");
    let aiFeedback = null;
    try {
      if (!window.openAIService?.generateFeedback) {
        throw new Error("AI feedback service is unavailable right now.");
      }

      const questionData = {
        question: currentExample.question,
        correctAnswer:
          "Two parallel lines with equal coefficients but different constants.",
        equations: [eq1Text, eq2Text],
        topic: "equations",
      };

      const userAnswer = `Equation 1: ${eq1Text}, Equation 2: ${eq2Text}`;

      const ai = await window.openAIService.generateFeedback(
        questionData,
        userAnswer,
        reasoningText,
        isCorrect
      );
      aiFeedback = ai;

      elements.aiFeedbackContentEnhanced.innerHTML = window.AIRender
        ? window.AIRender.renderCard(ai)
        : typeof ai === "object"
        ? JSON.stringify(ai)
        : ai;

      if (window.MathJax) {
        MathJax.typesetPromise([elements.aiFeedbackContentEnhanced]).catch(
          console.error
        );
      }
    } catch (error) {
      aiFeedback = {
        summary:
          error?.message || "Unable to generate AI feedback right now.",
      };
      elements.aiFeedbackContentEnhanced.innerHTML = `<p style="color:#dc3545;"><strong>Error:</strong> ${error?.message || "AI feedback unavailable."}</p>`;
      if (window.MathJax) {
        MathJax.typesetPromise([elements.aiFeedbackContentEnhanced]).catch(
          console.error
        );
      }
    }

    elements.feedbackDiv.classList.remove("hidden");
    if (isCorrect) {
      elements.feedbackDiv.className = "feedback correct";
      elements.feedbackDiv.textContent =
        "✓ Correct! Your equations have no solution. Well done.";
    } else if (isSameLine) {
      elements.feedbackDiv.className = "feedback incorrect";
      elements.feedbackDiv.textContent =
        "✗ Your equations are the same line (infinitely many solutions).";
    } else {
      elements.feedbackDiv.className = "feedback incorrect";
      elements.feedbackDiv.textContent =
        "✗ Your equations have a solution. Make the coefficients proportional but change the constant.";
    }

    saveQuizSubmission({
      question: currentExample.question,
      course: "linear-algebra",
      questionId: currentQuestionId || "equations-nosolution-0",
      timeOpen: questionOpenedAt,
      timeSubmitted: submittedAt,
      userAnswer: {
        equation1: eq1Text || "(blank)",
        equation2: eq2Text || "(blank)",
      },
      reasoningSteps: reasoningText,
      aiFeedback,
      correctness: isCorrect ? "correct" : "incorrect",
      metadata: {
        questionIndex: questionVariantCounter,
        parsedEquations: { eq1: parsed1, eq2: parsed2 },
        noSolution: isCorrect,
        sameLine: isSameLine,
      },
    });
  });

  elements.showSolutionButton.addEventListener("click", function () {
    elements.solutionDiv.classList.remove("hidden");
    elements.stepByStepDiv.classList.add("hidden");
    updateCompleteSolution();

    if (!hintsShown) {
      elements.hint.classList.remove("hidden");
      elements.examples.classList.remove("hidden");
      hintsShown = true;
      elements.showHintsButton.style.display = "none";
    }

    // Auto-fill with current example
    elements.equation1Input.value = currentExample.eq1.string;
    elements.equation2Input.value = currentExample.eq2.string;
    updateCheckAnswerButton();

    elements.feedbackDiv.classList.remove("hidden");
    elements.feedbackDiv.className = "feedback correct";
    elements.feedbackDiv.textContent =
      "✓ Correct! Your equations have no solution. Well done.";
  });

  elements.showStepsButton.addEventListener("click", function () {
    elements.stepByStepDiv.classList.remove("hidden");
    elements.solutionDiv.classList.add("hidden");
    updateSolutionSteps();

    if (!hintsShown) {
      elements.hint.classList.remove("hidden");
      elements.examples.classList.remove("hidden");
      hintsShown = true;
      elements.showHintsButton.style.display = "none";
    }
  });

  function clearAll() {
    elements.equation1Input.value = "";
    elements.equation2Input.value = "";
    elements.reasoningInput.value = "";

    elements.feedbackDiv.classList.add("hidden");
    elements.solutionDiv.classList.add("hidden");
    elements.stepByStepDiv.classList.add("hidden");
    elements.aiFeedbackEnhanced.classList.add("hidden");
    elements.latexValidation.classList.add("hidden");

    elements.hint.classList.add("hidden");
    elements.examples.classList.add("hidden");
    elements.showHintsButton.style.display = "block";
    hintsShown = false;

    elements.validationEquation1.textContent = "";
    elements.validationEquation2.textContent = "";

    updateCheckAnswerButton();
    updateMathPreview();
  }

  function saveQuizSubmission(payload) {
    if (!window.SubmissionClient?.save) return;
    window.SubmissionClient
      .save(payload)
      .then((res) => {
        if (res?.error) console.warn("Submission save error:", res.error);
      })
      .catch((err) => console.warn("Submission save failed", err));
  }

  elements.clearButton.addEventListener("click", clearAll);

  elements.equation1Input.addEventListener("input", updateCheckAnswerButton);
  elements.equation2Input.addEventListener("input", updateCheckAnswerButton);
  elements.reasoningInput.addEventListener("input", function () {
    updateCheckAnswerButton();
    updateMathPreview();
  });

  // Init
  generateNewExample();
  updateCheckAnswerButton();
  updateMathPreview();
});
