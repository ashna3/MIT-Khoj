/**
 * MIT KHOJ — Student Dashboard Page Script
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

  // Load dashboard data
  await loadDashboardData();

  // Set active nav link
  setActiveNavLink('student_dashboard.html');
});

/**
 * Load dashboard data
 */
async function loadDashboardData() {
  try {
    showSpinner();

    // Fetch claims and lost reports
    const [claimsResponse, lostReportsResponse] = await Promise.all([
      apiGet('/api/claims/my'),
      apiGet('/api/lost_reports/my'),
    ]);

    hideSpinner();

    const claims = claimsResponse.data || [];
    const lostReports = lostReportsResponse.data || [];

    // Calculate stats
    const totalLostReports = lostReports.length;
    const activeClaims = claims.filter((c) => c.status === 'pending').length;
    const itemsRecovered = claims.filter((c) => c.status === 'approved').length;

    // Update summary cards
    document.getElementById('total-lost-reports').textContent = totalLostReports;
    document.getElementById('active-claims').textContent = activeClaims;
    document.getElementById('items-recovered').textContent = itemsRecovered;

    // Build activity feed
    const activities = [];

    // Add claim activities
    claims.forEach((claim) => {
      activities.push({
        type: 'claim',
        title: `Claim submitted for "${claim.item_title}"`,
        status: claim.status,
        date: claim.claim_date,
        icon: '🎯',
      });
    });

    // Add lost report activities
    lostReports.forEach((report) => {
      activities.push({
        type: 'lost_report',
        title: `Lost report filed for "${report.title}"`,
        status: report.status,
        date: report.reported_at || report.lost_date,
        icon: '📝',
      });
    });

    // Sort by date descending and take last 5
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    const recentActivities = activities.slice(0, 5);

    // Render activity feed
    const feedContainer = document.getElementById('activity-feed');

    if (recentActivities.length === 0) {
      feedContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-title">No recent activity</div>
          <div class="empty-state-message">Your recent actions will appear here</div>
        </div>
      `;
    } else {
      feedContainer.innerHTML = recentActivities
        .map(
          (activity) => `
        <div style="
          display: flex;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid #e0e0e0;
        ">
          <div style="font-size: 24px;">${activity.icon}</div>
          <div style="flex: 1;">
            <div style="font-weight: 500; margin-bottom: 4px;">${escapeHtml(activity.title)}</div>
            <div style="
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 12px;
              color: #666;
            ">
              <span class="badge badge-${activity.status}">${activity.status}</span>
              <span>${formatDate(activity.date)}</span>
            </div>
          </div>
        </div>
      `
        )
        .join('');
    }
  } catch (error) {
    hideSpinner();
    showToast('Failed to load dashboard data', 'error');
    console.error('Dashboard error:', error);
  }
}

/**
 * Set active navigation link
 * @param {string} pageName
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
