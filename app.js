import { signIn, signUp, signOut, onAuthStateChange, getCurrentUser, resetPassword, updatePassword } from './auth.js';
import { loadGoals, createGoal as createGoalDb, updateGoal as updateGoalDb, deleteGoal as deleteGoalDb } from './database.js';

const statusLabels = {
  red: "Rød",
  yellow: "Gul",
  green: "Grøn",
};

const DEFAULT_COLOR = "#66BB6A";

let goals = [];
let editingGoalId = null;
let activeGoalId = null;
let currentUser = null;
let isSignUpMode = false;
let isRecoveryMode = false;

const elements = {
  authView: document.getElementById("auth-view"),
  resetPasswordView: document.getElementById("reset-password-view"),
  appView: document.getElementById("app-view"),
  authForm: document.getElementById("auth-form"),
  authEmail: document.getElementById("auth-email"),
  authPassword: document.getElementById("auth-password"),
  authSubmit: document.getElementById("auth-submit"),
  authError: document.getElementById("auth-error"),
  authToggleBtn: document.getElementById("auth-toggle-btn"),
  authToggleText: document.getElementById("auth-toggle-text"),
  forgotPasswordBtn: document.getElementById("forgot-password-btn"),
  resetPasswordForm: document.getElementById("reset-password-form"),
  resetPassword: document.getElementById("reset-password"),
  resetPasswordConfirm: document.getElementById("reset-password-confirm"),
  resetSubmit: document.getElementById("reset-submit"),
  resetError: document.getElementById("reset-error"),
  userEmail: document.getElementById("user-email"),
  changePasswordBtn: document.getElementById("change-password-btn"),
  logoutBtn: document.getElementById("logout-btn"),
  changePasswordModal: document.getElementById("change-password-modal"),
  changePasswordForm: document.getElementById("change-password-form"),
  changePasswordClose: document.getElementById("change-password-close"),
  currentPassword: document.getElementById("current-password"),
  newPassword: document.getElementById("new-password"),
  confirmNewPassword: document.getElementById("confirm-new-password"),
  changePasswordSubmit: document.getElementById("change-password-submit"),
  changePasswordError: document.getElementById("change-password-error"),
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

function showAuthError(message) {
  elements.authError.textContent = message;
  elements.authError.classList.add('is-visible');
}

function hideAuthError() {
  elements.authError.classList.remove('is-visible');
}

function toggleAuthMode() {
  isSignUpMode = !isSignUpMode;
  if (isSignUpMode) {
    elements.authSubmit.textContent = 'Opret konto';
    elements.authToggleText.textContent = 'Har du allerede en konto?';
    elements.authToggleBtn.textContent = 'Log ind';
  } else {
    elements.authSubmit.textContent = 'Log ind';
    elements.authToggleText.textContent = 'Har du ikke en konto?';
    elements.authToggleBtn.textContent = 'Opret konto';
  }
  hideAuthError();
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  hideAuthError();

  const email = elements.authEmail.value.trim();
  const password = elements.authPassword.value;

  if (!email || !password) {
    showAuthError('Email og adgangskode er påkrævet');
    return;
  }

  elements.authSubmit.disabled = true;
  elements.authSubmit.textContent = 'Vent venligst...';

  try {
    if (isSignUpMode) {
      const { error } = await signUp(email, password);
      if (error) {
        if (error.message.includes('already registered')) {
          showAuthError('Denne email er allerede registreret');
        } else {
          showAuthError(error.message || 'Der opstod en fejl ved oprettelse af konto');
        }
      } else {
        showAuthSuccess('Konto oprettet! Logger ind...');
        setTimeout(async () => {
          const { error: signInError } = await signIn(email, password);
          if (signInError) {
            showAuthError('Konto oprettet, men login fejlede. Prøv at logge ind manuelt.');
            toggleAuthMode();
          }
        }, 1000);
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          showAuthError('Forkert email eller adgangskode');
        } else {
          showAuthError(error.message || 'Der opstod en fejl ved login');
        }
      }
    }
  } catch (error) {
    showAuthError('Der opstod en uventet fejl');
    console.error('Auth error:', error);
  } finally {
    elements.authSubmit.disabled = false;
    elements.authSubmit.textContent = isSignUpMode ? 'Opret konto' : 'Log ind';
  }
}

