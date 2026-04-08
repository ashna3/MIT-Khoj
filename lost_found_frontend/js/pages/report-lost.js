/**
 * MIT KHOJ - Report Lost Item Page Script
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

let currentReportId = null;
let categories = [];

function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

document.addEventListener('DOMContentLoaded', async () => {
  protectPage('student');

  const user = getCurrentUser();
  document.getElementById('sidebar-user-name').textContent = user.name;
  document.getElementById('sidebar-user-reg-no').textContent = user.reg_no;
  document.getElementById('topbar-user-name').textContent = user.name;

  document.getElementById('logout-btn').addEventListener('click', logout);

  await populateDropdowns();
  setupCategoryToggle();

  document.getElementById('lost-report-form').addEventListener('submit', handleFormSubmit);

  setActiveNavLink('report_lost.html');
});

async function populateDropdowns() {
  const categoriesResponse = await apiGet('/api/items/categories');
  categories = [...(categoriesResponse.data || []), { category_id: 'other', category_name: 'Other' }];

  const categorySelect = document.getElementById('category');
  categories.forEach((cat) => {
    const option = document.createElement('option');
    option.value = cat.category_id;
    option.textContent = cat.category_name;
    categorySelect.appendChild(option);
  });

  const locationSelect = document.getElementById('location-lost');
  CAMPUS_LOCATIONS.forEach((loc) => {
    const option = document.createElement('option');
    option.value = loc;
    option.textContent = loc;
    locationSelect.appendChild(option);
  });

  const dateLostInput = document.getElementById('date-lost');
  const today = getTodayDateString();
  dateLostInput.max = today;
  dateLostInput.value = today;
}

function setupCategoryToggle() {
  const categorySelect = document.getElementById('category');
  const otherGroup = document.getElementById('other-category-group');
  const otherInput = document.getElementById('other-category');

  categorySelect.addEventListener('change', () => {
    const isOther = categorySelect.value === 'other';
    otherGroup.style.display = isOther ? 'block' : 'none';
    otherInput.required = isOther;
    if (!isOther) otherInput.value = '';
  });
}

function validateImageFile(file) {
  if (!file) return null;

  const allowedTypes = ['image/jpeg', 'image/png'];
  if (!allowedTypes.includes(file.type)) {
    return 'Only JPG and PNG images are supported';
  }

  if (file.size > 5 * 1024 * 1024) {
    return 'Image size must be 5MB or less';
  }

  return null;
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const form = document.getElementById('lost-report-form');
  const title = document.getElementById('title').value.trim();
  const description = document.getElementById('description').value.trim();
  const categoryId = document.getElementById('category').value;
  const otherCategory = document.getElementById('other-category').value.trim();
  const lostDate = document.getElementById('date-lost').value;
  const lostLocation = document.getElementById('location-lost').value;
  const imageInput = document.getElementById('image');

  clearFormErrors(form);

  const errors = {};
  if (!title) errors.title = 'Item title is required';
  if (!description) errors.description = 'Description is required';
  if (!categoryId) errors.category_id = 'Category is required';
  if (categoryId === 'other' && !otherCategory) errors.other_category = 'Please enter the category name';
  if (!lostDate) errors.lost_date = 'Date lost is required';
  if (lostDate && lostDate > getTodayDateString()) {
    errors.lost_date = 'Date lost cannot be in the future';
  }
  if (!lostLocation) errors.lost_location = 'Location is required';

  if (Object.keys(errors).length > 0) {
    displayFormErrors(errors, form);
    return;
  }

  const imageError = validateImageFile(imageInput.files[0]);
  if (imageError) {
    showToast(imageError, 'error');
    return;
  }

  try {
    showSpinner();

    const formData = new FormData();
    formData.append('title', title);
    formData.append(
      'description',
      categoryId === 'other' ? `${description}\n\nOther category: ${otherCategory}` : description
    );
    formData.append('category_id', categoryId === 'other' ? '' : categoryId);
    formData.append('other_category', otherCategory);
    formData.append('lost_date', lostDate);
    formData.append('lost_location', lostLocation);

    if (imageInput.files.length > 0) {
      formData.append('image', imageInput.files[0]);
    }

    const response = await apiFetch('/api/lost_reports', {
      method: 'POST',
      body: formData,
    });

    currentReportId = response.data?.lost_id;

    const matchesResponse = await apiGet(`/api/lost_reports/${currentReportId}/matches`);

    hideSpinner();

    if ((matchesResponse.data || []).length > 0) {
      renderMatches(matchesResponse.data);
      document.getElementById('matches-section').style.display = 'block';
      document.getElementById('no-matches-section').style.display = 'none';
    } else {
      document.getElementById('matches-section').style.display = 'none';
      document.getElementById('no-matches-section').style.display = 'block';
    }

    document.getElementById('lost-report-form').style.display = 'none';
    showToast('Lost report filed successfully!', 'success');
  } catch (error) {
    hideSpinner();
    showToast(getApiMessage(error.data, 'Failed to file lost report'), 'error');
    console.error('Report error:', error);
  }
}

function renderMatches(matches) {
  const grid = document.getElementById('matches-grid');

  grid.innerHTML = matches
    .map(
      (item) => `
    <div class="card">
      <div style="
        width: 100%;
        height: 150px;
        background-color: #e0e0e0;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 12px;
        color: #999;
        font-size: 48px;
      ">
        ${item.image_url ? `<img src="${item.image_url}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;" />` : 'Package'}
      </div>

      <h3 style="margin-bottom: 8px;">${escapeHtml(item.title)}</h3>

      <div style="display: flex; gap: 8px; margin-bottom: 8px;">
        <span class="badge" style="background-color: #e0e0e0; color: #0B132B;">
          ${escapeHtml(item.category_name || getCategoryName(item.category_id))}
        </span>
        <span class="badge badge-${item.status}">
          ${item.status}
        </span>
      </div>

      <div style="font-size: 14px; color: #666; margin-bottom: 12px;">
        <div><strong>Location:</strong> ${escapeHtml(item.location_found)}</div>
        <div><strong>Date Found:</strong> ${formatDate(item.reported_date)}</div>
      </div>

      <button
        class="btn btn-primary"
        style="width: 100%;"
        onclick="window.location.href='browse_items.html'"
      >
        View in Browse
      </button>
    </div>
  `
    )
    .join('');
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
