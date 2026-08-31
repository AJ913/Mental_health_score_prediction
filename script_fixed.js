const API_ENDPOINT = "https://mental-health-score-prediction-5-opxi.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("predictorForm");
  const predictButton = document.getElementById("predictButton");
  const resetButton = document.getElementById("resetButton");
  const retryButton = document.getElementById("retryButton");
  const apiStatus = document.getElementById("apiStatus");

  const meterWrap = document.getElementById("meterWrap");
  const meterRing = document.getElementById("meterRing");
  const scoreValue = document.getElementById("scoreValue");
  const resultState = document.getElementById("resultState");
  const resultTitle = document.getElementById("resultTitle");
  const resultMessage = document.getElementById("resultMessage");
  const trackFill = document.getElementById("trackFill");
  const statusItems = Array.from(document.querySelectorAll("#statusList li"));

  const summaryUsage = document.getElementById("summaryUsage");
  const summarySleep = document.getElementById("summarySleep");
  const summaryStress = document.getElementById("summaryStress");

  const editableFields = Array.from(form.querySelectorAll("input, select"));

  let loadingTimer = null;
  let activeProgress = 0;
  let activeStep = 0;

  const loadingMessages = [
    {
      state: "Reading Inputs",
      title: "Building the student profile",
      message: "The meter is organizing your digital, lifestyle, and stress values.",
    },
    {
      state: "Encoding",
      title: "Converting habits for the model",
      message: "Platform, purpose, country, and stress level are being matched to the model format.",
    },
    {
      state: "Predicting",
      title: "Running the mental health model",
      message: "The FastAPI backend is using your saved model to calculate a wellness score.",
    },
    {
      state: "Finishing",
      title: "Preparing the result",
      message: "The returned score is being mapped into the animated meter.",
    },
  ];

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function wait(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function updateSummaries() {
    const usageRaw = form.elements.Avg_Daily_Usage_Hours.value;
    const sleepRaw = form.elements.Sleep_Hours_Per_Night.value;
    const usage = Number(usageRaw);
    const sleep = Number(sleepRaw);
    summaryUsage.textContent = usageRaw !== "" && Number.isFinite(usage) ? `${usage.toFixed(1)}h` : "--";
    summarySleep.textContent = sleepRaw !== "" && Number.isFinite(sleep) ? `${sleep.toFixed(1)}h` : "--";
    summaryStress.textContent = form.elements.Stress_Level.value;
  }

  function setMeter(percent, color = "#38a78f") {
    const safePercent = clamp(percent, 0, 100);
    meterRing.style.setProperty("--meter-value", `${safePercent}%`);
    meterRing.style.setProperty("--meter-color", color);
    trackFill.style.width = `${safePercent}%`;
  }

  function setStatusStep(index) {
    activeStep = clamp(index, 0, statusItems.length - 1);
    statusItems.forEach((item, itemIndex) => {
      item.classList.toggle("active", itemIndex === activeStep);
      item.classList.toggle("complete", itemIndex < activeStep);
    });

    const copy = loadingMessages[activeStep];
    resultState.textContent = copy.state;
    resultTitle.textContent = copy.title;
    resultMessage.textContent = copy.message;
  }

  function setBusy(isBusy) {
    predictButton.disabled = isBusy;
    predictButton.classList.toggle("is-loading", isBusy);
    form.classList.toggle("is-busy", isBusy);
  }

  function startLoadingMeter() {
    stopLoadingMeter();
    meterWrap.dataset.mode = "loading";
    scoreValue.textContent = "--";
    retryButton.hidden = true;
    activeProgress = 8;
    setMeter(activeProgress, "#4f7cff");
    setStatusStep(0);

    loadingTimer = window.setInterval(() => {
      activeProgress += activeProgress < 60 ? 7 : 3;

      if (activeProgress >= 92) {
        activeProgress = 74;
      }

      if (activeProgress > 28 && activeStep < 1) setStatusStep(1);
      if (activeProgress > 54 && activeStep < 2) setStatusStep(2);
      if (activeProgress > 78 && activeStep < 3) setStatusStep(3);

      setMeter(activeProgress, activeStep >= 2 ? "#c88b2f" : "#4f7cff");
    }, 420);
  }

  function stopLoadingMeter() {
    if (loadingTimer) {
      window.clearInterval(loadingTimer);
      loadingTimer = null;
    }
  }

  function getBand(score) {
    if (score < 5) {
      return {
        color: "#dc5c55",
        state: "Needs Support",
        title: "Low wellness score",
        message: "The model is seeing a strained pattern in the selected habits and stress level.",
      };
    }

    if (score < 6.5) {
      return {
        color: "#c88b2f",
        state: "Moderate",
        title: "Mixed wellness pattern",
        message: "The score suggests some balance, with a few inputs pulling the prediction downward.",
      };
    }

    if (score < 8) {
      return {
        color: "#38a78f",
        state: "Balanced",
        title: "Healthy wellness range",
        message: "The model is seeing a generally steady routine across the selected inputs.",
      };
    }

    return {
      color: "#2f9d58",
      state: "Strong",
      title: "Strong wellness score",
      message: "The selected pattern is being read as supportive for mental wellness by the model.",
    };
  }

  function animateScore(score) {
    const startTime = performance.now();
    const duration = 850;
    const start = 0;

    function frame(now) {
      const progress = clamp((now - startTime) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (score - start) * eased;
      scoreValue.textContent = current.toFixed(score % 1 === 0 ? 0 : 1);

      if (progress < 1) {
        requestAnimationFrame(frame);
      }
    }

    requestAnimationFrame(frame);
  }

  function readPayload() {
    return {
      Age: Number.parseInt(form.elements.Age.value, 10),
      Gender: form.elements.Gender.value,
      Country: form.elements.Country.value,
      Academic_Level: form.elements.Academic_Level.value,
      Most_Used_Platform: form.elements.Most_Used_Platform.value,
      Purpose_Of_Use: form.elements.Purpose_Of_Use.value,
      Avg_Daily_Usage_Hours: Number.parseFloat(form.elements.Avg_Daily_Usage_Hours.value),
      Daily_Unlocks: Number.parseInt(form.elements.Daily_Unlocks.value, 10),
      Study_Hours: Number.parseFloat(form.elements.Study_Hours.value),
      Physical_Activity_Hours: Number.parseFloat(form.elements.Physical_Activity_Hours.value),
      Sleep_Hours_Per_Night: Number.parseFloat(form.elements.Sleep_Hours_Per_Night.value),
      Stress_Level: form.elements.Stress_Level.value,
    };
  }

  async function postPrediction(payload) {
    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let detail = `Prediction request failed with status ${response.status}.`;

      try {
        const errorBody = await response.json();
        if (errorBody.detail) {
          detail = Array.isArray(errorBody.detail)
            ? errorBody.detail.map((item) => item.msg).join(" ")
            : String(errorBody.detail);
        }
      } catch {
        detail = response.statusText || detail;
      }

      throw new Error(detail);
    }

    return response.json();
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.reportValidity()) {
      return;
    }

    setBusy(true);
    startLoadingMeter();

    try {
      const payload = readPayload();
      const [data] = await Promise.all([postPrediction(payload), wait(1200)]);
      const rawScore = Number(data.predicted_mental_health_score);

      if (!Number.isFinite(rawScore)) {
        throw new Error("The API returned a prediction without a numeric score.");
      }

      stopLoadingMeter();
      meterWrap.dataset.mode = "success";

      const scoreForMeter = clamp(rawScore, 0, 10);
      const band = getBand(rawScore);
      setStatusStep(statusItems.length - 1);
      statusItems.forEach((item) => item.classList.add("complete"));
      setMeter((scoreForMeter / 10) * 100, band.color);
      animateScore(rawScore);

      resultState.textContent = band.state;
      resultTitle.textContent = band.title;
      resultMessage.textContent = band.message;
      apiStatus.classList.add("is-online");
      apiStatus.classList.remove("is-offline");
    } catch (error) {
      stopLoadingMeter();
      meterWrap.dataset.mode = "error";
      setMeter(100, "#dc5c55");
      scoreValue.textContent = "!";
      resultState.textContent = "Error";
      resultTitle.textContent = "Prediction failed";
      resultMessage.textContent =
        error.message || "Check that your FastAPI backend is running on http://127.0.0.1:8000.";
      retryButton.hidden = false;
      apiStatus.classList.add("is-offline");
      apiStatus.classList.remove("is-online");
    } finally {
      setBusy(false);
    }
  }

  function resetResult() {
    stopLoadingMeter();
    meterWrap.dataset.mode = "idle";
    setMeter(0);
    scoreValue.textContent = "--";
    resultState.textContent = "Ready";
    resultTitle.textContent = "Wellness meter standing by";
    resultMessage.textContent = "The prediction panel will animate while your FastAPI model calculates the score.";
    retryButton.hidden = true;
    statusItems.forEach((item, index) => {
      item.classList.toggle("active", index === 0);
      item.classList.remove("complete");
    });
  }

  function pingApi() {
    fetch("http://127.0.0.1:8000/", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Offline");
        apiStatus.classList.add("is-online");
        apiStatus.classList.remove("is-offline");
      })
      .catch(() => {
        apiStatus.classList.add("is-offline");
        apiStatus.classList.remove("is-online");
      });
  }

  editableFields.forEach((element) => {
    const eventName = element.tagName === "SELECT" || element.type === "radio" ? "change" : "input";
    element.addEventListener(eventName, () => {
      updateSummaries();
      if (meterWrap.dataset.mode !== "loading") {
        resetResult();
      }
    });
  });

  form.addEventListener("submit", handleSubmit);
  resetButton.addEventListener("click", () => {
    form.reset();
    updateSummaries();
    resetResult();
  });
  retryButton.addEventListener("click", () => form.requestSubmit());

  updateSummaries();
  resetResult();
  pingApi();
});
