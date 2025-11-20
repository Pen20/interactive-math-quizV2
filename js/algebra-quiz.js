// js/algebra-quiz.js

(function () {
  // --- Robust LaTeX validator ---
  // Replaces any existing MathUtils.validateLatexSyntax to avoid false positives.
  const MathUtils = window.MathUtils || {};
  MathUtils.validateLatexSyntax = function (input) {
    const errors = [];
    const s = String(input ?? "");

    // 1) Count unescaped { and }
    // Uses negative lookbehind to ignore \{ and \}
    const openBraces = (s.match(/(?<!\\){/g) || []).length;
    const closeBraces = (s.match(/(?<!\\)}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push(
        `Unbalanced braces: found ${openBraces} “{” and ${closeBraces} “}”.`
      );
    }

    // 2) Dollar inline math ($...$) — ignore $$...$$ and escaped \$
    const noDisplayDollar = s.replace(/\$\$[\s\S]*?\$\$/g, "");
    const singleDollarCount = (noDisplayDollar.match(/(?<!\\)\$/g) || [])
      .length;
    if (singleDollarCount % 2 !== 0) {
      errors.push("Unbalanced $ delimiters.");
    }

    // 3) \[ \] display math balance
    const leftSq = (s.match(/(?<!\\)\\\[/g) || []).length;
    const rightSq = (s.match(/(?<!\\)\\\]/g) || []).length;
    if (leftSq !== rightSq) {
      errors.push("Unbalanced \\[ \\] delimiters.");
    }

    // 4) \( \) inline math balance
    const leftPar = (s.match(/(?<!\\)\\\(/g) || []).length;
    const rightPar = (s.match(/(?<!\\)\\\)/g) || []).length;
    if (leftPar !== rightPar) {
      errors.push("Unbalanced \\( \\) delimiters.");
    }

    // 5) \frac structure: each \frac must be \frac{...}{...}
    const fracAll = s.match(/\\frac/g) || [];
    const fracGood = s.match(/\\frac\{[^{}]+\}\{[^{}]+\}/g) || [];
    if (fracAll.length !== fracGood.length) {
      errors.push("Each \\frac must be like \\frac{numerator}{denominator}.");
    }

    return { isValid: errors.length === 0, errors };
  };
  window.MathUtils = MathUtils;
})();

document.addEventListener("DOMContentLoaded", function () {
  // Initialize OpenAI service with saved configuration (model only; key should be on server)
  const savedModel = localStorage.getItem("gpt_model") || "gpt-4o-mini";
  if (window.openAIService?.initialize) {
    window.openAIService.initialize(savedModel);
  }

  // DOM elements
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
    validationAnswer: document.getElementById("validation-answer"),

    reasoningInput: document.getElementById("reasoning-input"),
    reasoningFeedback: document.getElementById("reasoning-feedback"),

    hint: document.getElementById("hint"),
    examples: document.getElementById("examples"),

    questionText: document.getElementById("question-text"),
    stepsContent: document.getElementById("steps-content"),
    solutionContent: document.getElementById("solution-content"),
    userAnswerInput: document.getElementById("user-answer"),

    mathPreview: document.getElementById("math-preview-content"),
    latexValidation: document.getElementById("latex-validation"),
    aiFeedbackEnhanced: document.getElementById("ai-feedback-enhanced"),
    aiFeedbackContentEnhanced: document.getElementById(
      "ai-feedback-content-enhanced"
    ),

    answerStatusIcon: document.getElementById("answer-status-icon"),
    reasoningStatusIcon: document.getElementById("reasoning-status-icon"),
    latexStatusIcon: document.getElementById("latex-status-icon"),
  };

  let currentQuestion = {
    question: "",
    correctAnswer: "",
    parameters: {},
    topic: "algebra",
  };

  let hintsShown = false;
  let mathjaxTimeout;

  function badge(text, kind = "neutral") {
    const cls =
      kind === "good"
        ? "badge-good"
        : kind === "bad"
        ? "badge-bad"
        : kind === "warn"
        ? "badge-warn"
        : "badge";
    return `<span class="${cls}">${text}</span>`;
  }

  function list(items) {
    if (!items || !items.length) return "<em>—</em>";
    return `<ul class="ai-list">${items
      .map((i) => `<li>${i}</li>`)
      .join("")}</ul>`;
  }

  function renderAIFeedbackCard(data) {
    // data can be structured object or plain-text fallback
    if (!data || typeof data !== "object" || !data.summary) {
      const txt = typeof data === "string" ? data : "No feedback.";
      return `<div class="ai-card"><p>${txt}</p></div>`;
    }

    const tag =
      data.correctness === "correct"
        ? badge("Correct", "good")
        : data.correctness === "partially-correct"
        ? badge("Partially correct", "warn")
        : data.correctness === "incorrect"
        ? badge("Incorrect", "bad")
        : badge("Feedback");

    return `
  <div class="ai-card">
    <div class="ai-card-header">
      <span> AI Feedback</span>
      <span>${tag}</span>
    </div>
    <div class="ai-section">
      <p class="ai-summary">${data.summary}</p>
    </div>

    ${
      data.math_highlight
        ? `
    <div class="ai-section">
      <div class="ai-math">\\(${data.math_highlight.replace(
        /^\\\(|\\\)$/g,
        ""
      )}\\)</div>
    </div>`
        : ""
    }

    <div class="ai-grid">
      <div class="ai-col">
        <h4>Strengths</h4>
        ${list(data.strengths)}
      </div>
      <div class="ai-col">
        <h4>Issues</h4>
        ${list(data.issues)}
      </div>
    </div>

    <div class="ai-section">
      <h4>Next Steps</h4>
      ${list(data.next_steps)}
    </div>

    <div class="ai-section ai-tags">
      ${(data.key_concepts || [])
        .map((k) => `<span class="chip">${k}</span>`)
        .join("")}
    </div>
  </div>
  `;
  }

  // Question generation
  function generateNewQuestion() {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 20) - 10;
    const c = Math.floor(Math.random() * 20) + 1;

    const solution = (c - b) / a;

    currentQuestion = {
      question: `Solve for x: ${a}x ${b >= 0 ? "+" : ""}${b} = ${c}`,
      correctAnswer: solution.toString(),
      parameters: { a, b, c },
      topic: "algebra",
      // track when the question was presented to the user
      openedAt: Date.now(),
    };

    updateQuestionDisplay();
    clearAll();
  }

  function updateQuestionDisplay() {
    elements.questionText.innerHTML = currentQuestion.question;
    if (window.MathJax) {
      MathJax.typesetPromise([elements.questionText]).catch(console.error);
    }
  }

  // Validation helpers
  function validateUserInput() {
    const answerText = elements.userAnswerInput.value.trim();
    const isValid = answerText.length > 0;
    updateAnswerStatus(isValid);
    return isValid;
  }

  function validateReasoningInput() {
    const reasoningText = elements.reasoningInput.value.trim();
    const isValid = reasoningText.length > 0;
    updateReasoningStatus(isValid);
    return isValid;
  }

  function updateAnswerStatus(isValid) {
    elements.answerStatusIcon.textContent = isValid ? "✓" : "✗";
    elements.answerStatusIcon.className = isValid
      ? "status-check"
      : "status-cross";
  }

  function updateReasoningStatus(isValid) {
    elements.reasoningStatusIcon.textContent = isValid ? "✓" : "✗";
    elements.reasoningStatusIcon.className = isValid
      ? "status-check"
      : "status-cross";
  }

  function updateLatexStatus(isValid) {
    elements.latexStatusIcon.textContent = isValid ? "✓" : "✗";
    elements.latexStatusIcon.className = isValid
      ? "status-check"
      : "status-cross";
  }

  function updateCheckAnswerButton() {
    const answerValid = validateUserInput();
    const reasoningValid = validateReasoningInput();
    elements.checkButton.disabled = !(answerValid && reasoningValid);
  }

  // LaTeX preview and validation (fixed)
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
      elements.latexValidation.innerHTML = `
        <strong>LaTeX Syntax Issues:</strong>
        <ul>
          ${validation.errors.map((error) => `<li>${error}</li>`).join("")}
        </ul>
      `;
    } else {
      // Hide preemptively; if MathJax fails, we'll show a render error instead.
      elements.latexValidation.classList.add("hidden");
    }

    // Convert $...$ and $$...$$ into MathJax-friendly wrappers for preview only.
    // We keep \[ \] and \( \) as-is.
    let previewHtml = text
      .replace(/\$\$(.*?)\$\$/gs, '<div class="math-display">\\[$1\\]</div>')
      .replace(/\$(.*?)\$/gs, '<span class="math-inline">\\($1\\)</span>')
      .replace(/\n/g, "<br>");

    elements.mathPreview.innerHTML = previewHtml;

    if (mathjaxTimeout) clearTimeout(mathjaxTimeout);

    mathjaxTimeout = setTimeout(() => {
      if (!window.MathJax) return;

      MathJax.typesetPromise([elements.mathPreview])
        .then(() => {
          // If MathJax succeeds, consider it valid — suppress the warning box.
          elements.latexValidation.classList.add("hidden");
          updateLatexStatus(true);
        })
        .catch((err) => {
          console.log("MathJax typeset error:", err);
          elements.mathPreview.innerHTML = `
            <div style="color:#dc3545;">
              <strong>Math Rendering Error:</strong> Check for unmatched $, {, }.
            </div>
            <div style="margin-top:10px;font-family:monospace;white-space:pre-wrap;">${text}</div>
          `;
          // Keep any prior validation result (don’t force “invalid” here).
        });
    }, 500);
  }

  // Answer checking
  function checkUserAnswer(userAnswer) {
    let userValue;
    if (userAnswer.includes("/")) {
      const parts = userAnswer.split("/");
      userValue = parseFloat(parts[0]) / parseFloat(parts[1]);
    } else {
      userValue = parseFloat(userAnswer);
    }

    const correctValue = parseFloat(currentQuestion.correctAnswer);
    return Math.abs(userValue - correctValue) < 0.001;
  }

  // Step-by-step solution
  function updateSolutionSteps() {
    const { a, b, c } = currentQuestion.parameters;
    const solution = currentQuestion.correctAnswer;

    elements.stepsContent.innerHTML = `
      <div class="step">
        <div class="step-title">Step 1: Understand the Problem</div>
        <p>We need to solve the equation: $$${a}x ${
      b >= 0 ? "+" : ""
    }${b} = ${c}$$</p>
      </div>
      <div class="step">
        <div class="step-title">Step 2: Isolate the Variable Term</div>
        <p>Subtract ${b} from both sides:</p>
        <p>$$${a}x = ${c} ${b >= 0 ? "-" : "+"} ${Math.abs(b)}$$</p>
        <p>$$${a}x = ${c - b}$$</p>
      </div>
      <div class="step">
        <div class="step-title">Step 3: Solve for x</div>
        <p>Divide both sides by ${a}:</p>
        <p>$$x = \\frac{${c - b}}{${a}}$$</p>
        <p>$$x = ${solution}$$</p>
      </div>
    `;

    if (window.MathJax) {
      MathJax.typesetPromise([elements.stepsContent]).catch(console.error);
    }
  }

  function updateCompleteSolution() {
    const { a, b, c } = currentQuestion.parameters;
    const solution = currentQuestion.correctAnswer;

    elements.solutionContent.innerHTML = `
      <p><strong>Complete Solution:</strong></p>
      <p>Given equation: $$${a}x ${b >= 0 ? "+" : ""}${b} = ${c}$$</p>
      <p>Step 1: Subtract ${b} from both sides:</p>
      <p>$$${a}x = ${c} ${b >= 0 ? "-" : "+"} ${Math.abs(b)}$$</p>
      <p>$$${a}x = ${c - b}$$</p>
      <p>Step 2: Divide both sides by ${a}:</p>
      <p>$$x = \\frac{${c - b}}{${a}}$$</p>
      <p>$$x = ${solution}$$</p>
      <p><strong>Final Answer:</strong> $$x = ${solution}$$</p>
    `;

    if (window.MathJax) {
      MathJax.typesetPromise([elements.solutionContent]).catch(console.error);
    }
  }

  // Event listeners
  elements.showHintsButton.addEventListener("click", function () {
    elements.hint.classList.remove("hidden");
    elements.examples.classList.remove("hidden");
    hintsShown = true;
    elements.showHintsButton.style.display = "none";

    if (window.MathJax) {
      MathJax.typesetPromise([elements.hint, elements.examples]).catch(
        console.error
      );
    }
  });

  elements.newQuestionButton.addEventListener("click", generateNewQuestion);

  elements.checkButton.addEventListener("click", async function () {
    const userAnswer = elements.userAnswerInput.value.trim();

    if (!validateUserInput() || !validateReasoningInput()) {
      if (!validateUserInput()) {
        elements.validationAnswer.textContent =
          "Please enter your answer first.";
      }
      if (!validateReasoningInput()) {
        elements.reasoningFeedback.textContent =
          "Please explain your reasoning first.";
      }
      return;
    }

    const isCorrect = checkUserAnswer(userAnswer);

    try {
      elements.aiFeedbackContentEnhanced.innerHTML =
        "<p>Generating AI feedback...</p>";
      elements.aiFeedbackEnhanced.classList.remove("hidden");

      const aiFeedback = await window.openAIService.generateFeedback(
        currentQuestion,
        userAnswer,
        elements.reasoningInput.value,
        isCorrect
      );

      // --- parse if stringified JSON ---
      let parsedFeedback = aiFeedback;
      if (typeof aiFeedback === "string") {
        try {
          parsedFeedback = JSON.parse(aiFeedback);
        } catch {
          parsedFeedback = { summary: aiFeedback };
        }
      }

      // --- Clean display ---
      elements.aiFeedbackContentEnhanced.innerHTML =
        renderAIFeedbackCard(parsedFeedback);

      if (window.MathJax) {
        MathJax.typesetPromise([elements.aiFeedbackContentEnhanced]).catch(
          console.error
        );
      }
    } catch (error) {
      elements.aiFeedbackContentEnhanced.innerHTML = `
    <p style="color:#dc3545;"><strong>Error:</strong> ${error.message}</p>
  `;
    }

    // Prepare submission payload and send to server (fire-and-forget)
    try {
      const submittedAt = Date.now();
      const payload = {
        question: currentQuestion.question,
        course: currentQuestion.topic || currentQuestion.topic || 'unknown',
        questionId: currentQuestion.parameters ? JSON.stringify(currentQuestion.parameters) : null,
        timeOpen: currentQuestion.openedAt || null,
        timeSubmitted: submittedAt,
        userAnswer: elements.userAnswerInput.value.trim(),
        reasoningSteps: elements.reasoningInput.value.trim(),
        aiFeedback: parsedFeedback,
        correctness: isCorrect ? 'correct' : 'incorrect',
        metadata: { source: 'algebra-quiz' }
      };

      if (window.SubmissionClient?.save) {
        window.SubmissionClient.save(payload).then((r) => {
          // optional: log response for debugging
          if (r?.error) console.warn('Submission save error:', r);
        }).catch((e) => console.warn('Submission save failed', e));
      }
    } catch (e) {
      console.warn('Failed to prepare submission:', e);
    }

    elements.feedbackDiv.classList.remove("hidden");
    if (isCorrect) {
      elements.feedbackDiv.className = "feedback correct";
      elements.feedbackDiv.innerHTML = "✓ Correct answer, well done.";
    } else {
      elements.feedbackDiv.className = "feedback incorrect";
      elements.feedbackDiv.innerHTML =
        "✗ Incorrect answer. Please review the solution steps.";
    }
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

    elements.userAnswerInput.value = currentQuestion.correctAnswer;
    updateCheckAnswerButton();

    elements.feedbackDiv.classList.remove("hidden");
    elements.feedbackDiv.className = "feedback correct";
    elements.feedbackDiv.innerHTML = "✓ Correct answer, well done.";
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
    elements.userAnswerInput.value = "";
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
    elements.validationAnswer.textContent = "";
    updateCheckAnswerButton();
    updateMathPreview();
  }

  elements.clearButton.addEventListener("click", clearAll);

  // Input events
  elements.userAnswerInput.addEventListener("input", updateCheckAnswerButton);
  elements.reasoningInput.addEventListener("input", function () {
    updateCheckAnswerButton();
    updateMathPreview();
  });

  // Initialize
  generateNewQuestion();
  updateCheckAnswerButton();
  updateMathPreview();
});
