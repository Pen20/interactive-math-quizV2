// piecewise-continuity.js
// Handles question generation, validation, LaTeX preview, steps/solution, and AI feedback.

(function () {
  // Elements
  const ans1Sel = document.getElementById("ans1");
  const ans2Sel = document.getElementById("ans2");
  const fb1 = document.getElementById("feedback1");
  const fb2 = document.getElementById("feedback2");

  const reasoningInput = document.getElementById("reasoningInput");
  const reasoningPreview = document.getElementById("reasoningPreview");
  const latexValidation = document.getElementById("latex-validation");

  const functionDisplay = document.getElementById("functionDisplay");

  const ans1Icon = document.getElementById("ans1-icon");
  const ans2Icon = document.getElementById("ans2-icon");
  const reasoningIcon = document.getElementById("reasoning-icon");
  const latexIcon = document.getElementById("latex-icon");

  const checkBtn = document.getElementById("checkBtn");
  const showSolutionBtn = document.getElementById("showSolutionBtn");
  const showStepsBtn = document.getElementById("showStepsBtn");
  const clearBtn = document.getElementById("clearBtn");
  const newQuestionBtn = document.getElementById("newQuestionBtn");
  const hintBtn = document.getElementById("hintBtn");

  const hintContainer = document.getElementById("hintContainer");
  const scoreBanner = document.getElementById("scoreBanner");

  const aiBox = document.getElementById("aiFeedbackEnhanced");
  const aiContent = document.getElementById("aiFeedbackContent");

  const stepsWrap = document.getElementById("steps");
  const stepsContent = document.getElementById("stepsContent");
  const solutionWrap = document.getElementById("solution");
  const solutionContent = document.getElementById("solutionContent");

  // Utility helpers
  function setIcon(el, ok) {
    el.textContent = ok ? "✓" : "✗";
    el.className = ok ? "status-check" : "status-cross";
  }

  function renderMath(el) {
    if (window.MathJax) MathJax.typesetPromise([el]).catch(() => {});
  }

  function validateLatexAndPreview() {
    const val = reasoningInput.value.trim();
    const provided = val.length > 0;
    setIcon(reasoningIcon, provided);

    if (!provided) {
      reasoningPreview.textContent = "Your reasoning will appear here…";
      latexValidation.classList.add("hidden");
      setIcon(latexIcon, false);
      return;
    }

    // If you have a utility, use it; otherwise, do basic check
    let isValid = true;
    if (
      window.MathUtils &&
      typeof window.MathUtils.validateLatexSyntax === "function"
    ) {
      const res = window.MathUtils.validateLatexSyntax(val);
      isValid = res.isValid;
      if (res.isValid) {
        latexValidation.className = "latex-validation latex-valid";
        latexValidation.textContent = "✓ Valid LaTeX syntax";
      } else {
        latexValidation.className = "latex-validation latex-invalid";
        latexValidation.textContent =
          "✗ LaTeX errors: " + res.errors.join(", ");
      }
      latexValidation.classList.remove("hidden");
    } else {
      // Fallback: simple check that delimiters balance
      const opens = (val.match(/\$/g) || []).length;
      isValid = opens % 2 === 0;
      latexValidation.className = isValid
        ? "latex-validation latex-valid"
        : "latex-validation latex-invalid";
      latexValidation.textContent = isValid
        ? "✓ Looks like valid LaTeX"
        : "✗ Unbalanced $ delimiters";
      latexValidation.classList.remove("hidden");
    }

    setIcon(latexIcon, isValid);
    reasoningPreview.innerHTML = val;
    renderMath(reasoningPreview);
  }

  function updateEnableCheck() {
    const ready = ans1Sel.value && ans2Sel.value && reasoningInput.value.trim();
    checkBtn.disabled = !ready;
    setIcon(ans1Icon, !!ans1Sel.value);
    setIcon(ans2Icon, !!ans2Sel.value);
  }

  // Question bank with explicit step/solution details
  const bank = [
    {
      // Continuous at 4 (same linear piece); NOT continuous at 6 (jump)
      latex: String.raw`f(x)=\begin{cases}
2x-1, & x<4,\\
2x-1, & 4\le x<6,\\
x+5, & x\ge 6
\end{cases}`,
      correctAt4: "is continuous",
      correctAt6: "is not continuous",
      steps: [
        String.raw`At \(x=4\): Left piece \(2x-1\) and middle piece \(2x-1\) agree.`,
        String.raw`\(\lim_{x\to 4^-}f(x)=2\cdot4-1=7\), \(\lim_{x\to 4^+}f(x)=7\), \(f(4)=7\) ⇒ continuous.`,
        String.raw`At \(x=6\): Middle piece gives \(\lim_{x\to6^-}f(x)=2\cdot6-1=11\).`,
        String.raw`Right piece gives \(\lim_{x\to6^+}f(x)=6+5=11\) and \(f(6)=11\) ⇒ actually *continuous*.`,
      ],
      // note: to demonstrate variety, flip one case in a different example
      overwriteAt6: { correct: "is continuous" }, // fixes the text above
      solution: [
        String.raw`\(\textbf{At }x=4:\) both sides use \(2x-1\). Limits and value are 7 ⇒ continuous.`,
        String.raw`\(\textbf{At }x=6:\) left limit \(=11\), right limit \(=11\), and \(f(6)=11\) ⇒ continuous.`,
      ],
    },
    {
      // NOT continuous at 4 (hole); continuous at 6
      latex: String.raw`f(x)=\begin{cases}
x+1, & x<4,\\
x^2-15, & 4\le x<6,\\
2x-1, & x\ge 6
\end{cases}`,
      correctAt4: "is not continuous",
      correctAt6: "is continuous",
      steps: [
        String.raw`At \(x=4\): \(\lim_{x\to 4^-}f(x)=4+1=5\).`,
        String.raw`\(\lim_{x\to 4^+}f(x)=4^2-15=1\).`,
        String.raw`Left and right limits differ ⇒ limit does not exist ⇒ not continuous.`,
        String.raw`At \(x=6\): \(\lim_{x\to6^-}f(x)=6^2-15=21\), \(\lim_{x\to6^+}f(x)=2\cdot6-1=11\) ⇒ actually a jump.`,
      ],
      overwriteAt6: { correct: "is not continuous" },
      solution: [
        String.raw`\(\textbf{At }x=4:\) left limit \(=5\), right limit \(=1\) ⇒ not continuous.`,
        String.raw`\(\textbf{At }x=6:\) left \(=21\), right \(=11\), \(f(6)=11\) ⇒ not continuous.`,
      ],
    },
    {
      // Continuous at 4; NOT continuous at 6 (removable, value mismatch)
      latex: String.raw`f(x)=\begin{cases}
x-3, & x<4,\\
x-3, & 4\le x<6,\\
\color{#1f2937}{(x-6)^2+10}, & x>6, \quad \text{and } f(6)=9
\end{cases}`,
      correctAt4: "is continuous",
      correctAt6: "is not continuous",
      steps: [
        String.raw`At \(x=4:\) both sides give \(4-3=1\), and \(f(4)=1\) ⇒ continuous.`,
        String.raw`At \(x=6:\) left limit \(=6-3=3\).`,
        String.raw`Right limit \(\lim_{x\to6^+}[(x-6)^2+10]=10\).`,
        String.raw`But \(f(6)=9\). Limits mismatch the value ⇒ not continuous.`,
      ],
      solution: [
        String.raw`\(\textbf{At }x=4:\) limits and value are \(1\) ⇒ continuous.`,
        String.raw`\(\textbf{At }x=6:\) left limit \(=3\), right limit \(=10\), value \(=9\) ⇒ not continuous.`,
      ],
    },
  ].map((q) => {
    // normalize any overwrite patches used above
    if (q.overwriteAt6) q.correctAt6 = q.overwriteAt6.correct;
    return q;
  });

  let idx = 0;

  function loadQuestion() {
    const q = bank[idx];

    functionDisplay.innerHTML = `\\[
  ${q.latex}
\\]`;

    renderMath(functionDisplay);

    // clear UI
    ans1Sel.value = "";
    ans2Sel.value = "";
    fb1.classList.add("hidden");
    fb2.classList.add("hidden");
    fb1.innerHTML = "";
    fb2.innerHTML = "";
    scoreBanner.classList.add("hidden");
    aiBox.classList.add("hidden");
    aiContent.innerHTML = "";

    stepsWrap.classList.add("hidden");
    stepsContent.innerHTML = "";
    solutionWrap.classList.add("hidden");
    solutionContent.innerHTML = "";

    reasoningInput.value = "";
    validateLatexAndPreview();
    updateEnableCheck();
  }

  // Compare, score, show AI feedback
  async function checkSolution() {
    const q = bank[idx];
    const userAt4 = ans1Sel.value;
    const userAt6 = ans2Sel.value;

    const ok4 = userAt4 === q.correctAt4;
    const ok6 = userAt6 === q.correctAt6;

    // show per-part feedback
    fb1.className = "feedback " + (ok4 ? "correct" : "incorrect");
    fb1.textContent = ok4 ? "✓ Correct at x=4" : "✗ Try again at x=4";
    fb1.classList.remove("hidden");

    fb2.className = "feedback " + (ok6 ? "correct" : "incorrect");
    fb2.textContent = ok6 ? "✓ Correct at x=6" : "✗ Try again at x=6";
    fb2.classList.remove("hidden");

    const allCorrect = ok4 && ok6;

    scoreBanner.className =
      "feedback " + (allCorrect ? "correct" : "incorrect");
    scoreBanner.textContent = allCorrect
      ? "Great job! Both answers are correct."
      : "Some answers need correction. Review hints or the steps.";
    scoreBanner.classList.remove("hidden");

    // AI feedback (based on user answers + reasoning)
    try {
      const questionData = {
        question: "Continuity of a piecewise function at x=4 and x=6.",
        piecesLatex: q.latex,
        targets: ["x=4", "x=6"],
        correctAnswer: { at4: q.correctAt4, at6: q.correctAt6 },
      };

      const userAnswer = {
        at4: userAt4 || "(blank)",
        at6: userAt6 || "(blank)",
      };
      const reasoning = reasoningInput.value.trim();

      const feedback = await window.openAIService.generateFeedback(
        questionData,
        userAnswer,
        reasoning,
        allCorrect
      );

      aiContent.innerHTML = window.AIRender.renderCard(feedback);
      aiBox.classList.remove("hidden");
      renderMath(aiContent);
    } catch (e) {
      aiContent.innerHTML = "<p>Unable to generate AI feedback right now.</p>";
      aiBox.classList.remove("hidden");
    }
  }

  // Steps & full solution
  function showSteps() {
    const q = bank[idx];
    stepsContent.innerHTML = `
      <div class="step">
        <div class="step-title">At \(x=4\)</div>
        <ol>${q.steps
          .slice(0, Math.max(1, q.steps.length - 3))
          .map((s) => `<li>${s}</li>`)
          .join("")}</ol>
      </div>
      <div class="step">
        <div class="step-title">At \(x=6\)</div>
        <ol>${q.steps
          .slice(Math.max(1, q.steps.length - 3))
          .map((s) => `<li>${s}</li>`)
          .join("")}</ol>
      </div>
    `;
    stepsWrap.classList.remove("hidden");
    renderMath(stepsContent);
  }

  function showSolution() {
    const q = bank[idx];
    solutionContent.innerHTML = `
      <div class="step">
        <div class="step-title">Summary</div>
        <p>${q.solution[0]}</p>
        <p>${q.solution[1]}</p>
      </div>
    `;
    solutionWrap.classList.remove("hidden");
    renderMath(solutionContent);
  }

  // Clear all
  function clearAll() {
    ans1Sel.value = "";
    ans2Sel.value = "";
    fb1.classList.add("hidden");
    fb2.classList.add("hidden");
    fb1.textContent = "";
    fb2.textContent = "";
    scoreBanner.classList.add("hidden");

    aiBox.classList.add("hidden");
    aiContent.innerHTML = "";

    stepsWrap.classList.add("hidden");
    stepsContent.innerHTML = "";
    solutionWrap.classList.add("hidden");
    solutionContent.innerHTML = "";

    hintContainer.classList.add("hidden");

    reasoningInput.value = "";
    validateLatexAndPreview();
    updateEnableCheck();
  }

  // Listeners
  ans1Sel.addEventListener("change", updateEnableCheck);
  ans2Sel.addEventListener("change", updateEnableCheck);

  reasoningInput.addEventListener("input", () => {
    validateLatexAndPreview();
    updateEnableCheck();
  });

  checkBtn.addEventListener("click", checkSolution);
  showStepsBtn.addEventListener("click", showSteps);
  showSolutionBtn.addEventListener("click", showSolution);
  clearBtn.addEventListener("click", clearAll);

  newQuestionBtn.addEventListener("click", () => {
    idx = (idx + 1) % bank.length;
    loadQuestion();
  });

  hintBtn.addEventListener("click", () => {
    hintContainer.classList.toggle("hidden");
  });

  // Init
  loadQuestion();
})();
