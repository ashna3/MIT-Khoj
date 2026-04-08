/**
 * MIT KHOJ - My Lost Reports Page Script
 */

let allReports = [];
let categories = [];
let currentMatchItemId = null;
let currentMatchLostId = null;
const TRACKABLE_ITEMS_REFRESH_KEY = 'trackableItemsRefreshAt';

document.addEventListener('DOMContentLoaded', async () => {
  protectPage('student');

  const user = getCurrentUser();
  document.getElementById('sidebar-user-name').textContent = user.name;
  document.getElementById('sidebar-user-reg-no').textContent = user.reg_no;
  document.getElementById('topbar-user-name').textContent = user.name;
  document.getElementById('logout-btn').addEventListener('click', logout);

  await loadCategories();
  await loadReports();
  setupMatchesModal();
  setupClaimModal();
  setActiveNavLink('my_lost_reports.html');
});

async function loadCategories() {
  const response = await apiGet('/api/items/categories');
  categories = response.data || [];
}

async function loadReports() {
  try {
    showSpinner();
    const response = await apiGet('/api/lost_reports/my');
    hideSpinner();
    allReports = response.data || [];
    renderReports(allReports);
  } catch (error) {
    hideSpinner();
    showToast('Failed to load lost reports', 'error');
    renderEmptyState();
  }
}

function renderReports(reports) {
  const tbody = document.getElementById('reports-tbody');
  if (reports.length === 0) {
    renderEmptyState();
    return;
  }

  tbody.innerHTML = reports.map((report) => `
    <tr>
      <td>${escapeHtml(report.title)}</td>
      <td>${getCategoryName(report.category_id)}</td>
      <td>${formatDate(report.lost_date)}</td>
      <td>${escapeHtml(report.lost_location)}</td>
      <td><span class="badge badge-${report.status}">${report.status}</span></td>
      <td>
        ${report.status === 'closed'
          ? '<button class="btn btn-secondary" style="font-size: 12px; padding: 6px 12px; height: auto; background-color: #d9d9d9; color: #666; cursor: not-allowed;" disabled>Resolved</button>'
          : `
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button class="btn btn-secondary" style="font-size: 12px; padding: 6px 12px; height: auto;" onclick="openMatchesModal(${report.lost_id})">View Matches</button>
              <button class="btn btn-danger" style="font-size: 12px; padding: 6px 12px; height: auto;" onclick="removeLostReport(${report.lost_id})">Remove</button>
            </div>
          `}
      </td>
    </tr>
  `).join('');
}

function renderEmptyState() {
  const tbody = document.getElementById('reports-tbody');
  tbody.innerHTML = `
    <tr>
      <td colspan="6" style="text-align: center; padding: 40px;">
        <div class="empty-state">
          <div class="empty-state-icon">Empty</div>
          <div class="empty-state-title">You haven't filed any lost reports yet</div>
          <div class="empty-state-message"><a href="report_lost.html" style="color: #F96E46; text-decoration: none; font-weight: 500;">File a lost report -></a></div>
        </div>
      </td>
    </tr>
  `;
}

async function openMatchesModal(reportId) {
  try {
    const report = allReports.find((entry) => entry.lost_id === reportId);
    if (report && report.status === 'closed') {
      showToast('This lost report is already resolved.', 'success');
      return;
    }

    showSpinner();
    const matchesResponse = await apiGet(`/api/lost_reports/${reportId}/matches`);
    hideSpinner();
    const matches = matchesResponse.data || [];
    const matchesList = document.getElementById('matches-list');

    if (matches.length > 0) {
      matchesList.innerHTML = matches.map((item) => `
        <div class="card">
          <div style="width: 100%; height: 120px; background-color: #e0e0e0; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; color: #999; font-size: 36px;">
            ${item.image_url ? `<img src="${item.image_url}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;" />` : 'Package'}
          </div>
          <h4 style="margin-bottom: 8px;">${escapeHtml(item.title)}</h4>
          <div style="font-size: 12px; color: #666; margin-bottom: 12px;">
            <div><strong>Location:</strong> ${escapeHtml(item.location_found)}</div>
            <div><strong>Date:</strong> ${formatDate(item.reported_date)}</div>
          </div>
          <button class="btn btn-primary" style="width: 100%; font-size: 12px; padding: 6px 12px; height: auto;" onclick="openClaimModal(${reportId}, ${item.item_id}, '${encodeURIComponent(item.title)}', '${encodeURIComponent(item.location_found)}')">
            Claim
          </button>
        </div>
      `).join('');
    } else {
      matchesList.innerHTML = '<div style="grid-column: 1 / -1;"><div class="empty-state"><div class="empty-state-icon">Bell</div><div class="empty-state-title">No matches found yet</div><div class="empty-state-message">You\'ll be notified when a match is found</div></div></div>';
    }

    document.getElementById('matches-modal').style.display = 'flex';
  } catch (error) {
    hideSpinner();
    showToast('Failed to load matches', 'error');
  }
}