function showAuthSuccess(message) {
  elements.authError.textContent = message;
  elements.authError.style.background = 'rgba(76, 175, 80, 0.15)';
  elements.authError.style.borderColor = 'rgba(76, 175, 80, 0.4)';
  elements.authError.style.color = '#66BB6A';
  elements.authError.classList.add('is-visible');
}

async function handleLogout() {
  const { error } = await signOut();
  if (error) {
    alert('Der opstod en fejl ved logout');
    console.error('Logout error:', error);
  }
}

async function handleForgotPassword() {
  const email = elements.authEmail.value.trim();

  if (!email) {
    showAuthError('Indtast din email-adresse for at nulstille adgangskoden');
    return;
  }

  elements.forgotPasswordBtn.disabled = true;
  elements.forgotPasswordBtn.textContent = 'Sender...';

  try {
    const { error } = await resetPassword(email);
    if (error) {
      showAuthError('Der opstod en fejl. Prøv igen.');
      console.error('Password reset error:', error);
    } else {
      showAuthSuccess(`Nulstillingslink er sendt til ${email}`);
    }
  } catch (error) {
    showAuthError('Der opstod en uventet fejl');
    console.error('Password reset error:', error);
  } finally {
    elements.forgotPasswordBtn.disabled = false;
    elements.forgotPasswordBtn.textContent = 'Glemt adgangskode?';
  }
}

function showResetError(message) {
  elements.resetError.textContent = message;
  elements.resetError.classList.add('is-visible');
}

function hideResetError() {
  elements.resetError.classList.remove('is-visible');
}

function showResetSuccess(message) {
  elements.resetError.textContent = message;
  elements.resetError.style.background = 'rgba(76, 175, 80, 0.15)';
  elements.resetError.style.borderColor = 'rgba(76, 175, 80, 0.4)';
  elements.resetError.style.color = '#66BB6A';
  elements.resetError.classList.add('is-visible');
}

function showAuthView() {
  elements.authView.style.display = 'flex';
  elements.resetPasswordView.style.display = 'none';
  elements.appView.style.display = 'none';
  elements.authForm.reset();
  hideAuthError();
}

function showResetPasswordView() {
  elements.authView.style.display = 'none';
  elements.resetPasswordView.style.display = 'flex';
  elements.appView.style.display = 'none';
  elements.resetPasswordForm.reset();
  hideResetError();
}

function showAppView() {
  elements.authView.style.display = 'none';
  elements.resetPasswordView.style.display = 'none';
  elements.appView.style.display = 'block';
}

async function handleResetPasswordSubmit(event) {
  event.preventDefault();
  hideResetError();

  const password = elements.resetPassword.value;
  const passwordConfirm = elements.resetPasswordConfirm.value;

  if (!password || !passwordConfirm) {
    showResetError('Begge felter er påkrævet');
    return;
  }

  if (password !== passwordConfirm) {
    showResetError('Adgangskoderne matcher ikke');
    return;
  }

  if (password.length < 6) {
    showResetError('Adgangskoden skal være mindst 6 tegn');
    return;
  }

  elements.resetSubmit.disabled = true;
  elements.resetSubmit.textContent = 'Opdaterer...';

  try {
    const { error } = await updatePassword(password);
    if (error) {
      showResetError('Der opstod en fejl. Prøv igen.');
      console.error('Password update error:', error);
    } else {
      showResetSuccess('Adgangskode opdateret! Omdirigerer...');
      isRecoveryMode = false;
      setTimeout(() => {
        window.location.hash = '';
        window.history.replaceState(null, '', window.location.pathname);
        showAppView();
      }, 1500);
    }
  } catch (error) {
    showResetError('Der opstod en uventet fejl');
    console.error('Password update error:', error);
  } finally {
    elements.resetSubmit.disabled = false;
    elements.resetSubmit.textContent = 'Opdater adgangskode';
  }
}

async function handleAuthStateChange(event, session) {
  if (event === 'PASSWORD_RECOVERY') {
    isRecoveryMode = true;
    showResetPasswordView();
    return;
  }

  if (session?.user) {
    // If we're in recovery mode, stay on reset password view
    if (isRecoveryMode) {
      showResetPasswordView();
      return;
    }

    currentUser = session.user;
    elements.userEmail.textContent = currentUser.email;
    // Clear any hash from URL (e.g., recovery tokens)
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    showAppView();
    await loadAndRenderGoals();
  } else {
    currentUser = null;
    goals = [];
    activeGoalId = null;
    isRecoveryMode = false;
    showAuthView();
  }
}

