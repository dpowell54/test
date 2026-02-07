const screens = document.querySelectorAll(".screen");
const navButtons = document.querySelectorAll("[data-route]");
const todaySummary = document.getElementById("todaySummary");
const currentTime = document.getElementById("currentTime");
const riskStatus = document.getElementById("riskStatus");
const riskWarning = document.getElementById("riskWarning");
const riskWindowText = document.getElementById("riskWindowText");
const storageStatus = document.getElementById("storageStatus");

const decisionForm = document.getElementById("decisionForm");
const outcomeGroup = document.getElementById("outcomeGroup");
const moodGroup = document.getElementById("moodGroup");
const energyGroup = document.getElementById("energyGroup");
const decisionFeedback = document.getElementById("decisionFeedback");

const checkinForm = document.getElementById("checkinForm");
const checkinStatus = document.getElementById("checkinStatus");
const checkinMoodGroup = document.getElementById("checkinMoodGroup");
const checkinEnergyGroup = document.getElementById("checkinEnergyGroup");
const checkinSleepGroup = document.getElementById("checkinSleepGroup");

const insightsContent = document.getElementById("insightsContent");
const insights7 = document.getElementById("insights7");
const insights30 = document.getElementById("insights30");

const historyList = document.getElementById("historyList");
const filterType = document.getElementById("filterType");
const filterOutcome = document.getElementById("filterOutcome");

const settingsForm = document.getElementById("settingsForm");
const minSamplesInput = document.getElementById("minSamples");
const regretThresholdInput = document.getElementById("regretThreshold");
const bedtimeInput = document.getElementById("bedtime");

const exportJsonButton = document.getElementById("exportJson");
const exportCsvButton = document.getElementById("exportCsv");
const importJsonInput = document.getElementById("importJson");
const clearAllButton = document.getElementById("clearAll");

const pauseTimer = document.getElementById("pauseTimer");
const pauseConfirm = document.getElementById("pauseConfirm");

const editModal = document.getElementById("editModal");
const editForm = document.getElementById("editForm");
const editType = document.getElementById("editType");
const editOutcome = document.getElementById("editOutcome");
const editMood = document.getElementById("editMood");
const editEnergy = document.getElementById("editEnergy");
const editNote = document.getElementById("editNote");
const deleteEntry = document.getElementById("deleteEntry");
const closeModal = document.getElementById("closeModal");

let currentEdit = null;
let pauseInterval = null;
let insightsDays = 7;
let settingsCache = { minSamples: 6, regretThreshold: 60 };

function setActiveScreen(route) {
  screens.forEach((screen) => screen.classList.remove("active"));
  const active = document.getElementById(`screen-${route}`);
  if (active) active.classList.add("active");
  if (route === "pause") startPauseTimer();
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const route = button.dataset.route;
    setActiveScreen(route);
    window.location.hash = route;
  });
});

function createPillButtons(container, valueKey) {
  for (let i = 1; i <= 5; i += 1) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = i;
    btn.dataset.value = i;
    btn.addEventListener("click", () => {
      container.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      container.dataset[valueKey] = i;
    });
    container.appendChild(btn);
  }
}

function createOutcomeButtons() {
  outcomeGroup.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      outcomeGroup.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      outcomeGroup.dataset.value = btn.dataset.value;
    });
  });
}

function startPauseTimer() {
  let timeLeft = 10;
  pauseTimer.textContent = timeLeft;
  pauseConfirm.disabled = true;
  if (pauseInterval) clearInterval(pauseInterval);
  pauseInterval = setInterval(() => {
    timeLeft -= 1;
    pauseTimer.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(pauseInterval);
      pauseConfirm.disabled = false;
    }
  }, 1000);
}

pauseConfirm.addEventListener("click", () => {
  setActiveScreen("quick-log");
});

