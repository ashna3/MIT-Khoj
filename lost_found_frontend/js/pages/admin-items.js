/**
 * MIT KHOJ - Admin Manage Items Page Script
 */

const CAMPUS_LOCATIONS = [
  'MIT Library - Ground Floor',
  'MIT Library - First Floor',
  'MIT Library - Reading Room',
  'MIT Library - Entrance Desk',
  'Food Court 2 near B20',
  'Food Court 1 near Student Plaza',
  'Student Plaza',
  'HP Workshop Building - Lab 1',
  'HP Workshop Building - Lab 2',
  'Ashtanga Building Entrance',
  'Ashtanga Building - Lab 1',
  'Abhimanyu Building - Lab 1',
  'AB1',
  'AB2',
  'AB3',
  'AB4 Seminar Hall',
  'B1 Lecture Hall',
  'B2 Lecture Hall',
  'B3 Lecture Hall',
  'B5 Lab Block Corridor',
  'Boys Hostel - Ashtanga Lobby',
  'Girls Hostel - Abhimanyu Block',
  'MIT Ground Stands',
  'MIT Cricket Ground',
  'Football Ground Bleachers',
  'Hockey Ground',
  'Basketball Court near B6',
  'Tennis Court',
  'Swimming Pool Area',
  'Main Parking near ABS',
  'Two-Wheeler Parking near Mess',
  'Main Gate - Security Booth',
  'Block 1',
  'Block 2',
  'Block 3',
  'Block 4',
  'Block 5',
  'Block 6',
  'Block 7',
  'Block 8',
  'Block 9',
  'Block 10',
  'Block 11',
  'Block 12',
  'Block 13',
  'Block 14',
  'Block 15',
  'Block 16',
  'Block 17',
  'Block 18',
  'Block 19',
  'Block 20',
  'Block 21',
  'Block 22',
  'Other',
];

let allItems = [];
let categories = [];

document.addEventListener('DOMContentLoaded', async () => {
  protectPage('admin');

  const user = getCurrentUser();
  ensureLostReportsNav();
  document.getElementById('sidebar-user-name').textContent = user.name;
  document.getElementById('sidebar-user-reg-no').textContent = getUserIdentifier(user);
  document.getElementById('topbar-user-name').textContent = user.name;

  document.getElementById('logout-btn').addEventListener('click', logout);

  await populateDropdowns();
  await loadItems();

  document.getElementById('status-filter').addEventListener('change', filterItems);
  document.getElementById('category-filter').addEventListener('change', filterItems);
  document.getElementById('location-filter').addEventListener('change', filterItems);
  document.getElementById('date-from').addEventListener('change', filterItems);
  document.getElementById('date-to').addEventListener('change', filterItems);

  setActiveNavLink('admin_items.html');
});

async function populateDropdowns() {
  const response = await apiGet('/api/items/categories');
  categories = response.data || [];

  const categorySelect = document.getElementById('category-filter');
  categories.forEach((cat) => {
    const option = document.createElement('option');
    option.value = cat.category_id;
    option.textContent = cat.category_name;
    categorySelect.appendChild(option);
  });

  const locationSelect = document.getElementById('location-filter');
  CAMPUS_LOCATIONS.forEach((loc) => {
    const option = document.createElement('option');
    option.value = loc;
    option.textContent = loc;
    locationSelect.appendChild(option);
  });
}

async function loadItems() {
  try {
    showSpinner();
    const response = await apiGet('/api/admin/items');
    hideSpinner();

    allItems = response.data || [];
    filterItems();
  } catch (error) {
    hideSpinner();
    showToast(getApiMessage(error.data, 'Failed to load items'), 'error');
    console.error('Load items error:', error);
  }
}

function filterItems() {
  const status = document.getElementById('status-filter').value;
  const category = document.getElementById('category-filter').value;
  const location = document.getElementById('location-filter').value;
  const dateFrom = document.getElementById('date-from').value;
  const dateTo = document.getElementById('date-to').value;

  const filtered = allItems.filter((item) => {
    const matchStatus = !status || item.status === status;
    const matchCategory = !category || item.category_id == category;
    const matchLocation = !location || item.location_found === location;
    const matchDateFrom = !dateFrom || new Date(item.reported_date) >= new Date(dateFrom);
    const matchDateTo = !dateTo || new Date(item.reported_date) <= new Date(dateTo + 'T23:59:59');

    return matchStatus && matchCategory && matchLocation && matchDateFrom && matchDateTo;
  });

  renderItems(filtered);
}

function renderItems(items) {
  const tbody = document.getElementById('items-tbody');

  if (items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px;">
          <div class="empty-state">
            <div class="empty-state-icon">Empty</div>
            <div class="empty-state-title">No items found</div>
            <div class="empty-state-message">Try adjusting your filters</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = items
    .map(
      (item) => `
    <tr>
      <td>#${item.item_id}</td>
      <td>${escapeHtml(item.title)}</td>
      <td>${escapeHtml(item.category_name || getCategoryName(item.category_id))}</td>
      <td>${escapeHtml(item.location_found)}</td>
      <td>${formatDate(item.reported_date)}</td>
      <td>
        <select
          class="status-select"
          data-item-id="${item.item_id}"
          style="padding: 4px 8px; border-radius: 4px; border: 1px solid #ccc; font-size: 12px;"
        >
          <option value="unclaimed" ${item.status === 'unclaimed' ? 'selected' : ''}>Unclaimed</option>
          <option value="matched" ${item.status === 'matched' ? 'selected' : ''}>Matched</option>
          <option value="claimed" ${item.status === 'claimed' ? 'selected' : ''}>Claimed</option>
          <option value="expired" ${item.status === 'expired' ? 'selected' : ''}>Expired</option>
        </select>
      </td>
      <td>${escapeHtml(item.reporter_name || '-')}</td>
      <td>
        <button
          class="btn btn-danger"
          style="font-size: 12px; padding: 4px 8px; height: auto;"
          onclick="deleteItem(${item.item_id})"
        >
          Delete
        </button>
      </td>
    </tr>
  `
    )
    .join('');

  document.querySelectorAll('.status-select').forEach((select) => {
    select.addEventListener('change', async (e) => {
      const itemId = e.target.getAttribute('data-item-id');
      await updateItemStatus(itemId, e.target.value);
    });
  });
}

async function updateItemStatus(itemId, newStatus) {
  try {
    showSpinner();
    await apiPatch(`/api/items/${itemId}`, { status: newStatus });
    hideSpinner();

    showToast('Item status updated successfully', 'success');
    await loadItems();
  } catch (error) {
    hideSpinner();
    showToast(getApiMessage(error.data, 'Failed to update item status'), 'error');
    await loadItems();
  }
}

async function deleteItem(itemId) {
  const confirmed = await showConfirmation('Are you sure you want to delete this item?');
  if (!confirmed) return;

  try {
    showSpinner();
    await apiDelete(`/api/items/${itemId}`);
    hideSpinner();
    showToast('Item deleted successfully', 'success');
    await loadItems();
  } catch (error) {
    hideSpinner();
    showToast(getApiMessage(error.data, 'Failed to delete item'), 'error');
  }
}

function getCategoryName(categoryId) {
  const cat = categories.find((c) => c.category_id == categoryId);
  return cat ? cat.category_name : 'Unknown';
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
