/**
 * MIT KHOJ - Item Timeline Page Script
 */

const STATUS_COLORS = {
  reported: '#378ADD',
  matched: '#F9C846',
  claimed: '#28A745',
  approved: '#28A745',
  rejected: '#DC3545',
  expired: '#DC3545',
};

const STATUS_ICONS = {
  reported: 'R',
  matched: 'M',
  claimed: 'C',
  approved: 'A',
  rejected: 'X',
  expired: 'E',
};

let trackableItems = [];
const TRACKABLE_ITEMS_REFRESH_KEY = 'trackableItemsRefreshAt';
const TRACKABLE_ITEMS_PLACEHOLDER = '<option value="">Select one of your items</option>';

document.addEventListener('DOMContentLoaded', async () => {
  protectPage('student');

  const user = getCurrentUser();
  document.getElementById('sidebar-user-name').textContent = user.name;
  document.getElementById('sidebar-user-reg-no').textContent = user.reg_no;
  document.getElementById('topbar-user-name').textContent = user.name;

  document.getElementById('logout-btn').addEventListener('click', logout);
  document.getElementById('track-btn').addEventListener('click', handleTrack);
  document.getElementById('item-id-input').addEventListener('change', () => {
    document.getElementById('not-found-state').style.display = 'none';
  });
  window.addEventListener('pageshow', () => {
    refreshTrackableItems();
  });
  window.addEventListener('storage', (event) => {
    if (event.key === TRACKABLE_ITEMS_REFRESH_KEY) {
      refreshTrackableItems();
    }
  });

  await refreshTrackableItems();
  document.getElementById('empty-state').style.display = 'block';
  setActiveNavLink('item_timeline.html');
});

async function loadTrackableItems() {
  try {
    const response = await apiGet('/api/items/my_trackable');
    trackableItems = response.data || [];

    const select = document.getElementById('item-id-input');
    select.innerHTML = TRACKABLE_ITEMS_PLACEHOLDER;
    trackableItems.forEach((item) => {
      const option = document.createElement('option');
      option.value = item.item_id;
      option.textContent = `#${item.item_id} - ${item.title} (${item.status})`;
      select.appendChild(option);
    });
  } catch (error) {
    showToast(getApiMessage(error.data, 'Failed to load your items'), 'error');
  }
}

async function refreshTrackableItems() {
  const select = document.getElementById('item-id-input');
  const previousValue = select.value;

  await loadTrackableItems();

  const stillTrackable = trackableItems.some((item) => String(item.item_id) === previousValue);
  if (stillTrackable) {
    select.value = previousValue;
    return;
  }

  select.value = '';
  document.getElementById('timeline-section').style.display = 'none';
  document.getElementById('not-found-state').style.display = 'none';
  document.getElementById('empty-state').style.display = 'block';
}

async function handleTrack() {
  const itemId = document.getElementById('item-id-input').value.trim();
  if (!itemId) {
    showToast('Please select one of your items', 'error');
    return;
  }

  try {
    showSpinner();
    const [timelineResponse, itemResponse] = await Promise.all([
      apiGet(`/api/items/${itemId}/timeline`),
      apiGet(`/api/items/${itemId}`),
    ]);
    hideSpinner();

    renderTimeline(itemResponse.data, timelineResponse.data);
    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('not-found-state').style.display = 'none';
    document.getElementById('timeline-section').style.display = 'block';
  } catch (error) {
    hideSpinner();
    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('timeline-section').style.display = 'none';
    document.getElementById('not-found-state').style.display = 'block';
    if (error.status !== 404) {
      showToast(getApiMessage(error.data, 'Failed to load timeline'), 'error');
    }
  }
}

function renderTimeline(item, events) {
  document.getElementById('timeline-item-title').textContent = item.title;
  document.getElementById('timeline-item-status').textContent = item.status;
  document.getElementById('timeline-item-status').className = `badge badge-${item.status}`;

  const container = document.getElementById('timeline-container');
  if (!events || events.length === 0) {
    container.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <div class="empty-state-icon">Info</div>
          <div class="empty-state-title">No history available</div>
          <div class="empty-state-message">This item has no status changes yet</div>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = events
    .map((event, index) => {
      const status = event.new_status || event.status;
      const color = STATUS_COLORS[status] || '#888';
      const icon = STATUS_ICONS[status] || '*';
      const isLast = index === events.length - 1;

      return `
      <div style="display: flex; gap: 20px; margin-bottom: 24px; position: relative;">
        ${!isLast ? `<div style="position: absolute; left: 11px; top: 40px; width: 2px; height: calc(100% + 24px); background-color: ${color};"></div>` : ''}
        <div style="width: 24px; height: 24px; border-radius: 50%; background-color: ${color}; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; flex-shrink: 0; margin-top: 2px;">
          ${icon}
        </div>
        <div style="flex: 1; padding-top: 2px;">
          <div style="font-weight: 600; color: #0B132B; margin-bottom: 4px; text-transform: capitalize;">${status}</div>
          <div style="font-size: 14px; color: #666; margin-bottom: 4px;">${event.event_note || 'Status changed'}</div>
          <div style="font-size: 12px; color: #999;">${formatDateTime(event.changed_at)}</div>
        </div>
      </div>
    `;
    })
    .join('');
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
