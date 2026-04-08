/**
 * MIT KHOJ - Admin Dashboard Page Script
 */

let dashboardClaims = [];
let activeReviewClaimId = null;

document.addEventListener('DOMContentLoaded', async () => {
  protectPage('admin');

  const user = getCurrentUser();
  ensureLostReportsNav();
  normalizeDashboardLinkText();
  document.getElementById('sidebar-user-name').textContent = user.name;
  document.getElementById('sidebar-user-reg-no').textContent = getUserIdentifier(user);
  document.getElementById('topbar-user-name').textContent = user.name;

  document.getElementById('logout-btn').addEventListener('click', logout);
  document.getElementById('run-matching-btn').addEventListener('click', runSmartMatching);
  document.getElementById('run-expiry-btn').addEventListener('click', runAutoExpiry);

  setupReviewModal();
  await loadDashboardData();
  setActiveNavLink('admin_dashboard.html');
});

async function loadDashboardData() {
  try {
    showSpinner();
    const [itemsResponse, claimsResponse, usersResponse] = await Promise.all([
      apiGet('/api/admin/items'),
      apiGet('/api/admin/claims'),
      apiGet('/api/admin/users'),
    ]);
    hideSpinner();

    const items = extractListPayload(itemsResponse);
    dashboardClaims = extractListPayload(claimsResponse);
    const users = extractListPayload(usersResponse);

    const totalItems = items.length;
    const pendingClaims = dashboardClaims.filter((c) => c.status === 'pending').length;
    const today = new Date().toDateString();
    const claimedToday = dashboardClaims.filter((claim) => claim.status === 'approved' && claim.reviewed_at && new Date(claim.reviewed_at).toDateString() === today).length;
    const activeUsers = users.length;

    document.getElementById('total-items').textContent = totalItems;
    document.getElementById('pending-claims').textContent = pendingClaims;
    document.getElementById('claimed-today').textContent = claimedToday;
    document.getElementById('active-users').textContent = activeUsers;

    renderPendingClaims(dashboardClaims.filter((c) => c.status === 'pending').slice(0, 5));
  } catch (error) {
    hideSpinner();
    showToast(getApiMessage(error.data, 'Failed to load dashboard data'), 'error');
    console.error('Dashboard error:', error);
  }
}

