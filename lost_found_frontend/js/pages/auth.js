/**
 * MIT KHOJ - Authentication Page Script
 */

document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupStudentSignin();
  setupAdminSignin();
  setupSignup();
  setupResetPasswordModal();
});

function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      tabButtons.forEach((button) => {
        button.classList.remove('active');
        button.style.color = '#999';
        button.style.borderBottomColor = 'transparent';
      });
      btn.classList.add('active');
      btn.style.color = '#F96E46';
      btn.style.borderBottomColor = '#F96E46';

      tabContents.forEach((content) => {
        content.style.display = 'none';
        content.classList.remove('active');
      });

      const activeContent = document.getElementById(`${tabName}-form`);
      if (activeContent) {
        activeContent.style.display = 'block';
        activeContent.classList.add('active');
      }
    });
  });
}

function setupStudentSignin() {
  const form = document.getElementById('student-signin-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const regNo = document.getElementById('signin-reg-no').value.trim();
    const password = document.getElementById('signin-password').value;

    if (!validateRegNo(regNo)) {
      showToast('Please enter a valid registration number', 'error');
      return;
    }
    if (!password) {
      showToast('Please enter your password', 'error');
      return;
    }

    await submitSignin({ login_type: 'student', reg_no: regNo, password });
  });
}

function setupAdminSignin() {
  const form = document.getElementById('admin-signin-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const adminNo = document.getElementById('signin-admin-no').value.trim();
    const password = document.getElementById('signin-admin-password').value;

    if (!validateRegNo(adminNo)) {
      showToast('Please enter a valid admin number', 'error');
      return;
    }
    if (!password) {
      showToast('Please enter your password', 'error');
      return;
    }

    await submitSignin({ login_type: 'admin', admin_no: adminNo, password });
  });
}

async function submitSignin(payload) {
  try {
    showSpinner();
    const response = await apiPost('/api/auth/login', payload);
    hideSpinner();

    if (!response.success) {
      showToast(getApiMessage(response, 'Sign in failed'), 'error');
      return;
    }

    storeUserSession({
      token: response.data.token,
      role: response.data.user.role,
      name: response.data.user.name,
      reg_no: response.data.user.reg_no || '',
      admin_no: response.data.user.admin_no || '',
    });

    showToast('Sign in successful!', 'success');
    setTimeout(() => {
      window.location.href = response.data.user.role === 'admin'
        ? buildAppUrl('admin_dashboard.html')
        : buildAppUrl('student_dashboard.html');
    }, 500);
  } catch (error) {
    hideSpinner();
    showToast(getApiMessage(error.data, 'Sign in failed. Please try again.'), 'error');
  }
}

function setupSignup() {
  const form = document.getElementById('signup-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value.trim();
    const regNo = document.getElementById('signup-reg-no').value.trim();
    const phone = document.getElementById('signup-phone').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;

    clearFormErrors(form);
    const errors = {};
    if (!validateName(name)) errors.name = 'Name must contain only letters and spaces';
    if (!validateRegNo(regNo)) errors.reg_no = 'Registration number must be alphanumeric';
    if (!validatePhone(phone)) errors.phone = 'Phone must be exactly 10 digits';
    if (!validatePassword(password)) errors.password = 'Password must be at least 8 characters';
    if (password !== confirmPassword) errors.confirm_password = 'Passwords do not match';

    if (Object.keys(errors).length > 0) {
      displayFormErrors(errors, form);
      return;
    }

    try {
      showSpinner();
      const response = await apiPost('/api/auth/register', {
        name,
        reg_no: regNo,
        phone,
        password,
        role: 'student',
      });
      hideSpinner();

      if (response.success) {
        showToast('Account created successfully! Please sign in.', 'success');
        setTimeout(() => {
          document.querySelector('[data-tab="student-signin"]').click();
          document.getElementById('signin-reg-no').value = regNo;
          document.getElementById('signin-password').value = '';
        }, 800);
      } else {
        showToast(getApiMessage(response, 'Sign up failed'), 'error');
      }
    } catch (error) {
      hideSpinner();
      showToast(getApiMessage(error.data, 'Sign up failed. Please try again.'), 'error');
    }
  });
}

function setupResetPasswordModal() {
  const modal = document.getElementById('reset-password-modal');
  const closeBtn = document.getElementById('reset-password-close');
  const form = document.getElementById('reset-password-form');
  const openStudentBtn = document.getElementById('forgot-password-btn');
  const openAdminBtn = document.getElementById('forgot-admin-password-btn');
  const accountType = document.getElementById('reset-account-type');
  const identifierLabel = document.getElementById('reset-identifier-label');
  const identifierInput = document.getElementById('reset-identifier');

  if (!modal || !closeBtn || !form || !accountType || !identifierLabel || !identifierInput) return;

  const syncResetLabel = () => {
    const isAdmin = accountType.value === 'admin';
    identifierLabel.textContent = isAdmin ? 'Admin Number' : 'Registration Number';
    identifierInput.placeholder = isAdmin ? 'Enter your admin number' : 'Enter your registration number';
  };

  const openModalFor = (type) => {
    form.reset();
    clearFormErrors(form);
    accountType.value = type;
    syncResetLabel();
    modal.style.display = 'flex';
  };

  openStudentBtn.addEventListener('click', () => openModalFor('student'));
  openAdminBtn.addEventListener('click', () => openModalFor('admin'));
  accountType.addEventListener('change', syncResetLabel);
  closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors(form);

    const loginType = accountType.value;
    const identifier = identifierInput.value.trim();
    const phone = document.getElementById('reset-phone').value.trim();
    const newPassword = document.getElementById('reset-new-password').value;
    const errors = {};

    if (!validateRegNo(identifier)) errors.identifier = 'Please enter a valid identifier';
    if (!validatePhone(phone)) errors.phone = 'Phone must be exactly 10 digits';
    if (!validatePassword(newPassword)) errors.new_password = 'Password must be at least 8 characters';

    if (Object.keys(errors).length > 0) {
      displayFormErrors(errors, form);
      return;
    }

    const payload = {
      login_type: loginType,
      phone,
      new_password: newPassword,
    };
    if (loginType === 'admin') {
      payload.admin_no = identifier;
    } else {
      payload.reg_no = identifier;
    }

    try {
      showSpinner();
      const response = await apiPost('/api/auth/reset_password', payload);
      hideSpinner();
      showToast(getApiMessage(response, 'Password reset successful'), 'success');
      modal.style.display = 'none';

      if (loginType === 'admin') {
        document.querySelector('[data-tab="admin-signin"]').click();
        document.getElementById('signin-admin-no').value = identifier;
        document.getElementById('signin-admin-password').value = '';
      } else {
        document.querySelector('[data-tab="student-signin"]').click();
        document.getElementById('signin-reg-no').value = identifier;
        document.getElementById('signin-password').value = '';
      }
    } catch (error) {
      hideSpinner();
      showToast(getApiMessage(error.data, 'Failed to reset password'), 'error');
    }
  });

  syncResetLabel();
}
