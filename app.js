const STORAGE_KEY = "praktikmål-tracker-v1";

const statusLabels = {
  red: "Rød",
  yellow: "Gul",
  green: "Grøn",
};

const DEFAULT_COLOR = "#66BB6A";

const dataService = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch (error) {
      console.warn("Kunne ikke indlæse data", error);
      return [];
    }
  },
  save(goals) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
    } catch (error) {
      console.warn("Kunne ikke gemme data", error);
      alert(
        "Der opstod en fejl ved gemning. Tjek om din browser tillader localStorage."
      );
    }
  },
};

let goals = dataService.load();
let editingGoalId = null;
let activeGoalId = null;

const elements = {
  helpPanel: document.getElementById("help-panel"),
  toggleHelp: document.getElementById("toggle-help"),
  goalForm: document.getElementById("goal-form"),
  goalTitle: document.getElementById("goal-title"),
  goalDescription: document.getElementById("goal-description"),
  goalFile: document.getElementById("goal-file"),
  goalList: document.getElementById("goal-list"),
  emptyState: document.querySelector(".empty-state"),
  clearAll: document.getElementById("clear-all"),
  goalTemplate: document.getElementById("goal-template"),
  goalEditor: document.getElementById("goal-editor"),
  binderTabs: document.getElementById("binder-tabs"),
};

const editorForm = elements.goalEditor
  ? elements.goalEditor.querySelector("form")
  : null;
const editorControls = {
  title: editorForm ? editorForm.querySelector('input[name="edit-title"]') : null,
  description: editorForm
    ? editorForm.querySelector('textarea[name="edit-description"]')
    : null,
  file: editorForm ? editorForm.querySelector('input[name="edit-file"]') : null,
  close: elements.goalEditor
    ? elements.goalEditor.querySelector(".modal__close")
    : null,
};

function persist() {
  dataService.save(goals);
}

function getTextColorForBackground(hexColor) {
  if (!hexColor || typeof hexColor !== "string") return "#0d0d0d";
  let hex = hexColor.trim().replace("#", "");
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }
  if (hex.length !== 6 || Number.isNaN(Number.parseInt(hex, 16))) {
    return "#0d0d0d";
  }
  const r = Number.parseInt(hex.substring(0, 2), 16) / 255;
  const g = Number.parseInt(hex.substring(2, 4), 16) / 255;
  const b = Number.parseInt(hex.substring(4, 6), 16) / 255;

  const adjust = (channel) =>
    channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);

  const luminance = 0.2126 * adjust(r) + 0.7152 * adjust(g) + 0.0722 * adjust(b);
  return luminance > 0.55 ? "#0d0d0d" : "#f9f9f9";
}

function getSelectedColor(container, name, fallback) {
  if (!container) return fallback;
  const checked = container.querySelector(`input[name="${name}"]:checked`);
  return checked ? checked.value : fallback;
}

function setSelectedColor(container, name, value) {
  if (!container) return;
  const inputs = container.querySelectorAll(`input[name="${name}"]`);
  if (!inputs.length) return;
  let matched = false;
  inputs.forEach((input) => {
    const isMatch = value
      ? input.value.toLowerCase() === value.toLowerCase()
      : false;
    input.checked = isMatch;
    if (isMatch) {
      matched = true;
    }
  });
  if (!matched) {
    inputs[0].checked = true;
  }
}

function createGoal(payload) {
  const id =
    window.crypto && typeof window.crypto.randomUUID === "function"
      ? window.crypto.randomUUID()
      : "goal-" + Date.now() + "-" + Math.random().toString(16).slice(2);

  goals = [
    {
      id,
      title: payload.title,
      description: payload.description,
      status: "red",
      reflection: "",
      pdf: payload.pdf || null,
      color: payload.color || DEFAULT_COLOR,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    ...goals,
  ];
  activeGoalId = id;
  persist();
  renderGoals();
}

function updateGoal(id, updater) {
  goals = goals.map((goal) => {
    if (goal.id !== id) return goal;
    const updated = { ...goal, ...updater(goal) };
    updated.updatedAt = new Date().toISOString();
    return updated;
  });
  persist();
  renderGoals();
}

function deleteGoal(id) {
  goals = goals.filter((goal) => goal.id !== id);
  if (id === activeGoalId) {
    activeGoalId = goals.length ? goals[0].id : null;
  }
  persist();
  renderGoals();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: reader.result,
      });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function setStatusUI(statusChip, buttons, status) {
  statusChip.dataset.status = status;
  statusChip.textContent = statusLabels[status] || "Ukendt";

  buttons.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.status === status);
  });
}

function setFileUI(container, missingMessage, pdf) {
  if (pdf) {
    container.classList.remove("is-hidden");
    container.querySelector(".goal-file__link").textContent = pdf.name;
    container.querySelector(".goal-file__link").href = pdf.dataUrl;
    missingMessage.classList.add("is-hidden");
  } else {
    container.classList.add("is-hidden");
    missingMessage.classList.remove("is-hidden");
  }
}

