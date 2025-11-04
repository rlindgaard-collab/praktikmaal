import { supabase } from './supabase.js';

const elements = {
  supervisorContent: document.getElementById('supervisor-content'),
  logoutButton: document.getElementById('logout-supervisor'),
};

let usersData = [];

async function checkSupervisorAuth() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = '/index.html';
    return false;
  }

  const { data: supervisorSession } = await supabase
    .from('supervisor_sessions')
    .select('*')
    .eq('user_id', session.user.id)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (!supervisorSession) {
    alert('Vejledersession er udløbet. Log venligst ind igen.');
    window.location.href = '/index.html';
    return false;
  }

  return true;
}

async function fetchAllUsersWithGoals() {
  try {
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('*')
      .order('created_at', { ascending: false });

    if (goalsError) {
      console.error('Goals error:', goalsError);
      throw goalsError;
    }

    if (!goals || goals.length === 0) {
      usersData = [];
      renderUsersOverview();
      return;
    }

    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*');

    if (profilesError) {
      console.error('Profiles error:', profilesError);
    }

    const profileMap = new Map();
    if (profiles) {
      profiles.forEach(profile => {
        profileMap.set(profile.user_id, profile);
      });
    }

    const userGoalsMap = new Map();

    for (const goal of goals) {
      const userId = goal.user_id;

      if (!userGoalsMap.has(userId)) {
        const profile = profileMap.get(userId);
        userGoalsMap.set(userId, {
          id: userId,
          email: profile?.email || `Bruger ${userId.slice(0, 8)}`,
          goals: []
        });
      }

      userGoalsMap.get(userId).goals.push(goal);
    }

    usersData = Array.from(userGoalsMap.values());
    renderUsersOverview();
  } catch (error) {
    console.error('Error fetching users and goals:', error);
    elements.supervisorContent.innerHTML = `
      <p class="no-goals-message">Der opstod en fejl ved indlæsning af data. Prøv at genindlæse siden.</p>
    `;
  }
}

function renderUsersOverview() {
  if (usersData.length === 0) {
    elements.supervisorContent.innerHTML = `
      <p class="no-goals-message">Ingen brugere med praktikmål fundet.</p>
    `;
    return;
  }

  const usersHTML = usersData.map(user => {
    const goalsHTML = user.goals.map(goal => `
      <div class="goal-item" data-goal-id="${goal.id}">
        <div class="goal-item-header">
          <h4 class="goal-item-title">${escapeHtml(goal.title)}</h4>
          <span class="goal-item-progress">${goal.progress || 0}%</span>
        </div>
        <div class="goal-progress-bar">
          <div class="goal-progress-fill" style="--goal-color: ${goal.color}; width: ${goal.progress || 0}%"></div>
        </div>
        ${goal.description ? `<p class="goal-item-description">${escapeHtml(goal.description)}</p>` : ''}
        <div class="goal-details" data-goal-details="${goal.id}">
          ${goal.reflection ? `
            <div class="goal-detail-section">
              <div class="goal-detail-label">Refleksion</div>
              <div class="goal-detail-content">${escapeHtml(goal.reflection)}</div>
            </div>
          ` : ''}
          ${goal.pdf_name ? `
            <div class="goal-detail-section">
              <div class="goal-detail-label">Vedhæftet fil</div>
              <a href="#" class="goal-file-link" data-pdf-data="${goal.pdf_data}" data-pdf-name="${escapeHtml(goal.pdf_name)}" data-pdf-type="${goal.pdf_type}">
                📎 ${escapeHtml(goal.pdf_name)} (${formatFileSize(goal.pdf_size)})
              </a>
            </div>
          ` : ''}
        </div>
        <div class="expand-indicator">Klik for detaljer ↓</div>
      </div>
    `).join('');

    return `
      <div class="user-card">
        <div class="user-header">
          <div class="user-info">
            <h2>${escapeHtml(user.email)}</h2>
            <p class="user-email">Bruger ID: ${user.id.slice(0, 8)}...</p>
          </div>
          <span class="goals-count">${user.goals.length} mål</span>
        </div>
        <div class="user-goals">
          ${goalsHTML || '<p class="no-goals-message">Ingen mål endnu</p>'}
        </div>
      </div>
    `;
  }).join('');

  elements.supervisorContent.innerHTML = usersHTML;
  attachGoalEventListeners();
}

function attachGoalEventListeners() {
  const goalItems = document.querySelectorAll('.goal-item');

  goalItems.forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('goal-file-link')) {
        e.stopPropagation();
        handleFileDownload(e);
        return;
      }

      const goalId = item.dataset.goalId;
      const detailsElement = document.querySelector(`[data-goal-details="${goalId}"]`);
      const expandIndicator = item.querySelector('.expand-indicator');

      if (detailsElement) {
        const isExpanded = detailsElement.classList.contains('is-expanded');
        detailsElement.classList.toggle('is-expanded');
        expandIndicator.textContent = isExpanded ? 'Klik for detaljer ↓' : 'Luk detaljer ↑';
      }
    });
  });

  const fileLinks = document.querySelectorAll('.goal-file-link');
  fileLinks.forEach(link => {
    link.addEventListener('click', handleFileDownload);
  });
}

function handleFileDownload(e) {
  e.preventDefault();
  e.stopPropagation();

  const link = e.currentTarget;
  const pdfData = link.dataset.pdfData;
  const pdfName = link.dataset.pdfName;
  const pdfType = link.dataset.pdfType;

  if (pdfData) {
    const binaryString = atob(pdfData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: pdfType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = pdfName;
    a.click();
    URL.revokeObjectURL(url);
  }
}

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

async function handleLogout() {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      await supabase
        .from('supervisor_sessions')
        .delete()
        .eq('user_id', session.user.id);
    }

    await supabase.auth.signOut();
    window.location.href = '/index.html';
  } catch (error) {
    console.error('Error logging out:', error);
    alert('Der opstod en fejl ved log ud');
  }
}

async function init() {
  const isAuthorized = await checkSupervisorAuth();
  if (!isAuthorized) return;

  await fetchAllUsersWithGoals();

  if (elements.logoutButton) {
    elements.logoutButton.addEventListener('click', handleLogout);
  }
}

init();
