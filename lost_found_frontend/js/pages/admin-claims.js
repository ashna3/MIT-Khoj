/**
 * MIT KHOJ - Admin Manage Claims Page Script
 */

let allClaims = [];

document.addEventListener('DOMContentLoaded', async () => {
  protectPage('admin');

  const user = getCurrentUser();
  ensureLostReportsNav();
  document.getElementById('sidebar-user-name').textContent = user.name;
  document.getElementById('sidebar-user-reg-no').textContent = getUserIdentifier(user);
  document.getElementById('topbar-user-name').textContent = user.name;

  document.getElementById('logout-btn').addEventListener('click', logout);

  await loadClaims();

  document.getElementById('status-filter').addEventListener('change', filterClaims);
  document.getElementById('search-input').addEventListener('input', filterClaims);

  setActiveNavLink('admin_claims.html');
});

async function loadClaims() {
  try {
    showSpinner();
    const response = await apiGet('/api/admin/claims');
    hideSpinner();

    allClaims = response.data || [];
    allClaims.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(b.claim_date) - new Date(a.claim_date);
    });

    filterClaims();
  } catch (error) {
    hideSpinner();
    showToast(getApiMessage(error.data, 'Failed to load claims'), 'error');
    console.error('Load claims error:', error);
  }
}

function filterClaims() {
  const status = document.getElementById('status-filter').value;
  const search = document.getElementById('search-input').value.toLowerCase();

  const filtered = allClaims.filter((claim) => {
    const matchStatus = !status || claim.status === status;
    const matchSearch = !search || claim.claimant_name.toLowerCase().includes(search);
    return matchStatus && matchSearch;
  });

  renderClaims(filtered);
}

function renderClaims(claims) {
  const tbody = document.getElementById('claims-tbody');

  if (claims.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 40px;">
          <div class="empty-state">
            <div class="empty-state-icon">Empty</div>
            <div class="empty-state-title">No claims found</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = claims
    .map(
      (claim) => `
    <tr>
      <td>#${claim.claim_id}</td>
      <td>${escapeHtml(claim.item_title)}</td>
      <td>${escapeHtml(claim.claimant_name)}</td>
      <td>${escapeHtml(claim.reg_no)}</td>
      <td>${formatDate(claim.claim_date)}</td>
      <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        <span title="${escapeHtml(claim.proof_description)}">
          ${escapeHtml((claim.proof_description || '').substring(0, 50))}${(claim.proof_description || '').length > 50 ? '...' : ''}
        </span>
      </td>
      <td>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="progress-bar" style="flex: 1; min-width: 80px;">
            <div
              class="progress-fill"
              style="width: ${claim.ownership_score || 0}%; background-color: ${getScoreColor(claim.ownership_score || 0)};"
            ></div>
          </div>
          <span style="font-weight: 500; min-width: 35px; font-size: 12px;">${claim.ownership_score || 0}%</span>
        </div>
      </td>
      <td>
        <span class="badge badge-${claim.status}">
          ${claim.status}
        </span>
      </td>
      <td>
        ${claim.status === 'pending' ? `
          <div style="display: flex; gap: 8px;">
            <button
              class="btn btn-primary"
              style="font-size: 12px; padding: 4px 8px; height: auto;"
              onclick="approveClaim(${claim.claim_id})"
            >
              Approve
            </button>
            <button
              class="btn btn-danger"
              style="font-size: 12px; padding: 4px 8px; height: auto;"
              onclick="rejectClaim(${claim.claim_id})"
            >
              Reject
            </button>
          </div>
        ` : '-'}
      </td>
    </tr>
  `
    )
    .join('');
}

function getScoreColor(score) {
  if (score >= 70) return '#28A745';
  if (score >= 40) return '#FFC107';
  return '#DC3545';
}

async function approveClaim(claimId) {
  const confirmed = await showConfirmation('Approve this claim?');
  if (!confirmed) return;

  try {
    showSpinner();
    await apiPatch(`/api/admin/claims/${claimId}`, { status: 'approved' });
    hideSpinner();
    showToast('Claim approved successfully', 'success');
    await loadClaims();
  } catch (error) {
    hideSpinner();
    showToast(getApiMessage(error.data, 'Failed to approve claim'), 'error');
  }
}

async function rejectClaim(claimId) {
  const confirmed = await showConfirmation('Reject this claim?');
  if (!confirmed) return;

  try {
    showSpinner();
    await apiPatch(`/api/admin/claims/${claimId}`, { status: 'rejected' });
    hideSpinner();
    showToast('Claim rejected successfully', 'success');
    await loadClaims();
  } catch (error) {
    hideSpinner();
    showToast(getApiMessage(error.data, 'Failed to reject claim'), 'error');
  }
}

function setActiveNavLink(pageName) {
  document.querySelectorAll('.sidebar-nav-link').forEach((link) => {
    if (link.href.includes(pageName)) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

function ensureLostReportsNav() {
  const nav = document.querySelector('.sidebar-nav');
  if (!nav) return;

  const alreadyPresent = Array.from(nav.querySelectorAll('a')).some((link) =>
    (link.getAttribute('href') || '').includes('admin_lost_reports.html')
  );
  if (alreadyPresent) return;

  const claimsItem = Array.from(nav.querySelectorAll('.sidebar-nav-item')).find((item) =>
    item.textContent.includes('Manage Claims')
  );
  const lostReportsItem = document.createElement('li');
  lostReportsItem.className = 'sidebar-nav-item';
  lostReportsItem.innerHTML = '<a href="admin_lost_reports.html" class="sidebar-nav-link">Lost Reports</a>';

  if (claimsItem) {
    claimsItem.insertAdjacentElement('afterend', lostReportsItem);
  } else {
    nav.appendChild(lostReportsItem);
  }
}