function showFeedback(element) {
  element.classList.add("show");
  setTimeout(() => element.classList.remove("show"), 1200);
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function getDayName(date) {
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

async function refreshSummary() {
  const today = formatDate(new Date());
  const decisions = await dbApi.listDecisions();
  const todayDecisions = decisions.filter((d) => d.date === today);
  const regrets = todayDecisions.filter((d) => d.outcome === "Regret").length;
  const checkin = await dbApi.getCheckin(today);
  todaySummary.textContent = `${todayDecisions.length} logs today · ${regrets} regrets · Check-in ${checkin ? "done" : "not yet"}`;
}

function updateTime() {
  const now = new Date();
  currentTime.textContent = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

async function updateRiskStatus() {
  const decisions = await dbApi.listDecisions({
    start: Date.now() - 30 * 24 * 60 * 60 * 1000,
    end: Date.now(),
  });
  const { windows } = insightsApi.computeRiskWindows(decisions, settingsCache);
  const currentHour = new Date().getHours();
  const currentWindow = windows.find((w) => currentHour >= w.start && currentHour <= w.end);
  const bedtimeWarning = getBedtimeWarning(settingsCache.bedtime, windows);

  if (currentWindow) {
    riskStatus.textContent = "High-risk window";
    riskWarning.classList.remove("hidden");
    riskWindowText.textContent = `High-risk window ${formatHour(currentWindow.start)}–${formatHour(currentWindow.end + 1)} (${currentWindow.regretRate}% regret).`;
  } else if (bedtimeWarning) {
    riskStatus.textContent = "Bedtime caution";
    riskWarning.classList.remove("hidden");
    riskWindowText.textContent = bedtimeWarning;
  } else {
    riskStatus.textContent = "Clear for now";
    riskWarning.classList.add("hidden");
  }
}

function formatHour(hour) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return date.toLocaleTimeString(undefined, { hour: "numeric" });
}

function getBedtimeWarning(bedtime, windows) {
  if (!bedtime || !windows.length) return "";
  const [hours, minutes] = bedtime.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return "";
  const now = new Date();
  const bedtimeDate = new Date();
  bedtimeDate.setHours(hours, minutes, 0, 0);
  const diff = bedtimeDate - now;
  const withinHour = diff > 0 && diff <= 60 * 60 * 1000;
  if (!withinHour) return "";
  return `Bedtime is soon. High-risk decisions spike around this time—take the 10-second pause.`;
}

function resetForm() {
  decisionForm.reset();
  outcomeGroup.dataset.value = "";
  moodGroup.dataset.value = "";
  energyGroup.dataset.value = "";
  outcomeGroup.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
  moodGroup.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
  energyGroup.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
}

decisionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const outcome = outcomeGroup.dataset.value;
  const mood = Number(moodGroup.dataset.value || 0);
  const energy = Number(energyGroup.dataset.value || 0);
  if (!outcome || !mood || !energy) {
    alert("Please select outcome, mood, and energy.");
    return;
  }
  const typeSelect = document.getElementById("decisionType").value;
  const customType = document.getElementById("decisionTypeCustom").value.trim();
  const note = document.getElementById("decisionNote").value.trim();
  const tags = document.getElementById("decisionTags").value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const now = new Date();
  const decision = {
    id: null,
    type: customType || typeSelect,
    outcome,
    mood,
    energy,
    note,
    tags,
    timestamp: now.getTime(),
    date: formatDate(now),
    hour: now.getHours(),
    day: getDayName(now),
  };

  await dbApi.addDecision(decision);
  showFeedback(decisionFeedback);
  resetForm();
  await refreshSummary();
  await renderHistory();
  await renderInsights();
  await updateRiskStatus();
});

checkinForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const mood = Number(checkinMoodGroup.dataset.value || 0);
  const energy = Number(checkinEnergyGroup.dataset.value || 0);
  const sleep = Number(checkinSleepGroup.dataset.value || 0);
  if (!mood || !energy || !sleep) {
    alert("Please select mood, energy, and sleep quality.");
    return;
  }
  const flightsValue = document.getElementById("checkinFlights").value;
  const flights = flightsValue ? Number(flightsValue) : null;
  const note = document.getElementById("checkinNote").value.trim();
  const now = new Date();
  const checkin = {
    date: formatDate(now),
    timestamp: now.getTime(),
    mood,
    energy,
    sleep,
    flights,
    note,
  };
  await dbApi.addCheckin(checkin);
  checkinStatus.textContent = "Done for today ✔";
  checkinForm.reset();
  checkinMoodGroup.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
  checkinEnergyGroup.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
  checkinSleepGroup.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
  await renderInsights();
  await refreshSummary();
});

async function loadCheckinStatus() {
  const today = formatDate(new Date());
  const checkin = await dbApi.getCheckin(today);
  checkinStatus.textContent = checkin ? "Done for today ✔" : "Not done yet";
  checkinForm.querySelectorAll("button, input").forEach((el) => {
    el.disabled = !!checkin;
  });
}

async function renderInsights() {
  const decisions = await insightsApi.getDecisionsInRange(insightsDays);
  const checkins = await dbApi.listCheckins({
    start: Date.now() - insightsDays * 24 * 60 * 60 * 1000,
    end: Date.now(),
  });
  if (!decisions.length) {
    insightsContent.innerHTML = "<p>No decisions yet. Log a few to unlock insights.</p>";
    return;
  }

  const regretStats = insightsApi.computeRegretRates(decisions);
  const moodPatterns = insightsApi.computeMoodEnergyPatterns(decisions);
  const riskData = insightsApi.computeRiskWindows(decisions, settingsCache);
  const nextDay = insightsApi.computeNextDayCorrelation(decisions, checkins);

  const bestTypes = nextDay
    .filter((item) => item.avgMood && item.avgEnergy)
    .sort((a, b) => b.avgMood + b.avgEnergy - (a.avgMood + a.avgEnergy))
    .slice(0, 3);

  insightsContent.innerHTML = `
    <div class="card">
      <h3>Overall regret rate</h3>
      <p>${regretStats.regretRate}% regret across ${regretStats.total} decisions.</p>
      ${renderBarChart(regretStats.byType)}
    </div>
    <div class="card">
      <h3>High-risk windows</h3>
      ${renderRiskWindows(riskData.windows)}
    </div>
    <div class="card">
      <h3>Patterns to watch</h3>
      ${renderMoodPatterns(moodPatterns, decisions)}
    </div>
    <div class="card">
      <h3>Best decisions</h3>
      ${renderBestTypes(bestTypes)}
    </div>
  `;
}

function renderBarChart(stats) {
  if (!stats.length) return "<p>No data yet.</p>";
  const max = Math.max(...stats.map((s) => s.total));
  const bars = stats
    .map(
      (item) => `
      <div class="bar-row">
        <div class="bar-label">${item.type}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${(item.total / max) * 100}%"></div>
        </div>
        <div class="bar-value">${item.regretRate}% regret</div>
      </div>
    `,
    )
    .join("");
  return `<div class="bar-chart">${bars}</div>`;
}

function renderRiskWindows(windows) {
  if (!windows.length) {
    return "<p>No consistent high-risk windows detected yet.</p>";
  }
  return windows
    .map(
      (w) =>
        `<p>Your highest-risk window is ${formatHour(w.start)}–${formatHour(w.end + 1)} (${w.regretRate}% regret).</p>`,
    )
    .join("");
}

function renderMoodPatterns(patterns, decisions) {
  if (!patterns.length) {
    return "<p>Keep logging to surface patterns.</p>";
  }
  const top = patterns.slice(0, 3);
  return top
    .map((item) => {
      const percentage = item.regretRate;
      return `<p>When mood is ${item.mood} and energy is ${item.energy}, regret hits ${percentage}% of the time.</p>`;
    })
    .join("");
}

