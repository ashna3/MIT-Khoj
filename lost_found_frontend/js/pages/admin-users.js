/**
 * MIT KHOJ - Admin User Management Page Script
 */

let allUsers = [];

document.addEventListener('DOMContentLoaded', async () => {
  protectPage('admin');

  const user = getCurrentUser();
  ensureLostReportsNav();
  document.getElementById('sidebar-user-name').textContent = user.name;
  document.getElementById('sidebar-user-reg-no').textContent = getUserIdentifier(user);
  document.getElementById('topbar-user-name').textContent = user.name;

  document.getElementById('logout-btn').addEventListener('click', logout);
  document.getElementById('create-admin-btn').addEventListener('click', openCreateAdminModal);

  await loadUsers();
  setupCreateAdminModal();
  setActiveNavLink('admin_users.html');
});

async function loadUsers() {
  try {
    showSpinner();
    const response = await apiGet('/api/admin/users');
    hideSpinner();

    allUsers = response.data || [];
    renderUsers(allUsers);
  } catch (error) {
    hideSpinner();
    showToast(getApiMessage(error.data, 'Failed to load users'), 'error');
    console.error('Load users error:', error);
  }
}

function renderUsers(users) {
  const adminsTbody = document.getElementById('admins-tbody');
  const studentsTbody = document.getElementById('students-tbody');
  const admins = users.filter((user) => user.role === 'admin');
  const students = users.filter((user) => user.role !== 'admin');

  adminsTbody.innerHTML = admins.length
    ? admins.map((user) => `
        <tr>
          <td>${escapeHtml(user.name)}</td>
          <td>${escapeHtml(user.admin_no || '-')}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="2" style="text-align: center; padding: 24px;">No admins found</td></tr>';

  studentsTbody.innerHTML = students.length
    ? students.map((user) => `
        <tr>
          <td>${escapeHtml(user.name)}</td>
          <td>${escapeHtml(user.reg_no)}</td>
          <td>${user.created_at ? formatDate(user.created_at) : '-'}</td>
          <td>${user.items_found || 0}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div class="progress-bar" style="flex: 1; min-width: 80px;">
                <div class="progress-fill" style="width: ${user.reliability_score || 0}%; background-color: #F96E46;"></div>
              </div>
              <span style="font-weight: 500; min-width: 35px; font-size: 12px;">${user.reliability_score || 0}%</span>
            </div>
          </td>
        </tr>
      `).join('')
    : '<tr><td colspan="5" style="text-align: center; padding: 24px;">No students found</td></tr>';
}

function openCreateAdminModal() {
  document.getElementById('create-admin-modal').style.display = 'flex';
  document.getElementById('create-admin-form').reset();
}

function setupCreateAdminModal() {
  const modal = document.getElementById('create-admin-modal');
  const closeBtn = document.getElementById('create-admin-close');
  const form = document.getElementById('create-admin-form');

  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('admin-name').value.trim();
    const adminNo = document.getElementById('admin-reg-no').value.trim();
    const phone = document.getElementById('admin-phone').value.trim();
    const password = document.getElementById('admin-password').value;

    clearFormErrors(form);
    const errors = {};
    if (!validateName(name)) errors.name = 'Name must contain only letters and spaces';
    if (!validateRegNo(adminNo)) errors.admin_no = 'Admin number must be alphanumeric';
    if (!validatePhone(phone)) errors.phone = 'Phone must be exactly 10 digits';
    if (!validatePassword(password)) errors.password = 'Password must be at least 8 characters';

    if (Object.keys(errors).length > 0) {
      displayFormErrors(errors, form);
      return;
    }

    try {
      showSpinner();
      const response = await apiPost('/api/auth/register', { name, admin_no: adminNo, phone, password, role: 'admin' });
      hideSpinner();

      if (response.success) {
        showToast('Admin account created successfully', 'success');
        modal.style.display = 'none';
        await loadUsers();
      } else {
        showToast(getApiMessage(response, 'Failed to create admin'), 'error');
      }
    } catch (error) {
      hideSpinner();
      showToast(getApiMessage(error.data, 'Failed to create admin'), 'error');
    }
  });
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
