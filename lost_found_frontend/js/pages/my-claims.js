/**
 * MIT KHOJ — My Claims Page Script
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Protect page - require student role
  protectPage('student');

  // Get current user
  const user = getCurrentUser();

  // Update sidebar and topbar
  document.getElementById('sidebar-user-name').textContent = user.name;
  document.getElementById('sidebar-user-reg-no').textContent = user.reg_no;
  document.getElementById('topbar-user-name').textContent = user.name;

  // Logout button
  document.getElementById('logout-btn').addEventListener('click', logout);

  // Load claims
  await loadClaims();

  // Set active nav link
  setActiveNavLink('my_claims.html');
});

/**
 * Load claims from API
 */
async function loadClaims() {
  try {
    showSpinner();
    const response = await apiGet('/api/claims/my');
    hideSpinner();

    const claims = response.data || [];
    renderClaims(claims);
  } catch (error) {
    hideSpinner();
    showToast('Failed to load claims', 'error');
    console.error('Load claims error:', error);

    // Show empty state
    renderEmptyState();
  }
}

/**
 * Render claims table
 */
function renderClaims(claims) {
  const tbody = document.getElementById('claims-tbody');

  if (claims.length === 0) {
    renderEmptyState();
    return;
  }

  tbody.innerHTML = claims
    .map(
      (claim) => `
    <tr>
      <td>${escapeHtml(claim.item_title)}</td>
      <td>${formatDate(claim.claim_date)}</td>
      <td>
        <div style="margin-bottom: 4px;">
          <div class="progress-bar" style="height: 6px;">
            <div
              class="progress-fill"
              style="width: ${claim.ownership_score}%; background-color: ${getScoreColor(claim.ownership_score)};"
            ></div>
          </div>
        </div>
        <div style="font-size: 12px; font-weight: 500;">
          ${claim.ownership_score}/100
        </div>
      </td>
      <td>
        <span class="badge badge-${claim.status}">
          ${claim.status}
        </span>
      </td>
      <td>
        ${claim.reviewed_at ? formatDateTime(claim.reviewed_at) : '—'}
      </td>
    </tr>
  `
    )
    .join('');
}

/**
 * Get color for ownership score
 */
function getScoreColor(score) {
  if (score >= 70) return '#28A745';
  if (score >= 40) return '#FFC107';
  return '#DC3545';
}

/**
 * Render empty state
 */
function renderEmptyState() {
  const tbody = document.getElementById('claims-tbody');
  tbody.innerHTML = `
    <tr>
      <td colspan="5" style="text-align: center; padding: 40px;">
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <div class="empty-state-title">You haven't submitted any claims yet</div>
          <div class="empty-state-message">
            <a href="browse_items.html" style="color: #F96E46; text-decoration: none; font-weight: 500;">
              Browse found items →
            </a>
          </div>
        </div>
      </td>
    </tr>
  `;
}

/**
 * Set active navigation link
 */
function setActiveNavLink(pageName) {
  document.querySelectorAll('.sidebar-nav-link').forEach((link) => {
    if (link.href.includes(pageName)) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}