async function loadAndRenderGoals() {
  try {
    goals = await loadGoals();
    renderGoals();
  } catch (error) {
    console.error('Error loading goals:', error);
    alert('Der opstod en fejl ved indlæsning af dine mål');
  }
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

async function createGoalLocal(payload) {
  try {
    const newGoal = await createGoalDb(payload);
    goals = [newGoal, ...goals];
    activeGoalId = newGoal.id;
    renderGoals();
  } catch (error) {
    console.error('Error creating goal:', error);
    alert('Der opstod en fejl ved oprettelse af målet');
  }
}

async function updateGoalLocal(id, updates) {
  try {
    const updatedGoal = await updateGoalDb(id, updates);
    goals = goals.map((goal) => goal.id === id ? updatedGoal : goal);
    renderGoals();
  } catch (error) {
    console.error('Error updating goal:', error);
    alert('Der opstod en fejl ved opdatering af målet');
  }
}

async function deleteGoalLocal(id) {
  try {
    await deleteGoalDb(id);
    goals = goals.filter((goal) => goal.id !== id);
    if (id === activeGoalId) {
      activeGoalId = goals.length ? goals[0].id : null;
    }
    renderGoals();
  } catch (error) {
    console.error('Error deleting goal:', error);
    alert('Der opstod en fejl ved sletning af målet');
  }
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
      updateGoalLocal(activeGoal.id, { status: newStatus });
    });
  });

  reflectionField.addEventListener("input", (event) => {
    updateGoalLocal(activeGoal.id, { reflection: event.target.value });
  });

  removeFileBtn.addEventListener("click", () => {
    if (!activeGoal.pdf) return;
    const confirmed = confirm("Fjern den vedhæftede fil?");
    if (!confirmed) return;
    updateGoalLocal(activeGoal.id, { pdf: null });
  });

  editBtn.addEventListener("click", () => openEditor(activeGoal.id));
  deleteBtn.addEventListener("click", () => {
    const confirmed = confirm(
      `Er du sikker på, at du vil slette "${activeGoal.title}"?`
    );
    if (confirmed) {
      deleteGoalLocal(activeGoal.id);
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
        "Filen er større end 4 MB. Fortsæt?"
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

  await createGoalLocal({ title, description, pdf, color });
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
        "Filen er større end 4 MB. Fortsæt?"
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

  const updates = {
    title,
    description,
    color,
  };

  if (pdfPayload) {
    updates.pdf = pdfPayload;
  }

  await updateGoalLocal(editingGoalId, updates);
  closeEditor();
}


async function clearAllGoals() {
  if (!goals.length) return;
  const confirmed = confirm(
    "Dette sletter alle praktikmål permanent. Fortsæt?"
  );
  if (!confirmed) return;

  try {
    await Promise.all(goals.map(goal => deleteGoalDb(goal.id)));
    goals = [];
    activeGoalId = null;
    renderGoals();
  } catch (error) {
    console.error('Error clearing goals:', error);
    alert('Der opstod en fejl ved sletning af alle mål');
  }
}

function showChangePasswordError(message) {
  elements.changePasswordError.textContent = message;
  elements.changePasswordError.style.background = 'rgba(239, 83, 80, 0.15)';
  elements.changePasswordError.style.borderColor = 'rgba(239, 83, 80, 0.4)';
  elements.changePasswordError.style.color = '#EF5350';
  elements.changePasswordError.classList.add('is-visible');
}

function hideChangePasswordError() {
  elements.changePasswordError.classList.remove('is-visible');
}

function showChangePasswordSuccess(message) {
  elements.changePasswordError.textContent = message;
  elements.changePasswordError.style.background = 'rgba(76, 175, 80, 0.15)';
  elements.changePasswordError.style.borderColor = 'rgba(76, 175, 80, 0.4)';
  elements.changePasswordError.style.color = '#66BB6A';
  elements.changePasswordError.classList.add('is-visible');
}

function openChangePasswordModal() {
  console.log('Opening change password modal', elements.changePasswordModal);
  if (!elements.changePasswordModal) {
    console.error('Change password modal not found');
    return;
  }
  elements.changePasswordForm.reset();
  hideChangePasswordError();
  if (typeof elements.changePasswordModal.showModal === 'function') {
    elements.changePasswordModal.showModal();
  } else {
    elements.changePasswordModal.setAttribute('open', 'true');
  }
}

function closeChangePasswordModal() {
  if (!elements.changePasswordModal) return;
  if (typeof elements.changePasswordModal.close === 'function') {
    elements.changePasswordModal.close();
  } else {
    elements.changePasswordModal.removeAttribute('open');
  }
}

async function handleChangePasswordSubmit(event) {
  event.preventDefault();
  hideChangePasswordError();

  const currentPassword = elements.currentPassword.value;
  const newPassword = elements.newPassword.value;
  const confirmPassword = elements.confirmNewPassword.value;

  if (!currentPassword || !newPassword || !confirmPassword) {
    showChangePasswordError('Alle felter er påkrævet');
    return;
  }

  if (newPassword !== confirmPassword) {
    showChangePasswordError('De nye adgangskoder matcher ikke');
    return;
  }

  if (newPassword.length < 6) {
    showChangePasswordError('Ny adgangskode skal være mindst 6 tegn');
    return;
  }

  if (currentPassword === newPassword) {
    showChangePasswordError('Ny adgangskode skal være forskellig fra den nuværende');
    return;
  }

  elements.changePasswordSubmit.disabled = true;
  elements.changePasswordSubmit.textContent = 'Skifter...';

  try {
    const { error: signInError } = await signIn(currentUser.email, currentPassword);
    if (signInError) {
      showChangePasswordError('Nuværende adgangskode er forkert');
      elements.changePasswordSubmit.disabled = false;
      elements.changePasswordSubmit.textContent = 'Skift adgangskode';
      return;
    }

    const { error } = await updatePassword(newPassword);
    if (error) {
      showChangePasswordError('Der opstod en fejl. Prøv igen.');
      console.error('Password update error:', error);
    } else {
      showChangePasswordSuccess('Adgangskode opdateret!');
      setTimeout(() => {
        closeChangePasswordModal();
      }, 1500);
    }
  } catch (error) {
    showChangePasswordError('Der opstod en uventet fejl');
    console.error('Password change error:', error);
  } finally {
    elements.changePasswordSubmit.disabled = false;
    elements.changePasswordSubmit.textContent = 'Skift adgangskode';
  }
}

async function init() {
  // Check if this is a password recovery link
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const type = hashParams.get('type');

  if (type === 'recovery') {
    // Mark that we're in recovery mode
    isRecoveryMode = true;
    showResetPasswordView();
  }

  // Set up auth state listener
  onAuthStateChange(handleAuthStateChange);

  // If we're in recovery mode, don't check for existing session
  if (isRecoveryMode) {
    // Set up event listeners
    setupEventListeners();
    return;
  }

  const { user } = await getCurrentUser();
  if (user) {
    currentUser = user;
    elements.userEmail.textContent = user.email;
    showAppView();
    await loadAndRenderGoals();
  } else {
    showAuthView();
  }

  setupEventListeners();
}

function setupEventListeners() {
  if (elements.authForm) {
    elements.authForm.addEventListener("submit", handleAuthSubmit);
  }
  if (elements.authToggleBtn) {
    elements.authToggleBtn.addEventListener("click", toggleAuthMode);
  }
  if (elements.forgotPasswordBtn) {
    elements.forgotPasswordBtn.addEventListener("click", handleForgotPassword);
  }
  if (elements.resetPasswordForm) {
    elements.resetPasswordForm.addEventListener("submit", handleResetPasswordSubmit);
  }
  if (elements.changePasswordBtn) {
    elements.changePasswordBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openChangePasswordModal();
    });
  }
  if (elements.changePasswordClose) {
    elements.changePasswordClose.addEventListener("click", (e) => {
      e.preventDefault();
      closeChangePasswordModal();
    });
  }
  if (elements.changePasswordForm) {
    elements.changePasswordForm.addEventListener("submit", handleChangePasswordSubmit);
  }
  if (elements.changePasswordModal) {
    elements.changePasswordModal.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeChangePasswordModal();
    });
  }
  if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      await handleLogout();
    });
  }
  if (elements.goalForm) {
    elements.goalForm.addEventListener("submit", handleFormSubmit);
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