async function removeLostReport(reportId) {
  const report = allReports.find((entry) => entry.lost_id === reportId);
  const reportTitle = report ? `"${report.title}"` : 'this lost report';
  const confirmed = window.confirm(`Remove ${reportTitle}? Use this only if you found the item on your own.`);

  if (!confirmed) return;

  try {
    showSpinner();
    const response = await apiDelete(`/api/lost_reports/${reportId}`);
    hideSpinner();

    allReports = allReports.filter((entry) => entry.lost_id !== reportId);
    renderReports(allReports);
    localStorage.setItem(TRACKABLE_ITEMS_REFRESH_KEY, String(Date.now()));
    showToast(getApiMessage(response, 'Lost report removed successfully'), 'success');
  } catch (error) {
    hideSpinner();
    showToast(getApiMessage(error.data, 'Failed to remove lost report'), 'error');
  }
}

function openClaimModal(lostId, itemId, itemTitle, itemLocation) {
  currentMatchLostId = lostId;
  currentMatchItemId = itemId;
  document.getElementById('claim-item-title').textContent = decodeURIComponent(itemTitle);
  document.getElementById('claim-item-location').textContent = decodeURIComponent(itemLocation);
  document.getElementById('claim-form').reset();
  document.getElementById('claim-modal').style.display = 'flex';
}

function setupClaimModal() {
  const modal = document.getElementById('claim-modal');
  document.getElementById('claim-modal-close').addEventListener('click', () => {
    modal.style.display = 'none';
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });
  document.getElementById('claim-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const color = document.getElementById('claim-color').value.trim();
    const location = document.getElementById('claim-location').value.trim();
    const features = document.getElementById('claim-features').value.trim();
    if (!color || !location || !features) {
      showToast('Please fill all fields', 'error');
      return;
    }
    const proofDescription = `Color: ${color}\nLocation: ${location}\nFeatures: ${features}`;
    try {
      showSpinner();
      await apiPost('/api/claims', {
        item_id: currentMatchItemId,
        lost_id: currentMatchLostId,
        proof_description: proofDescription,
      });
      hideSpinner();
      document.getElementById('claim-modal').style.display = 'none';
      document.getElementById('matches-modal').style.display = 'none';
      showToast('Claim request submitted. Waiting admin approval.', 'success');
      await loadReports();
    } catch (error) {
      hideSpinner();
      showToast(getApiMessage(error.data, 'Failed to submit claim'), getApiMessage(error.data, '').includes('Waiting admin approval') ? 'success' : 'error');
      if (getApiMessage(error.data, '').includes('Waiting admin approval')) {
        document.getElementById('claim-modal').style.display = 'none';
        document.getElementById('matches-modal').style.display = 'none';
      }
    }
  });
}

function setupMatchesModal() {
  const modal = document.getElementById('matches-modal');
  const closeBtn = document.getElementById('matches-modal-close');
  closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
}

function getCategoryName(categoryId) {
  const cat = categories.find((c) => c.category_id == categoryId);
  return cat ? cat.category_name : 'Unknown';
}

function setActiveNavLink(pageName) {
  document.querySelectorAll('.sidebar-nav-link').forEach((link) => {
    if (link.href.includes(pageName)) link.classList.add('active');
    else link.classList.remove('active');
  });
}
