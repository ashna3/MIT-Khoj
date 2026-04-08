/**
 * MIT KHOJ - Admin Analytics Page Script
 */

let charts = {};

document.addEventListener('DOMContentLoaded', async () => {
  protectPage('admin');

  const user = getCurrentUser();
  ensureLostReportsNav();
  document.getElementById('sidebar-user-name').textContent = user.name;
  document.getElementById('sidebar-user-reg-no').textContent = getUserIdentifier(user);
  document.getElementById('topbar-user-name').textContent = user.name;

  document.getElementById('logout-btn').addEventListener('click', logout);
  document.getElementById('refresh-btn').addEventListener('click', loadAnalytics);

  await loadAnalytics();
  setActiveNavLink('admin_analytics.html');
});

async function loadAnalytics() {
  try {
    showSpinner();

    const [
      recoveryRateData,
      monthlyTrendsData,
      locationRiskData,
      statusBreakdownData,
      overlapData,
      alertsData,
      findersData,
      timeToRecoveryData,
    ] = await Promise.all([
      apiGet('/api/analytics/recovery_rate'),
      apiGet('/api/analytics/monthly_trends'),
      apiGet('/api/analytics/location_risk'),
      apiGet('/api/analytics/item_status_breakdown'),
      apiGet('/api/analytics/finder_loser_overlap'),
      apiGet('/api/analytics/zero_match_alerts'),
      apiGet('/api/analytics/top_finders'),
      apiGet('/api/analytics/time_to_recovery'),
    ]);

    hideSpinner();

    const recoveryRate = recoveryRateData.data || [];
    const monthlyTrends = monthlyTrendsData.data || [];
    const locationRisk = locationRiskData.data || [];
    const statusBreakdown = statusBreakdownData.data || [];
    const overlap = overlapData.data || [];
    const alerts = alertsData.data || [];
    const finders = findersData.data || [];
    const timeToRecovery = timeToRecoveryData.data || [];

    document.getElementById('last-updated').textContent = `Last updated: ${new Date().toLocaleTimeString()}`;

    renderStatCards(recoveryRate, timeToRecovery, monthlyTrends, locationRisk);
    renderRecoveryChart(recoveryRate);
    renderTrendsChart(monthlyTrends);
    renderLocationChart(locationRisk);
    renderStatusChart(statusBreakdown);
    renderOverlapTable(overlap);
    renderAlertsTable(alerts);
    renderFindersTable(finders);
  } catch (error) {
    hideSpinner();
    showToast(getApiMessage(error.data, 'Failed to load analytics'), 'error');
    console.error('Analytics error:', error);
  }
}

function renderStatCards(recoveryRate, timeToRecovery, monthlyTrends, locationRisk) {
  const totalRecoveryRate = recoveryRate.length
    ? Math.round(recoveryRate.reduce((sum, cat) => sum + (cat.recovery_rate_pct || 0), 0) / recoveryRate.length)
    : 0;
  document.getElementById('recovery-rate').textContent = totalRecoveryRate + '%';

  const avgTime = timeToRecovery.length
    ? Math.round(timeToRecovery.reduce((sum, cat) => sum + (cat.avg_days_to_recovery || 0), 0) / timeToRecovery.length)
    : 0;
  document.getElementById('avg-recovery-time').textContent = avgTime + ' days';

  const thisMonth = monthlyTrends.length ? monthlyTrends[monthlyTrends.length - 1].items_found || 0 : 0;
  document.getElementById('items-this-month').textContent = thisMonth;

  const peakLocation = locationRisk.length ? locationRisk[0].location_found : '-';
  document.getElementById('peak-location').textContent = peakLocation;
}

function renderRecoveryChart(data) {
  const ctx = document.getElementById('recovery-chart').getContext('2d');
  if (charts.recovery) charts.recovery.destroy();

  charts.recovery = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map((d) => d.category_name),
      datasets: [{ label: 'Recovery Rate (%)', data: data.map((d) => d.recovery_rate_pct), backgroundColor: '#F96E46', borderRadius: 4 }],
    },
    options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } },
  });
}

function renderTrendsChart(data) {
  const ctx = document.getElementById('trends-chart').getContext('2d');
  if (charts.trends) charts.trends.destroy();

  charts.trends = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map((d) => d.month),
      datasets: [
        { label: 'Items Found', data: data.map((d) => d.items_found), borderColor: '#F96E46', backgroundColor: 'rgba(249, 110, 70, 0.1)', tension: 0.4 },
        { label: 'Items Lost', data: data.map((d) => d.items_lost), borderColor: '#FFC107', backgroundColor: 'rgba(249, 200, 70, 0.1)', tension: 0.4 },
      ],
    },
    options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: true } } },
  });
}

function renderLocationChart(data) {
  const ctx = document.getElementById('location-chart').getContext('2d');
  if (charts.location) charts.location.destroy();

  charts.location = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map((d) => (d.location_found || '').substring(0, 20)),
      datasets: [{ label: 'Risk Score', data: data.map((d) => d.risk_score), backgroundColor: '#DC3545', borderRadius: 4 }],
    },
    options: { indexAxis: 'y', responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } } },
  });
}

function renderStatusChart(data) {
  const ctx = document.getElementById('status-chart').getContext('2d');
  if (charts.status) charts.status.destroy();

  const colors = { unclaimed: '#FFC107', matched: '#378ADD', claimed: '#28A745', expired: '#DC3545' };
  charts.status = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.map((d) => d.status),
      datasets: [{ data: data.map((d) => d.count), backgroundColor: data.map((d) => colors[d.status] || '#888') }],
    },
    options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom' } } },
  });
}

function renderOverlapTable(data) {
  const tbody = document.getElementById('overlap-tbody');
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">No data available</td></tr>';
    return;
  }
  tbody.innerHTML = data.map((row) => `
    <tr>
      <td>${escapeHtml(row.name)}</td>
      <td>${escapeHtml(row.reg_no)}</td>
      <td>${row.items_found}</td>
      <td>${row.items_lost}</td>
    </tr>
  `).join('');
}

function renderAlertsTable(data) {
  const tbody = document.getElementById('alerts-tbody');
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No alerts</td></tr>';
    return;
  }
  tbody.innerHTML = data.map((row) => `
    <tr style="background-color: ${row.days_unmatched > 14 ? '#ffe0e0' : 'transparent'};">
      <td>${escapeHtml(row.reporter_name)}</td>
      <td>${escapeHtml(row.title)}</td>
      <td>${escapeHtml(row.category_name)}</td>
      <td>${escapeHtml(row.lost_location)}</td>
      <td><span style="color: ${row.days_unmatched > 14 ? '#DC3545' : '#666'}; font-weight: 500;">${row.days_unmatched}</span></td>
    </tr>
  `).join('');
}

function renderFindersTable(data) {
  const tbody = document.getElementById('finders-tbody');
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No data available</td></tr>';
    return;
  }
  tbody.innerHTML = data.map((row) => `
    <tr>
      <td>${escapeHtml(row.name)}</td>
      <td>${escapeHtml(row.reg_no)}</td>
      <td>${row.items_found}</td>
      <td>${row.successful_claims}</td>
      <td>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="progress-bar" style="flex: 1; min-width: 80px;">
            <div class="progress-fill" style="width: ${row.reliability_score}%; background-color: #F96E46;"></div>
          </div>
          <span style="font-weight: 500; min-width: 35px; font-size: 12px;">${row.reliability_score}%</span>
        </div>
      </td>
    </tr>
  `).join('');
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
