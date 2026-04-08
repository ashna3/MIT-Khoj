/**
 * MIT KHOJ - Browse Found Items Page Script
 */

let allItems = [];
let currentItemForClaim = null;
let categories = [];
let myClaimsByItemId = new Map();

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

document.addEventListener('DOMContentLoaded', async () => {
  protectPage('student');

  const user = getCurrentUser();
  document.getElementById('sidebar-user-name').textContent = user.name;
  document.getElementById('sidebar-user-reg-no').textContent = user.reg_no;
  document.getElementById('topbar-user-name').textContent = user.name;

  document.getElementById('logout-btn').addEventListener('click', logout);

  await populateDropdowns();
  await loadClaims();
  await loadItems();
  maybeOpenClaimFromQuery();

  document.getElementById('search-input').addEventListener('input', filterItems);
  document.getElementById('category-filter').addEventListener('change', filterItems);
  document.getElementById('location-filter').addEventListener('change', filterItems);
  document.getElementById('status-filter').addEventListener('change', filterItems);

  setupClaimModal();
  setActiveNavLink('browse_items.html');
});

function maybeOpenClaimFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const claimItemId = params.get('claim_item');
  if (!claimItemId) return;

  const item = allItems.find((entry) => String(entry.item_id) === String(claimItemId));
  if (!item) {
    showToast('Matched item could not be loaded.', 'error');
    return;
  }

  const existingClaim = myClaimsByItemId.get(String(item.item_id));
  if (existingClaim) {
    showToast('Claim request submitted. Waiting admin approval.', 'success');
    return;
  }

  if (item.status === 'claimed' || item.status === 'expired') {
    showToast('This item is no longer available to claim.', 'error');
    return;
  }

  openClaimModal(item.item_id, item.title, item.location_found);
}

async function populateDropdowns() {
  const categoriesResponse = await apiGet('/api/items/categories');
  categories = categoriesResponse.data || [];

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

async function loadClaims() {
  const response = await apiGet('/api/claims/my');
  myClaimsByItemId = new Map((response.data || []).map((claim) => [String(claim.item_id), claim]));
}

async function loadItems() {
  try {
    showSpinner();
    const response = await apiGet('/api/items');
    hideSpinner();

    allItems = response.data || [];
    filterItems();
  } catch (error) {
    hideSpinner();
    showToast('Failed to load items', 'error');
    console.error('Load items error:', error);
  }
}

function filterItems() {
  const search = document.getElementById('search-input').value.toLowerCase();
  const category = document.getElementById('category-filter').value;
  const location = document.getElementById('location-filter').value;
  const status = document.getElementById('status-filter').value;

  const filtered = allItems.filter((item) => {
    const matchSearch = !search || item.title.toLowerCase().includes(search) || item.description.toLowerCase().includes(search);
    const matchCategory = !category || item.category_id == category;
    const matchLocation = !location || item.location_found === location;
    const matchStatus = !status || item.status === status;
    return matchSearch && matchCategory && matchLocation && matchStatus;
  });

  renderItems(filtered);
}

function renderItems(items) {
  const grid = document.getElementById('items-grid');

  if (items.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">Search</div>
        <div class="empty-state-title">No items found</div>
        <div class="empty-state-message">Try adjusting your filters</div>
      </div>
    `;
    return;
  }

  grid.innerHTML = items
    .map((item) => {
      const existingClaim = myClaimsByItemId.get(String(item.item_id));
      const isInactive = item.status === 'claimed' || item.status === 'expired';
      const showClaimedButton = !!existingClaim;

      let actionMarkup = '';
      if (showClaimedButton) {
        actionMarkup = `
          <button
            class="btn"
            style="width: 100%; background-color: #e0e0e0; color: #666; cursor: not-allowed;"
            disabled
            title="Claim request submitted. Waiting admin approval."
          >
            Claimed
          </button>
        `;
      } else if (!isInactive) {
        actionMarkup = `
          <button
            class="btn btn-primary"
            style="width: 100%;"
            onclick="openClaimModal(${item.item_id}, '${escapeHtml(item.title)}', '${escapeHtml(item.location_found)}')"
          >
            Claim This Item
          </button>
        `;
      } else {
        actionMarkup = `
          <div style="width: 100%; text-align: center; padding: 10px 12px; background-color: #f3f3f3; color: #777; border-radius: 8px; font-size: 14px;">
            ${item.status === 'claimed' ? 'Already claimed' : 'Expired'}
          </div>
        `;
      }

      return `
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

          <div style="display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
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

          ${actionMarkup}
        </div>
      `;
    })
    .join('');
}

function getCategoryName(categoryId) {
  const cat = categories.find((c) => c.category_id == categoryId);
  return cat ? cat.category_name : 'Unknown';
}

function openClaimModal(itemId, itemTitle, itemLocation) {
  currentItemForClaim = itemId;
  document.getElementById('claim-item-title').textContent = itemTitle;
  document.getElementById('claim-item-location').textContent = itemLocation;
  document.getElementById('claim-form').reset();
  document.getElementById('claim-modal').style.display = 'flex';
}

function setupClaimModal() {
  const modal = document.getElementById('claim-modal');
  const closeBtn = document.getElementById('claim-modal-close');
  const form = document.getElementById('claim-form');

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

      const response = await apiPost('/api/claims', {
        item_id: currentItemForClaim,
        proof_description: proofDescription,
      });

      hideSpinner();
      document.getElementById('claim-modal').style.display = 'none';

      myClaimsByItemId.set(String(currentItemForClaim), {
        item_id: currentItemForClaim,
        status: 'pending',
      });
      filterItems();

      showToast('Claim request submitted. Waiting admin approval.', 'success');
      showOwnershipScore(response.data?.ownership_score ?? 0);
    } catch (error) {
      hideSpinner();
      const message = getApiMessage(error.data, 'Failed to submit claim');
      if (message === 'Claim request submitted. Waiting admin approval.') {
        myClaimsByItemId.set(String(currentItemForClaim), {
          item_id: currentItemForClaim,
          status: 'pending',
        });
        document.getElementById('claim-modal').style.display = 'none';
        filterItems();
      }
      showToast(message, message.includes('Waiting admin approval') ? 'success' : 'error');
    }
  });
}

function showOwnershipScore(score) {
  const modal = document.getElementById('score-modal');
  const fill = document.getElementById('score-fill');
  const value = document.getElementById('score-value');
  const message = document.getElementById('score-message');

  fill.style.width = score + '%';
  value.textContent = score;

  if (score >= 70) {
    message.textContent = 'Strong match: your claim has been submitted for review';
    fill.style.backgroundColor = '#28A745';
  } else if (score >= 40) {
    message.textContent = 'Partial match: admin will review your claim';
    fill.style.backgroundColor = '#FFC107';
  } else {
    message.textContent = 'Weak match: admin will still review your claim';
    fill.style.backgroundColor = '#DC3545';
  }

  modal.style.display = 'flex';

  const closeBtn = document.getElementById('score-modal-close');
  const closeModalBtn = document.getElementById('score-close-btn');
  const closeModal = () => {
    modal.style.display = 'none';
  };

  closeBtn.onclick = closeModal;
  closeModalBtn.onclick = closeModal;
  modal.onclick = (e) => {
    if (e.target === modal) closeModal();
  };
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