function renderGoals() {
  const list = elements.goalList;
  const existingCards = list.querySelectorAll(".card--goal");
  existingCards.forEach((card) => card.remove());

  if (!goals.length) {
    if (elements.emptyState) {
      elements.emptyState.textContent =
        "Ingen mål endnu. Tilføj det første i formularen.";
      elements.emptyState.style.display = "block";
    }
    if (elements.binderTabs) {
      elements.binderTabs.innerHTML = "";
      elements.binderTabs.classList.add("is-hidden");
    }
    activeGoalId = null;
    return;
  }

  if (!activeGoalId || !goals.some((goal) => goal.id === activeGoalId)) {
    activeGoalId = goals[0].id;
  }

  if (elements.emptyState) {
    elements.emptyState.style.display = "none";
  }

  renderBinderTabs();
  if (elements.binderTabs) {
    elements.binderTabs.classList.remove("is-hidden");
  }

  const activeGoal = goals.find((goal) => goal.id === activeGoalId);
  if (!activeGoal) return;

  const fragment = elements.goalTemplate.content.cloneNode(true);
  const article = fragment.querySelector(".card--goal");
  const titleEl = article.querySelector(".goal-title");
  const descriptionEl = article.querySelector(".goal-description");
  const statusChip = article.querySelector(".status-chip");
  const statusButtons = article.querySelectorAll(".status-selector button");
  const reflectionField = article.querySelector(".field--reflection textarea");
  const fileContainer = article.querySelector(".goal-file");
  const missingFile = article.querySelector(".goal-file--missing");
  const removeFileBtn = article.querySelector(".remove-file");
  const editBtn = article.querySelector(".edit-goal");
  const deleteBtn = article.querySelector(".delete-goal");
  const panelId = `goal-panel-${activeGoal.id}`;

  article.id = panelId;
  article.setAttribute("role", "tabpanel");
  article.setAttribute("aria-labelledby", `goal-tab-${activeGoal.id}`);

  titleEl.textContent = activeGoal.title;
  descriptionEl.textContent = activeGoal.description || "Ingen beskrivelse angivet.";
  reflectionField.value =
    activeGoal.reflection !== undefined && activeGoal.reflection !== null
      ? activeGoal.reflection
      : "";

  setStatusUI(statusChip, statusButtons, activeGoal.status);
  setFileUI(fileContainer, missingFile, activeGoal.pdf);

  statusButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const newStatus = btn.dataset.status;
      if (!newStatus) return;
      updateGoal(activeGoal.id, () => ({ status: newStatus }));
    });
  });

  reflectionField.addEventListener("input", (event) => {
    updateGoal(activeGoal.id, () => ({ reflection: event.target.value }));
  });

  removeFileBtn.addEventListener("click", () => {
    if (!activeGoal.pdf) return;
    const confirmed = confirm("Fjern den vedhæftede fil?");
    if (!confirmed) return;
    updateGoal(activeGoal.id, () => ({ pdf: null }));
  });

  editBtn.addEventListener("click", () => openEditor(activeGoal.id));
  deleteBtn.addEventListener("click", () => {
    const confirmed = confirm(
      `Er du sikker på, at du vil slette "${activeGoal.title}"?`
    );
    if (confirmed) {
      deleteGoal(activeGoal.id);
    }
  });

  list.appendChild(fragment);
}

function renderBinderTabs() {
  if (!elements.binderTabs) return;
  elements.binderTabs.innerHTML = "";

  goals.forEach((goal) => {
    const tabButton = document.createElement("button");
    tabButton.type = "button";
    tabButton.className = "binder-tabs__tab";
    tabButton.dataset.goalId = goal.id;
    tabButton.setAttribute("role", "tab");
    tabButton.setAttribute("aria-selected", goal.id === activeGoalId ? "true" : "false");
    const tabColor = goal.color || "#4caf50";
    const textColor = getTextColorForBackground(tabColor);
    tabButton.style.setProperty("--tab-color", tabColor);
    tabButton.style.setProperty("--tab-text-color", textColor);
    tabButton.id = `goal-tab-${goal.id}`;
    tabButton.setAttribute("aria-controls", `goal-panel-${goal.id}`);
    const labelSpan = document.createElement("span");
    labelSpan.className = "binder-tabs__label";
    labelSpan.textContent = goal.title;
    tabButton.appendChild(labelSpan);
    if (goal.id === activeGoalId) {
      tabButton.classList.add("is-active");
      tabButton.setAttribute("tabindex", "0");
    } else {
      tabButton.setAttribute("tabindex", "-1");
    }

    tabButton.addEventListener("click", () => {
      activeGoalId = goal.id;
      renderGoals();
    });

    tabButton.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activeGoalId = goal.id;
        renderGoals();
        return;
      }
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        const tabs = Array.from(
          elements.binderTabs.querySelectorAll(".binder-tabs__tab")
        );
        const currentIndex = tabs.findIndex((tab) => tab.dataset.goalId === goal.id);
        if (currentIndex === -1) return;
        const direction = event.key === "ArrowRight" ? 1 : -1;
        const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
        const nextGoalId = tabs[nextIndex].dataset.goalId;
        activeGoalId = nextGoalId;
        renderGoals();
        window.requestAnimationFrame(() => {
          const nextTab = elements.binderTabs?.querySelector(
            `.binder-tabs__tab[data-goal-id="${nextGoalId}"]`
          );
          nextTab?.focus();
        });
      }
    });

    elements.binderTabs.appendChild(tabButton);
  });
}

