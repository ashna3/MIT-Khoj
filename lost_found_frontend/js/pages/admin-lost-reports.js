/**
 * MIT KHOJ - Admin Lost Reports Page Script
 */

document.addEventListener('DOMContentLoaded', async () => {
  protectPage('admin');

  const user = getCurrentUser();
  ensureLostReportsNav();
  document.getElementById('sidebar-user-name').textContent = user.name;
  document.getElementById('sidebar-user-reg-no').textContent = getUserIdentifier(user);
  document.getElementById('topbar-user-name').textContent = user.name;
  document.getElementById('logout-btn').addEventListener('click', logout);

  await loadLostReports();
  setActiveNavLink('admin_lost_reports.html');
});

async function loadLostReports() {
  try {
    showSpinner();
    const response = await apiGet('/api/admin/lost_reports');
    hideSpinner();
    renderLostReports(response.data || []);
  } catch (error) {
    hideSpinner();
    showToast(getApiMessage(error.data, 'Failed to load lost reports'), 'error');
  }
}

function renderLostReports(reports) {
  const tbody = document.getElementById('lost-reports-tbody');
  if (!reports.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px;">No lost reports found</td></tr>';
    return;
  }

  tbody.innerHTML = reports.map((report) => `
    <tr>
      <td>#${report.lost_id}</td>
      <td>${escapeHtml(report.title)}</td>
      <td>${escapeHtml(report.reporter_name)}</td>
      <td>${escapeHtml(report.reg_no)}</td>
      <td>${escapeHtml(report.category_name)}</td>
      <td>${formatDate(report.lost_date)}</td>
      <td>${escapeHtml(report.lost_location)}</td>
      <td><span class="badge badge-${report.status}">${report.status}</span></td>
      <td>${formatDateTime(report.reported_at)}</td>
    </tr>
  `).join('');
}

function setActiveNavLink(pageName) {
  document.querySelectorAll('.sidebar-nav-link').forEach((link) => {
    if (link.href.includes(pageName)) link.classList.add('active');
    else link.classList.remove('active');
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