function renderBestTypes(types) {
  if (!types.length) {
    return "<p>Not enough next-day check-ins yet to see what lifts you.</p>";
  }
  return types
    .map((item) => `<p>${item.type} decisions correlate with next-day mood ${item.avgMood}/5 and energy ${item.avgEnergy}/5.</p>`)
    .join("");
}

async function renderHistory() {
  const decisions = await dbApi.listDecisions();
  const typeFilter = filterType.value;
  const outcomeFilter = filterOutcome.value;
  const filtered = decisions.filter((d) => (!typeFilter || d.type === typeFilter) && (!outcomeFilter || d.outcome === outcomeFilter));
  if (!filtered.length) {
    historyList.innerHTML = "<p>No decisions logged yet.</p>";
    return;
  }
  const grouped = filtered.reduce((acc, item) => {
    if (!acc[item.date]) acc[item.date] = [];
    acc[item.date].push(item);
    return acc;
  }, {});

  historyList.innerHTML = Object.entries(grouped)
    .sort((a, b) => new Date(b[0]) - new Date(a[0]))
    .map(([date, list]) => {
      const entries = list
        .sort((a, b) => b.timestamp - a.timestamp)
        .map(
          (item) => `
          <div class="history-item" data-id="${item.id}">
            <h4>${item.type} · ${item.outcome}</h4>
            <p>${new Date(item.timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })} · Mood ${item.mood} · Energy ${item.energy}</p>
            <p>${item.note || ""}</p>
          </div>
        `,
        )
        .join("");
      return `<div><h3>${date}</h3>${entries}</div>`;
    })
    .join("");

  historyList.querySelectorAll(".history-item").forEach((item) => {
    item.addEventListener("click", () => openEditModal(item.dataset.id));
  });
}

filterType.addEventListener("change", renderHistory);
filterOutcome.addEventListener("change", renderHistory);

async function openEditModal(id) {
  const decisions = await dbApi.listDecisions();
  currentEdit = decisions.find((item) => item.id === id);
  if (!currentEdit) return;
  editType.value = currentEdit.type;
  editOutcome.value = currentEdit.outcome;
  editMood.value = currentEdit.mood;
  editEnergy.value = currentEdit.energy;
  editNote.value = currentEdit.note;
  editModal.classList.remove("hidden");
}

editForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentEdit) return;
  const updated = {
    ...currentEdit,
    type: editType.value,
    outcome: editOutcome.value,
    mood: Number(editMood.value),
    energy: Number(editEnergy.value),
    note: editNote.value,
  };
  await dbApi.updateDecision(updated);
  editModal.classList.add("hidden");
  await renderHistory();
  await refreshSummary();
  await renderInsights();
  await updateRiskStatus();
});

deleteEntry.addEventListener("click", async () => {
  if (!currentEdit) return;
  if (!confirm("Delete this entry?")) return;
  await dbApi.deleteDecision(currentEdit.id);
  editModal.classList.add("hidden");
  await renderHistory();
  await refreshSummary();
  await renderInsights();
  await updateRiskStatus();
});

closeModal.addEventListener("click", () => {
  editModal.classList.add("hidden");
});

settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const minSamples = Number(minSamplesInput.value || 6);
  const regretThreshold = Number(regretThresholdInput.value || 60);
  const bedtime = bedtimeInput.value || "";
  await dbApi.setSetting("minSamples", minSamples);
  await dbApi.setSetting("regretThreshold", regretThreshold);
  await dbApi.setSetting("bedtime", bedtime);
  settingsCache = { minSamples, regretThreshold, bedtime };
  await updateRiskStatus();
  alert("Settings saved.");
});

exportJsonButton.addEventListener("click", async () => {
  const decisions = await dbApi.listDecisions();
  const checkins = await dbApi.listCheckins();
  const settings = await dbApi.getSettings();
  const payload = { decisions, checkins, settings, exportedAt: new Date().toISOString() };
  downloadFile(JSON.stringify(payload, null, 2), "decision-firewall-backup.json", "application/json");
});