async function handleFormSubmit(event) {
  event.preventDefault();
  const title = elements.goalTitle.value.trim();
  const description = elements.goalDescription.value.trim();
  const color = getSelectedColor(elements.goalForm, "color", DEFAULT_COLOR);
  const file =
    elements.goalFile.files && elements.goalFile.files.length
      ? elements.goalFile.files[0]
      : null;

  if (!title) {
    alert("Titel er påkrævet.");
    return;
  }

  let pdf = null;
  if (file) {
    if (file.size > 4 * 1024 * 1024) {
      const cont = confirm(
        "Filen er større end 4 MB og kan være svær at gemme lokalt. Fortsæt?"
      );
      if (!cont) {
        return;
      }
    }
    try {
      pdf = await readFileAsDataUrl(file);
    } catch (error) {
      console.error("Fejl ved læsning af fil", error);
      alert("Kunne ikke læse filen. Prøv igen.");
      return;
    }
  }

  createGoal({ title, description, pdf, color });
  elements.goalForm.reset();
  setSelectedColor(elements.goalForm, "color", color);
  elements.goalFile.value = "";
}

function openEditor(goalId) {
  const goal = goals.find((item) => item.id === goalId);
  if (!goal || !elements.goalEditor) return;
  editingGoalId = goalId;
  editorControls.title.value = goal.title;
  editorControls.description.value = goal.description || "";
  setSelectedColor(editorForm, "edit-color", goal.color || DEFAULT_COLOR);
  editorControls.file.value = "";
  if (typeof elements.goalEditor.showModal === "function") {
    elements.goalEditor.showModal();
  } else {
    elements.goalEditor.setAttribute("open", "true");
  }
}

function closeEditor() {
  editingGoalId = null;
  if (!elements.goalEditor) return;
  if (typeof elements.goalEditor.close === "function") {
    elements.goalEditor.close();
  } else {
    elements.goalEditor.removeAttribute("open");
  }
}

async function handleEditorSubmit(event) {
  event.preventDefault();
  if (!editingGoalId) return;

  const title = editorControls.title.value.trim();
  const description = editorControls.description.value.trim();
  const color = getSelectedColor(editorForm, "edit-color", DEFAULT_COLOR);
  const file =
    editorControls.file && editorControls.file.files && editorControls.file.files.length
      ? editorControls.file.files[0]
      : null;
  let pdfPayload = null;

  if (!title) {
    alert("Titel er påkrævet.");
    return;
  }

  if (file) {
    if (file.size > 4 * 1024 * 1024) {
      const cont = confirm(
        "Filen er større end 4 MB og kan være svær at gemme lokalt. Fortsæt?"
      );
      if (!cont) {
        return;
      }
    }
    try {
      pdfPayload = await readFileAsDataUrl(file);
    } catch (error) {
      console.error("Fejl ved læsning af fil", error);
      alert("Kunne ikke læse filen. Prøv igen.");
      return;
    }
  }

  updateGoal(editingGoalId, (goal) => ({
    title,
    description,
    color,
    pdf: pdfPayload || goal.pdf,
  }));
  closeEditor();
}

function toggleHelpPanel() {
  const isHidden = elements.helpPanel.classList.toggle("panel--hidden");
  elements.toggleHelp.textContent = isHidden ? "Vis hjælp" : "Skjul hjælp";
}

function clearAllGoals() {
  if (!goals.length) return;
  const confirmed = confirm(
    "Dette sletter alle praktikmål fra denne browser. Fortsæt?"
  );
  if (!confirmed) return;
  goals = [];
  activeGoalId = null;
  persist();
  renderGoals();
}

function init() {
  renderGoals();

  if (elements.goalForm) {
    elements.goalForm.addEventListener("submit", handleFormSubmit);
  }
  if (elements.toggleHelp) {
    elements.toggleHelp.addEventListener("click", toggleHelpPanel);
  }
  if (elements.clearAll) {
    elements.clearAll.addEventListener("click", clearAllGoals);
  }

  if (editorControls.close) {
    editorControls.close.addEventListener("click", closeEditor);
  }
  if (editorForm) {
    editorForm.addEventListener("submit", handleEditorSubmit);
  }
  if (elements.goalEditor) {
    elements.goalEditor.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeEditor();
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
