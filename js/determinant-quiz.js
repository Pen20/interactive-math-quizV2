// js/derivatives-quiz.js
document.addEventListener("DOMContentLoaded", () => {
  /* =========================
   * DOM ELEMENTS
   * ========================= */
  const userAnswerInput = document.getElementById("user-answer");
  const validationAnswer = document.getElementById("validation-answer");

  const reasoningInput = document.getElementById("reasoning-input");
  const mathPreviewContent = document.getElementById("math-preview-content");
  const latexValidation = document.getElementById("latex-validation");

  const checkAnswerBtn = document.getElementById("check-answer");
  const showSolutionBtn = document.getElementById("show-solution");
  const showStepsBtn = document.getElementById("show-steps");
  const clearAllBtn = document.getElementById("clear-all");
  const newQuestionBtn = document.getElementById("new-question");
  const showHintsBtn = document.getElementById("show-hints");

  const answerStatus = document.getElementById("answer-status-icon");
  const reasoningStatus = document.getElementById("reasoning-status-icon");
  const latexStatus = document.getElementById("latex-status-icon");

  const matrixDisplay = document.getElementById("matrix-display");
  const questionText = document.getElementById("question-text");

  const feedbackArea = document.getElementById("feedback");
  const stepByStepArea = document.getElementById("step-by-step");
  const solutionArea = document.getElementById("solution");
  const stepsContent = document.getElementById("steps-content");
  const solutionContent = document.getElementById("solution-content");

  const aiFeedbackArea = document.getElementById("ai-feedback-enhanced");
  const aiFeedbackContent = document.getElementById(
    "ai-feedback-content-enhanced"
  );

  const hintArea = document.getElementById("hint");
  const examplesArea = document.getElementById("examples");

  /* =========================
   * DATA
   * ========================= */
  let currentQuestion = {
    matrix: [[2, 4, 3], [-3, 0, -5], ["k", 4, 3]],
    answer: "k < 2 or k > 2",
    excludedValues: [2],
    steps: [
      "Calculate the determinant using cofactor expansion",
      "Set determinant equal to zero and solve for k",
      "The answer is all k except the value(s) found in step 2",
    ],
  };
  let questionVariantIndex = 0;
  let questionOpenedAt = Date.now();

  /* =========================
   * INIT
   * ========================= */
  initQuiz();

  function initQuiz() {
    updateQuestionDisplay();
    setupEventListeners();
    updateMathPreview();
    updateInputStatus();
  }

  function updateQuestionDisplay() {
    const m = currentQuestion.matrix;
    matrixDisplay.innerHTML = `\\[ \\begin{bmatrix} ${m[0].join(" & ")} \\\\ ${m[1].join(" & ")} \\\\ ${m[2].join(" & ")} \\end{bmatrix} \\]`;
    if (window.MathJax)
      MathJax.typesetPromise([matrixDisplay, questionText]);
  }

  /* =========================
   * EVENT LISTENERS
   * ========================= */
  function setupEventListeners() {
    userAnswerInput.addEventListener("input", updateInputStatus);

    reasoningInput.addEventListener("input", () => {
      updateMathPreview();
      updateInputStatus();
    });

    checkAnswerBtn.addEventListener("click", checkAnswers);
    showSolutionBtn.addEventListener("click", showSolution);
    showStepsBtn.addEventListener("click", showSteps);
    clearAllBtn.addEventListener("click", clearAll);
    newQuestionBtn.addEventListener("click", generateNewQuestion);
    showHintsBtn.addEventListener("click", toggleHints);
  }



  /* =========================
   * REASONING PREVIEW + VALIDATION
   * ========================= */
  function safeValidateLatex(text) {
    // Use global MathUtils if available; otherwise, a lightweight fallback
    if (
      window.MathUtils &&
      typeof window.MathUtils.validateLatexSyntax === "function"
    ) {
      return window.MathUtils.validateLatexSyntax(text);
    }
    // Fallback: check balanced braces and dollar pairs
    const bracesBalanced =
      (text.match(/{/g) || []).length === (text.match(/}/g) || []).length;
    const dollars = (text.match(/\$/g) || []).length;
    const dollarsBalanced = dollars % 2 === 0;
    const result = { isValid: bracesBalanced && dollarsBalanced, errors: [] };
    if (!bracesBalanced) result.errors.push("unbalanced braces");
    if (!dollarsBalanced) result.errors.push("unbalanced $ pairs");
    return result;
  }

  function updateMathPreview() {
    const value = (reasoningInput.value || "").trim();

    if (value === "") {
      mathPreviewContent.innerHTML =
        "Your mathematical notation will appear here as you type...";
      latexValidation.classList.add("hidden");
      updateLatexStatus(false);
      return;
    }

    const check = safeValidateLatex(value);

    if (check.isValid) {
      latexValidation.innerHTML =
        '<span class="latex-valid">✓ Valid LaTeX syntax</span>';
      latexValidation.classList.remove("hidden");
      updateLatexStatus(true);

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
      updateLatexStatus(false);
      mathPreviewContent.innerHTML =
        "Your mathematical notation will appear here as you type...";
    }
  }

  /* =========================
   * STATUS + ENABLE BUTTON
   * ========================= */
  function updateInputStatus() {
    const ansProvided = (userAnswerInput.value || "").trim() !== "";
    const reasonProvided = (reasoningInput.value || "").trim() !== "";

    updateStatusIcon(answerStatus, ansProvided);
    updateStatusIcon(reasoningStatus, reasonProvided);

    // Button enabled only when both provided and LaTeX valid
    const latexOk = latexStatus.classList.contains("status-check");
    checkAnswerBtn.disabled = !(
      ansProvided &&
      reasonProvided &&
      latexOk
    );
  }

  function updateLatexStatus(isValid) {
    updateStatusIcon(latexStatus, isValid);
  }

  function updateStatusIcon(el, good) {
    if (!el) return;
    if (good) {
      el.textContent = "✓";
      el.className = "status-check";
    } else {
      el.textContent = "✗";
      el.className = "status-cross";
    }
  }

  /* =========================
   * CHECK ANSWERS
   * ========================= */
  function normalizeAnswer(ans) {
    return (ans || "")
      .replace(/\s+/g, "")
      .replace(/\\cdot/g, "")
      .replace(/\*/g, "")
      .replace(/\\left|\\right/g, "")
      .toLowerCase();
  }

  function checkAnswers() {
    const userAnswer = (userAnswerInput.value || "").trim();
    const reasoning = (reasoningInput.value || "").trim();

    const isCorrect = normalizeAnswer(userAnswer) === normalizeAnswer(currentQuestion.answer);

    validationAnswer.textContent = isCorrect
      ? "✓ Correct!"
      : "✗ Incorrect. Try again.";
    validationAnswer.style.color = isCorrect ? "#28a745" : "#dc3545";

    feedbackArea.textContent = isCorrect
      ? "Great job! Your answer is correct."
      : "Not quite right. Check the hints or solution for help.";
    feedbackArea.className = isCorrect
      ? "feedback correct"
      : "feedback incorrect";
    feedbackArea.classList.remove("hidden");

    generateAIFeedback(isCorrect, reasoning, userAnswer).then((aiFeedback) => {
      saveQuizSubmission({
        question: "Find values of k for which the determinant is non-zero",
        course: "linear-algebra",
        questionId: `determinant-${questionVariantIndex}`,
        timeOpen: questionOpenedAt,
        timeSubmitted: Date.now(),
        userAnswer: userAnswer || "(blank)",
        reasoningSteps: reasoning,
        aiFeedback,
        correctness: isCorrect ? "correct" : "incorrect",
        metadata: {
          questionIndex: questionVariantIndex,
          matrix: currentQuestion.matrix,
          excludedValues: currentQuestion.excludedValues,
        },
      });
    });
  }

  /* =========================
   * AI FEEDBACK (CARD STYLE)
   * ========================= */
  async function generateAIFeedback(isCorrect, reasoning, userAnswer) {
    aiFeedbackArea.classList.remove("hidden");
    let capturedFeedback = null;

    try {
      const m = currentQuestion.matrix;
      const matrixStr = `\\begin{bmatrix} ${m[0].join(" & ")} \\\\ ${m[1].join(" & ")} \\\\ ${m[2].join(" & ")} \\end{bmatrix}`;
      
      const questionData = {
        question: `Find values of k for which the determinant of ${matrixStr} is non-zero`,
        parameters: {
          type: "determinant",
          matrix: currentQuestion.matrix,
        },
        correctAnswer: currentQuestion.answer,
      };

      let feedbackObj = null;

      if (
        window.openAIService &&
        typeof window.openAIService.generateFeedback === "function"
      ) {
        feedbackObj = await window.openAIService.generateFeedback(
          questionData,
          userAnswer,
          reasoning,
          isCorrect
        );
      }

      // If ai-render.js exists and has a renderer, use it; else render locally
      if (
        feedbackObj &&
        window.AIRender &&
        typeof window.AIRender.renderCard === "function"
      ) {
        aiFeedbackContent.innerHTML = window.AIRender.renderCard(feedbackObj);
        capturedFeedback = feedbackObj;
      } else {
        // Build a minimal feedback object if the service isn't available
        const fallback =
          feedbackObj || buildLocalFeedback(isCorrect, reasoning);
        aiFeedbackContent.innerHTML = renderAICardLikeScreenshot(fallback);
        capturedFeedback = fallback;
      }

      if (window.MathJax) MathJax.typesetPromise([aiFeedbackContent]);
    } catch (err) {
      console.error("Error generating AI feedback:", err);
      const errorFeedback = buildLocalFeedback(isCorrect, reasoning, true);
      aiFeedbackContent.innerHTML = renderAICardLikeScreenshot(errorFeedback);
      capturedFeedback = errorFeedback;
    }
    return capturedFeedback;
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

  function buildLocalFeedback(isCorrect, reasoning, errored = false) {
    const correctness = isCorrect ? "correct" : "incorrect";
    const baseSummary = isCorrect
      ? "Correct! You properly found when the determinant is non-zero."
      : "Not quite. Make sure to calculate the determinant, set it to zero, and exclude those k values.";

    const summary = errored
      ? "AI service unavailable right now. Here's quick feedback based on your inputs."
      : baseSummary;

    return {
      summary,
      correctness,
      strengths: isCorrect
        ? ["Correctly computed determinant", "Properly identified excluded values"]
        : [],
      issues: isCorrect
        ? []
        : [
            "Determinant calculation may be incorrect",
            "Check solution to det = 0",
          ],
      next_steps: isCorrect
        ? [
            "Practice with larger matrices",
            "Review matrix properties",
          ]
        : [
            "Review cofactor expansion method",
            "Double-check your algebra",
          ],
      tags: ["Determinants", "Linear Algebra", "Matrix Properties"],
    };
  }

  function renderAICardLikeScreenshot(fx) {
    const ok = (fx.correctness || "").toLowerCase() === "correct";
    const pillClass = ok ? "aifx-pill aifx-ok" : "aifx-pill aifx-bad";
    const pillLabel = ok ? "Correct" : "Needs review";

    const strengths =
      (fx.strengths || []).map((s) => `<li>${escapeHTML(s)}</li>`).join("") ||
      "—";
    const issues =
      (fx.issues || []).map((s) => `<li>${escapeHTML(s)}</li>`).join("") || "—";
    const steps =
      (fx.next_steps || []).map((s) => `<li>${escapeHTML(s)}</li>`).join("") ||
      "—";
    const badges = (fx.tags || [])
      .map((t) => `<span class="aifx-badge">${escapeHTML(t)}</span>`)
      .join("");

    return `
      <div class="aifx-box">
        <div class="aifx-head">
          <div class="aifx-title">AI Feedback</div>
          <div class="${pillClass}">${pillLabel}</div>
        </div>
        <div class="aifx-body">
          <p>${escapeHTML(fx.summary || "")}</p>

          <div class="aifx-split">
            <div class="aifx-col">
              <h5>Strengths</h5>
              <ul>${strengths}</ul>
            </div>
            <div class="aifx-col">
              <h5>Issues</h5>
              <ul>${issues}</ul>
            </div>
          </div>

          <div class="aifx-col" style="margin-top:12px;">
            <h5>Next Steps</h5>
            <ul>${steps}</ul>
          </div>

          <div class="aifx-badges">${badges}</div>
        </div>
      </div>
    `;
  }

  function escapeHTML(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  /* =========================
   * SOLUTION / STEPS
   * ========================= */
  function showSolution() {
    const m = currentQuestion.matrix;
    const matrixStr = `\\begin{bmatrix} ${m[0].join(" & ")} \\\\ ${m[1].join(" & ")} \\\\ ${m[2].join(" & ")} \\end{bmatrix}`;
    solutionContent.innerHTML = `
      <div class="step">
        <div class="step-title">Solution</div>
        <p>Given matrix: \\[ ${matrixStr} \\]</p>
        <p>Determinant is non-zero when: \\( ${currentQuestion.answer} \\)</p>
        <p>This means k must avoid the value(s): ${currentQuestion.excludedValues.join(", ")}</p>
      </div>
    `;
    solutionArea.classList.remove("hidden");
    if (window.MathJax) MathJax.typesetPromise([solutionContent]);
  }

  function showSteps() {
    const m = currentQuestion.matrix;
    const matrixStr = `\\begin{bmatrix} ${m[0].join(" & ")} \\\\ ${m[1].join(" & ")} \\\\ ${m[2].join(" & ")} \\end{bmatrix}`;
    stepsContent.innerHTML = `
      <div class="step">
        <div class="step-title">Step-by-Step Solution</div>
        <p>Given matrix: \\[ ${matrixStr} \\]</p>
        <ol>${currentQuestion.steps
          .map((s) => `<li>${s}</li>`)
          .join("")}</ol>
        <p>Final answer: \\( ${currentQuestion.answer} \\)</p>
      </div>
    `;
    stepByStepArea.classList.remove("hidden");
    if (window.MathJax) MathJax.typesetPromise([stepsContent]);
  }

  /* =========================
   * UTIL BUTTONS
   * ========================= */
  function clearAll() {
    userAnswerInput.value = "";
    reasoningInput.value = "";

    validationAnswer.textContent = "";

    feedbackArea.classList.add("hidden");
    stepByStepArea.classList.add("hidden");
    solutionArea.classList.add("hidden");
    aiFeedbackArea.classList.add("hidden");
    hintArea.classList.add("hidden");
    if (examplesArea) examplesArea.classList.add("hidden");

    updateMathPreview();
    updateInputStatus();
  }

  function generateNewQuestion() {
    // Toggle between two preset matrices
    if (currentQuestion.excludedValues[0] === 2) {
      currentQuestion = {
        matrix: [[1, 3, 2], [0, -2, 4], ["k", 1, -1]],
        answer: "k < 3 or k > 3",
        excludedValues: [3],
        steps: [
          "Calculate the determinant using cofactor expansion",
          "Set determinant equal to zero and solve for k",
          "The answer is all k except k = 3",
        ],
      };
      questionVariantIndex = 1;
    } else {
      currentQuestion = {
        matrix: [[2, 4, 3], [-3, 0, -5], ["k", 4, 3]],
        answer: "k < 2 or k > 2",
        excludedValues: [2],
        steps: [
          "Calculate the determinant using cofactor expansion",
          "Set determinant equal to zero and solve for k",
          "The answer is all k except k = 2",
        ],
      };
      questionVariantIndex = 0;
    }

    questionOpenedAt = Date.now();
    updateQuestionDisplay();
    clearAll();
  }

  function toggleHints() {
    if (hintArea.classList.contains("hidden")) {
      hintArea.classList.remove("hidden");
      if (examplesArea) examplesArea.classList.add("hidden");
    } else {
      hintArea.classList.add("hidden");
    }
  }
});