exportCsvButton.addEventListener("click", async () => {
  const decisions = await dbApi.listDecisions();
  const header = ["id", "timestamp", "date", "type", "outcome", "mood", "energy", "note", "tags"].join(",");
  const rows = decisions.map((d) =>
    [
      d.id,
      d.timestamp,
      d.date,
      `"${d.type}"`,
      d.outcome,
      d.mood,
      d.energy,
      `"${(d.note || "").replace(/"/g, '""')}"`,
      `"${(d.tags || []).join(" | ")}"`,
    ].join(","),
  );
  downloadFile([header, ...rows].join("\n"), "decision-firewall-decisions.csv", "text/csv");
});

importJsonInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const text = await file.text();
  try {
    const payload = JSON.parse(text);
    if (!confirm("Import data? This will overwrite existing data.")) return;
    await clearAllData(false);
    for (const decision of payload.decisions || []) {
      await dbApi.addDecision(decision);
    }
    for (const checkin of payload.checkins || []) {
      await dbApi.addCheckin(checkin);
    }
    for (const [key, value] of Object.entries(payload.settings || {})) {
      await dbApi.setSetting(key, value);
    }
    await loadSettings();
    await renderHistory();
    await refreshSummary();
    await renderInsights();
    await updateRiskStatus();
    alert("Import complete.");
  } catch (error) {
    alert("Import failed. Please check the JSON file.");
  }
});

clearAllButton.addEventListener("click", () => clearAllData(true));

async function clearAllData(showConfirm) {
  if (showConfirm && !confirm("Clear all data? This cannot be undone.")) return;
  if (dbApi.storageMode === "local") {
    localStorage.clear();
  } else {
    const db = await dbApi.openDB();
    if (db) {
      db.close();
      indexedDB.deleteDatabase("decision-firewall");
    }
  }
  window.location.reload();
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function loadSettings() {
  const settings = await dbApi.getSettings();
  settingsCache = {
    minSamples: Number(settings.minSamples || 6),
    regretThreshold: Number(settings.regretThreshold || 60),
    bedtime: settings.bedtime || "",
  };
  minSamplesInput.value = settingsCache.minSamples;
  regretThresholdInput.value = settingsCache.regretThreshold;
  bedtimeInput.value = settingsCache.bedtime;
}

function registerServiceWorker() {
  const status = document.querySelector("#offlineStatus span");
  if (!navigator.serviceWorker) {
    status.textContent = "Unsupported";
    return;
  }
  navigator.serviceWorker
    .register("sw.js")
    .then(() => {
      status.textContent = "Ready";
    })
    .catch(() => {
      status.textContent = "Failed";
    });
}

function checkStorageMode() {
  if (dbApi.storageMode === "local") {
    storageStatus.textContent = "IndexedDB unavailable. Using localStorage (limited).";
  } else {
    storageStatus.textContent = "IndexedDB active.";
  }
}

async function init() {
  createOutcomeButtons();
  createPillButtons(moodGroup, "value");
  createPillButtons(energyGroup, "value");
  createPillButtons(checkinMoodGroup, "value");
  createPillButtons(checkinEnergyGroup, "value");
  createPillButtons(checkinSleepGroup, "value");
  await dbApi.openDB();
  await loadSettings();
  await refreshSummary();
  await loadCheckinStatus();
  await renderHistory();
  await renderInsights();
  await updateRiskStatus();
  checkStorageMode();
  updateTime();
  setInterval(updateTime, 1000 * 30);
}

insights7.addEventListener("click", () => {
  insightsDays = 7;
  insights7.classList.add("active");
  insights30.classList.remove("active");
  renderInsights();
});

insights30.addEventListener("click", () => {
  insightsDays = 30;
  insights30.classList.add("active");
  insights7.classList.remove("active");
  renderInsights();
});

window.addEventListener("hashchange", () => {
  const route = window.location.hash.replace("#", "") || "home";
  setActiveScreen(route);
});

registerServiceWorker();
init();