function extractListPayload(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

function ensureLostReportsNav() {
  const nav = document.querySelector('.sidebar-nav');
  if (!nav) return;

  const existingLink = Array.from(nav.querySelectorAll('a')).find(
    (link) => (link.getAttribute('href') || '').includes('admin_lost_reports.html')
  );
  if (existingLink) return;

  const claimsItem = Array.from(nav.querySelectorAll('.sidebar-nav-item')).find((item) =>
    item.textContent.includes('Manage Claims')
  );
  const lostReportsItem = document.createElement('li');
  lostReportsItem.className = 'sidebar-nav-item';
  lostReportsItem.innerHTML = '<a href="admin_lost_reports.html" class="sidebar-nav-link">Lost Reports</a>';

  if (claimsItem && claimsItem.nextSibling) {
    nav.insertBefore(lostReportsItem, claimsItem.nextSibling);
  } else if (claimsItem) {
    nav.appendChild(lostReportsItem);
  } else {
    nav.appendChild(lostReportsItem);
  }
}

function normalizeDashboardLinkText() {
  const claimsLink = Array.from(document.querySelectorAll('a')).find((link) =>
    (link.getAttribute('href') || '').includes('admin_claims.html')
  );
  if (claimsLink && claimsLink.textContent.trim().startsWith('View All')) {
    claimsLink.textContent = 'View All Claims ->';
  }
}

function renderPendingClaims(claims) {
  const tbody = document.getElementById('claims-tbody');
  if (claims.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No pending claims</td></tr>';
    return;
  }

  tbody.innerHTML = claims.map((claim) => `
    <tr>
      <td>#${claim.claim_id}</td>
      <td>${escapeHtml(claim.item_title)}</td>
      <td>${escapeHtml(claim.claimant_name)}</td>
      <td>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="progress-bar" style="flex: 1; min-width: 100px;">
            <div class="progress-fill" style="width: ${claim.ownership_score || 0}%; background-color: ${getScoreColor(claim.ownership_score || 0)};"></div>
          </div>
          <span style="font-weight: 500; min-width: 40px;">${claim.ownership_score || 0}%</span>
        </div>
      </td>
      <td>${formatDate(claim.claim_date)}</td>
      <td><button class="btn btn-primary" style="font-size: 12px; padding: 6px 12px; height: auto;" onclick="openClaimReview(${claim.claim_id})">Review</button></td>
    </tr>
  `).join('');
}

function openClaimReview(claimId) {
  const claim = dashboardClaims.find((entry) => entry.claim_id === claimId);
  if (!claim) {
    showToast('Claim could not be loaded.', 'error');
    return;
  }

  activeReviewClaimId = claimId;
  document.getElementById('review-claim-id').textContent = `#${claim.claim_id}`;
  document.getElementById('review-item-title').textContent = claim.item_title;
  document.getElementById('review-claimant-name').textContent = claim.claimant_name;
  document.getElementById('review-claimant-reg-no').textContent = claim.reg_no;
  document.getElementById('review-claim-date').textContent = formatDate(claim.claim_date);
  document.getElementById('review-claim-score').textContent = `${claim.ownership_score || 0}%`;
  document.getElementById('review-proof-description').textContent = claim.proof_description || '-';
  document.getElementById('claim-review-modal').style.display = 'flex';
}

function setupReviewModal() {
  const modal = document.getElementById('claim-review-modal');
  const closeBtn = document.getElementById('claim-review-close');
  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });
  document.getElementById('review-approve-btn').addEventListener('click', () => reviewClaim('approved'));
  document.getElementById('review-reject-btn').addEventListener('click', () => reviewClaim('rejected'));
}

async function reviewClaim(status) {
  if (!activeReviewClaimId) return;
  try {
    showSpinner();
    await apiPatch(`/api/admin/claims/${activeReviewClaimId}`, { status });
    hideSpinner();
    document.getElementById('claim-review-modal').style.display = 'none';
    showToast(`Claim ${status} successfully`, 'success');
    await loadDashboardData();
  } catch (error) {
    hideSpinner();
    showToast(getApiMessage(error.data, `Failed to ${status === 'approved' ? 'approve' : 'reject'} claim`), 'error');
  }
}

function getScoreColor(score) {
  if (score >= 70) return '#28A745';
  if (score >= 40) return '#FFC107';
  return '#DC3545';
}

async function runSmartMatching() {
  const confirmed = await showConfirmation('This will run the smart matching procedure for all unmatched lost reports. Continue?');
  if (!confirmed) return;
  try {
    showSpinner();
    await apiPost('/api/admin/run_matching');
    hideSpinner();
    showToast('Smart matching completed successfully!', 'success');
    await loadDashboardData();
  } catch (error) {
    hideSpinner();
    showToast(getApiMessage(error.data, 'Failed to run smart matching'), 'error');
  }
}

async function runAutoExpiry() {
  const confirmed = await showConfirmation('This will expire old unclaimed items. Continue?');
  if (!confirmed) return;
  try {
    showSpinner();
    await apiPost('/api/admin/run_expiry');
    hideSpinner();
    showToast('Auto-expiry completed successfully!', 'success');
    await loadDashboardData();
  } catch (error) {
    hideSpinner();
    showToast(getApiMessage(error.data, 'Failed to run auto-expiry'), 'error');
  }
}

function setActiveNavLink(pageName) {
  document.querySelectorAll('.sidebar-nav-link').forEach((link) => {
    if (link.href.includes(pageName)) link.classList.add('active');
    else link.classList.remove('active');
  });
}
