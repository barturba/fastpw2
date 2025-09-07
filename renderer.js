let passwordEntries = [];
let editingIndex = -1;
let masterPassword = null;
let selectedCompany = null;
let selectedEntryIndex = null; // index into passwordEntries
let companyContextMenuEl = null;
let pendingRenameCompany = null;

// DOM elements
const companyList = document.getElementById('companyList');
const loginList = document.getElementById('loginList');
const detailsView = document.getElementById('detailsView');
const detailsHeaderTitle = document.getElementById('detailsHeaderTitle');
const toastEl = document.getElementById('toast');
const loginScreen = document.getElementById('loginScreen');
const loadingScreen = document.getElementById('loadingScreen');
const setupScreen = document.getElementById('setupScreen');
const mainApp = document.getElementById('mainApp');
const masterPasswordInput = document.getElementById('masterPassword');
const setupMasterPasswordInput = document.getElementById('setupMasterPassword');
const setupConfirmPasswordInput = document.getElementById('setupConfirmPassword');
const loginBtn = document.getElementById('loginBtn');
const loginMessage = document.getElementById('loginMessage');
const setupMessage = document.getElementById('setupMessage');
const createMasterBtn = document.getElementById('createMasterBtn');
const addCompanyBtn = document.getElementById('addCompanyBtn');
const newItemBtn = document.getElementById('newItemBtn');
const editDetailsBtn = document.getElementById('editDetailsBtn');
const entryModal = document.getElementById('entryModal');
const discardModal = document.getElementById('discardModal');
const entryForm = document.getElementById('entryForm');
const modalTitle = document.getElementById('modalTitle');
const saveEntryBtn = document.getElementById('saveEntry');
const cancelEntryBtn = document.getElementById('cancelEntry');
const addFieldBtn = document.getElementById('addField');
const deleteLoginBtn = document.getElementById('deleteLogin');
const companyInput = document.getElementById('company');
const fieldsContainer = document.getElementById('fieldsContainer');
const companyGroup = document.getElementById('companyGroup');
const loginNameGroup = document.getElementById('loginNameGroup');
const loginNameInput = document.getElementById('loginName');
const renameCompanyModal = document.getElementById('renameCompanyModal');
const renameCompanyInput = document.getElementById('renameCompanyInput');
const renameCompanySaveBtn = document.getElementById('renameCompanySaveBtn');
const renameCompanyCancelBtn = document.getElementById('renameCompanyCancelBtn');
let modalMode = null; // 'addCompany' | 'addLogin' | 'edit' | null
let modalTargetIndex = null; // used for addField/edit
let formBaseline = null; // snapshot of form values for dirty check

// ---------- UX utilities ----------
const modalPrevFocus = new WeakMap();

function getFocusableElements(container) {
    if (!container) return [];
    const selector = [
        'a[href]', 'area[href]', 'input:not([disabled]):not([type="hidden"])',
        'select:not([disabled])', 'textarea:not([disabled])', 'button:not([disabled])',
        'iframe', 'object', 'embed', '[tabindex]:not([tabindex="-1"])', '[contenteditable]'
    ].join(',');
    const nodes = Array.from(container.querySelectorAll(selector));
    return nodes.filter(el => el.offsetParent !== null);
}

function focusFirstEnabledInput(container) {
    const focusables = getFocusableElements(container);
    const firstInput = focusables.find(el => /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
    const target = firstInput || focusables[0];
    if (target && typeof target.focus === 'function') {
        try { target.focus(); if (target.select) target.select(); } catch (_) {}
    }
}

function initFocusTrap(modalEl) {
    if (!modalEl || modalEl.__trapHandler) return;
    modalPrevFocus.set(modalEl, document.activeElement || null);
    const handler = (e) => {
        if (e.key !== 'Tab') return;
        const focusables = getFocusableElements(modalEl);
        if (focusables.length === 0) { e.preventDefault(); return; }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const current = document.activeElement;
        if (e.shiftKey) {
            if (current === first || !modalEl.contains(current)) {
                e.preventDefault();
                last.focus();
            }
        } else {
            if (current === last) {
                e.preventDefault();
                first.focus();
            }
        }
    };
    modalEl.addEventListener('keydown', handler);
    modalEl.__trapHandler = handler;
}

function removeFocusTrap(modalEl) {
    if (!modalEl) return;
    const handler = modalEl.__trapHandler;
    if (handler) {
        modalEl.removeEventListener('keydown', handler);
        delete modalEl.__trapHandler;
    }
    const prev = modalPrevFocus.get(modalEl);
    if (prev && typeof prev.focus === 'function') {
        try { prev.focus(); } catch (_) {}
    }
    modalPrevFocus.delete(modalEl);
}

// Initialize the application
async function init() {
    // Attempt auto-login using secure 14-day cache
    try {
        const cache = await window.electronAPI.cacheGetMaster();
        if (cache && cache.success && cache.value) {
            const success = await loadData(cache.value);
            if (success) {
                masterPassword = cache.value;
                showMainApp();
                return;
            }
        }
    } catch (e) {
        // Fall through to login screen
    }
    // Determine whether to show setup or login based on presence of master hash
    try {
        const debugInfo = await window.electronAPI.debugHashFile();
        if (debugInfo && debugInfo.success && debugInfo.exists === false) {
            showSetupScreen();
            return;
        }
    } catch (_) {}
    showLoginScreen();
}

// Show login screen
function showLoginScreen() {
    if (loadingScreen) loadingScreen.style.display = 'none';
    loginScreen.style.display = 'flex';
    if (setupScreen) setupScreen.style.display = 'none';
    mainApp.style.display = 'none';

    // Clear inputs
    masterPasswordInput.value = '';

    masterPasswordInput.focus();
    try { window.electronAPI.setWindowSize(520, 420, true); } catch (_) {}
}

// Show main application
function showMainApp() {
    if (loadingScreen) loadingScreen.style.display = 'none';
    loginScreen.style.display = 'none';
    if (setupScreen) setupScreen.style.display = 'none';
    mainApp.style.display = 'block';
    renderCompanies();
    try { window.electronAPI.setWindowSize(1200, 800, false); } catch (_) {}
}

// Show setup screen
function showSetupScreen() {
    if (loadingScreen) loadingScreen.style.display = 'none';
    if (loginScreen) loginScreen.style.display = 'none';
    if (mainApp) mainApp.style.display = 'none';
    if (setupScreen) setupScreen.style.display = 'flex';

    if (setupMasterPasswordInput) setupMasterPasswordInput.value = '';
    if (setupConfirmPasswordInput) setupConfirmPasswordInput.value = '';
    if (setupMasterPasswordInput) setupMasterPasswordInput.focus();
    try { window.electronAPI.setWindowSize(520, 460, true); } catch (_) {}
}

// Utilities: clipboard + toast
async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            document.execCommand('copy');
            textarea.remove();
        }
    } catch (err) {
        console.error('Copy failed:', err);
    }
}

let toastHideTimer = null;
function showToast(message, durationMs = 1600) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    if (toastHideTimer) clearTimeout(toastHideTimer);
    toastHideTimer = setTimeout(() => {
        toastEl.classList.remove('show');
    }, durationMs);
}

// Load data from storage
async function loadData(password) {
    try {
        const result = await window.electronAPI.loadData(password);
        if (result.success) {
            passwordEntries = result.data;
            if (result.needsSetup) {
                showSetupScreen();
                return false;
            }
            return true;
        } else {
            showLoginMessage(result.error, 'error');
            return false;
        }
    } catch (error) {
        console.error('Error loading data:', error);
        showLoginMessage('Error loading data', 'error');
        return false;
    }
}

// Show login message
function showLoginMessage(message, type = 'error') {
    loginMessage.textContent = message;
    loginMessage.className = `login-message ${type}`;
    loginMessage.style.display = 'block';

    // Hide message after 3 seconds
    setTimeout(() => {
        loginMessage.style.display = 'none';
    }, 3000);
}

function showSetupMessage(message, type = 'error') {
    if (!setupMessage) return;
    setupMessage.textContent = message;
    setupMessage.className = `login-message ${type}`;
    setupMessage.style.display = 'block';
    setTimeout(() => {
        setupMessage.style.display = 'none';
    }, 3000);
}

// Save data to storage
async function saveData() {
    try {
        console.log('Saving data. Master password available:', !!masterPassword);
        console.log('Number of entries:', passwordEntries.length);

        // Check if master password is set
        if (!masterPassword) {
            showSetupScreen();
            showSetupMessage('Set a master password to save your data.', 'error');
            return;
        }

        const dataToSave = {
            masterPassword: masterPassword,
            entries: passwordEntries
        };
        const result = await window.electronAPI.saveData(dataToSave);
        if (!result.success) {
            console.error('Save failed with error:', result.error);
            alert('Error saving data: ' + result.error);
        } else {
            console.log('Data saved successfully');
            // Refresh cache TTL after writes
            try { await window.electronAPI.cacheTouchMaster(); } catch (_) {}
        }
    } catch (error) {
        console.error('Error saving data:', error);
        alert('Error saving data');
    }
}

// Removed inline setup flow in favor of dedicated setup screen

// ---------- Three-column rendering ----------
function getCompanies() {
    const set = new Set(passwordEntries.map(e => e.company));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function getLoginsForCompany(company) {
    return passwordEntries
        .map((entry, index) => ({ entry, index }))
        .filter(x => x.entry.company === company && !x.entry.isCompanyOnly);
}

function getEntryTitle(entry) {
    if (!entry || !Array.isArray(entry.fields)) return 'Login';
    if (entry.loginName) return entry.loginName;
    // Prefer username/email/user fields
    const preferred = entry.fields.find(f => /^(username|user|email)$/i.test(f.label));
    if (preferred && preferred.value) return preferred.value;
    const first = entry.fields[0];
    return first && first.value ? first.value : 'Login';
}

function renderCompanies() {
    companyList.innerHTML = '';
    loginList.innerHTML = '';
    detailsView.innerHTML = '';

    const companies = getCompanies();
    if (companies.length === 0) {
        const empty = document.createElement('div');
        empty.style.padding = '12px 16px';
        empty.textContent = 'No entries yet. Use "Add New Entry" to create one.';
        companyList.appendChild(empty);
        selectedCompany = null;
        selectedEntryIndex = null;
        return;
    }

    // Ensure a selection exists
    if (!selectedCompany || !companies.includes(selectedCompany)) {
        selectedCompany = companies[0];
    }

    companies.forEach(company => {
        const li = document.createElement('li');
        li.className = 'list-item' + (company === selectedCompany ? ' active' : '');
        const name = document.createElement('span');
        name.textContent = company;
        li.appendChild(name);
        li.addEventListener('click', () => {
            selectedCompany = company;
            selectedEntryIndex = null;
            renderCompanies();
            renderLogins();
        });
        li.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showCompanyContextMenu(e.clientX, e.clientY, company);
        });
        companyList.appendChild(li);
    });

    renderLogins();
}

function renderLogins() {
    loginList.innerHTML = '';
    detailsView.innerHTML = '';
    if (detailsHeaderTitle) detailsHeaderTitle.textContent = selectedCompany ? selectedCompany : '';

    if (!selectedCompany) return;
    const logins = getLoginsForCompany(selectedCompany);
    if (logins.length === 0) {
        const empty = document.createElement('div');
        empty.style.padding = '12px 16px';
        empty.textContent = 'No logins for this company yet.';
        loginList.appendChild(empty);
        return;
    }

    // Ensure selection
    if (
        selectedEntryIndex === null ||
        !logins.some(l => l.index === selectedEntryIndex)
    ) {
        selectedEntryIndex = logins[0].index;
    }

    logins.forEach(({ entry, index }) => {
        const li = document.createElement('li');
        li.className = 'list-item' + (index === selectedEntryIndex ? ' active' : '');
        li.textContent = getEntryTitle(entry);
        li.addEventListener('click', () => {
            selectedEntryIndex = index;
            renderLogins();
            renderDetails();
        });
        loginList.appendChild(li);
    });

    renderDetails();
}

function renderDetails() {
    detailsView.innerHTML = '';
    if (selectedEntryIndex === null) return;

    const entry = passwordEntries[selectedEntryIndex];
    if (!entry) return;
    if (entry.isCompanyOnly) return;

    if (detailsHeaderTitle) {
        detailsHeaderTitle.textContent = `${entry.company} · ${getEntryTitle(entry)}`;
    }

    entry.fields.forEach((field, fieldIdx) => {
        const row = document.createElement('div');
        row.className = 'detail-field' + (field.type === 'password' ? ' is-secret' : '');

        const label = document.createElement('div');
        label.className = 'field-label';
        label.textContent = field.label;

        const line = document.createElement('div');
        line.className = 'detail-row';

        // Left: reveal for passwords
        const secret = field.type === 'password';
        let isRevealed = false;
        const revealBtn = document.createElement('button');
        revealBtn.className = 'reveal-btn';
        revealBtn.innerHTML = '<span>▸</span><span>Reveal</span>';
        if (!secret) { revealBtn.style.display = 'none'; }

        // Value + Copy click area
        const value = document.createElement('div');
        value.className = 'field-value';
        value.textContent = secret ? '••••••••' : field.value;

        const copyHint = document.createElement('div');
        copyHint.className = 'copy-hint';
        copyHint.textContent = 'Copy';

        const copyContainer = document.createElement('div');
        copyContainer.className = 'copy-container';
        copyContainer.title = 'Click to copy';
        copyContainer.addEventListener('click', async () => {
            await copyToClipboard(field.value);
            showToast(`${field.label} copied`);
        });
        copyContainer.appendChild(value);
        copyContainer.appendChild(copyHint);

        revealBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!secret) return;
            isRevealed = !isRevealed;
            value.textContent = isRevealed ? field.value : '••••••••';
            revealBtn.innerHTML = isRevealed ? '<span>▾</span><span>Hide</span>' : '<span>▸</span><span>Reveal</span>';
        });

        // Order: copy area (value + Copy), then Reveal chevron on the far right
        line.appendChild(copyContainer);
        line.appendChild(revealBtn);

        row.appendChild(label);
        row.appendChild(line);
        detailsView.appendChild(row);
    });
}

// Show modal for adding/editing entry
function showModal(isEditing = false, entry = null) {
    modalMode = isEditing ? 'edit' : modalMode;
    if (isEditing && entry) {
        modalTitle.textContent = 'Edit Entry';
        companyInput.value = entry.company;
        companyInput.disabled = true;
        if (loginNameGroup) {
            loginNameGroup.style.display = 'block';
            loginNameInput.value = entry.loginName || '';
            loginNameInput.disabled = false;
        }
        if (companyGroup) companyGroup.style.display = 'block';

        // Clear existing fields
        fieldsContainer.innerHTML = '';

        // Add existing fields (type first, label derived from type)
        entry.fields.forEach(field => {
            addFieldInput(field.value, field.type);
        });
        addFieldBtn.style.display = 'inline-block';
        deleteLoginBtn.style.display = 'inline-block';
        deleteLoginBtn.onclick = () => {
            deleteEntry(editingIndex);
            hideModal();
        };
        // snapshot baseline for edit mode
        formBaseline = captureFormSnapshot();
    } else {
        modalTitle.textContent = 'Add New Entry';
        entryForm.reset();
        fieldsContainer.innerHTML = '';
        addFieldBtn.style.display = 'inline-block';
        deleteLoginBtn.style.display = 'none';
    }

    entryModal.style.display = 'block';
    focusFirstEnabledInput(entryModal);
    initFocusTrap(entryModal);
}

// Hide modal
function hideModal() {
    entryModal.style.display = 'none';
    editingIndex = -1;
    formBaseline = null;
    removeFocusTrap(entryModal);
}

// Utility to map type to default label
function getDefaultLabelFromType(type) {
    switch ((type || 'text').toLowerCase()) {
        case 'username': return 'Username';
        case 'password': return 'Password';
        case 'email': return 'Email';
        default: return 'Text';
    }
}

// Add a new field input to the form: [label][type select][value input][remove]
function addFieldInput(value = '', type = 'text') {
    const fieldGroup = document.createElement('div');
    fieldGroup.className = 'field-group';

    const label = document.createElement('label');
    label.textContent = getDefaultLabelFromType(type);

    const valueInput = document.createElement('input');
    valueInput.type = type === 'password' ? 'password' : 'text';
    valueInput.placeholder = 'Field value';
    valueInput.value = value;
    valueInput.className = 'field-input';

    const typeSelect = document.createElement('select');
    typeSelect.className = 'field-type-select';
    typeSelect.innerHTML = `
        <option value="text" ${type === 'text' ? 'selected' : ''}>Text</option>
        <option value="password" ${type === 'password' ? 'selected' : ''}>Password</option>
        <option value="email" ${type === 'email' ? 'selected' : ''}>Email</option>
        <option value="username" ${type === 'username' ? 'selected' : ''}>Username</option>
    `;

    // Update label when type changes
    typeSelect.addEventListener('change', () => {
        const t = typeSelect.value;
        valueInput.type = t === 'password' ? 'password' : 'text';
        label.textContent = getDefaultLabelFromType(t);
    });

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn-danger';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => {
        fieldGroup.remove();
    });

    fieldGroup.appendChild(label);
    fieldGroup.appendChild(typeSelect);
    fieldGroup.appendChild(valueInput);
    fieldGroup.appendChild(removeBtn);

    fieldsContainer.appendChild(fieldGroup);
}

// Save entry (add or edit)
function saveEntry() {
    if (modalMode === 'addCompany') {
        const company = companyInput.value.trim();
        if (!company) { alert('Company name is required'); return; }
        const entry = { company, fields: [], isCompanyOnly: true };
        passwordEntries.push(entry);
        selectedCompany = company;
        selectedEntryIndex = null;
        saveData();
        renderCompanies();
        hideModal();
        return;
    }

    if (modalMode === 'addLogin') {
        const company = selectedCompany;
        if (!company) { alert('Select a company first'); return; }
        const loginName = loginNameInput.value.trim();
        if (!loginName) { alert('Login name is required'); return; }
        const entry = { company, loginName, fields: [] };
        passwordEntries.push(entry);
        selectedCompany = company;
        selectedEntryIndex = passwordEntries.length - 1;
        saveData();
        renderCompanies();
        hideModal();
        return;
    }

    // no separate addField mode anymore

    // Default edit behavior
    const company = modalMode === 'edit' && editingIndex >= 0
        ? (passwordEntries[editingIndex] && passwordEntries[editingIndex].company) || ''
        : companyInput.value.trim();
    if (!company) { alert('Company name is required'); return; }
    const loginName = loginNameInput ? loginNameInput.value.trim() : '';
    const fields = [];
    const fieldGroups = fieldsContainer.querySelectorAll('.field-group');
    fieldGroups.forEach(group => {
        const valueInput = group.querySelector('.field-input');
        const typeSelect = group.querySelector('.field-type-select');
        if (valueInput && typeSelect) {
            const value = valueInput.value.trim();
            const type = typeSelect.value;
            const label = getDefaultLabelFromType(type);
            if (label && value) { fields.push({ label, value, type }); }
        }
    });
    const entry = { company, fields };
    if (loginName) entry.loginName = loginName;
    if (editingIndex >= 0) {
        passwordEntries[editingIndex] = entry;
        selectedCompany = entry.company;
        selectedEntryIndex = editingIndex;
    } else {
        passwordEntries.push(entry);
        selectedCompany = entry.company;
        selectedEntryIndex = passwordEntries.length - 1;
    }
    saveData();
    renderCompanies();
    hideModal();
}

// Edit entry
function editEntry(index) {
    editingIndex = index;
    showModal(true, passwordEntries[index]);
}

// Delete entry
function deleteEntry(index) {
    if (confirm('Are you sure you want to delete this entry?')) {
        passwordEntries.splice(index, 1);
        saveData();
        // Recompute selections
        if (selectedEntryIndex === index) {
            selectedEntryIndex = null;
        }
        const remainingForCompany = getLoginsForCompany(selectedCompany);
        if (remainingForCompany.length === 0) {
            selectedCompany = null;
        }
        renderCompanies();
    }
}

// Company context menu
function showCompanyContextMenu(x, y, companyName) {
    hideCompanyContextMenu();
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';

    const editItem = document.createElement('div');
    editItem.className = 'context-menu-item';
    editItem.textContent = 'Edit Company Name';
    editItem.addEventListener('click', () => {
        pendingRenameCompany = companyName;
        hideCompanyContextMenu();
        // open rename modal
        renameCompanyInput.value = companyName;
        renameCompanyModal.style.display = 'block';
        focusFirstEnabledInput(renameCompanyModal);
        initFocusTrap(renameCompanyModal);
    });

    const deleteItem = document.createElement('div');
    deleteItem.className = 'context-menu-item danger';
    deleteItem.textContent = 'Delete Company';
    deleteItem.addEventListener('click', () => {
        if (confirm(`Delete company "${companyName}" and all its logins?`)) {
            passwordEntries = passwordEntries.filter(e => e.company !== companyName);
            if (selectedCompany === companyName) {
                selectedCompany = null;
                selectedEntryIndex = null;
            }
            saveData();
            renderCompanies();
        }
        hideCompanyContextMenu();
    });

    menu.appendChild(editItem);
    menu.appendChild(deleteItem);
    document.body.appendChild(menu);
    companyContextMenuEl = menu;

    const dismiss = (ev) => {
        if (companyContextMenuEl && !companyContextMenuEl.contains(ev.target)) {
            hideCompanyContextMenu();
        }
    };
    setTimeout(() => {
        window.addEventListener('mousedown', dismiss, { once: true });
        window.addEventListener('scroll', hideCompanyContextMenu, { once: true });
        window.addEventListener('resize', hideCompanyContextMenu, { once: true });
    }, 0);
}

function hideCompanyContextMenu() {
    if (companyContextMenuEl) {
        companyContextMenuEl.remove();
        companyContextMenuEl = null;
    }
}

// Login functionality
async function handleLogin() {
    const password = masterPasswordInput.value.trim();
    if (!password) {
        showLoginMessage('Please enter your master password', 'error');
        return;
    }

    const success = await loadData(password);
    if (success) {
        masterPassword = password;
        masterPasswordInput.value = '';
        showMainApp();
        showLoginMessage('Login successful!', 'success');
        // Save in secure cache to enable 14-day no-retype
        try { await window.electronAPI.cacheSaveMaster(masterPassword); } catch (_) {}
    }
}

async function handleCreateMaster() {
    const password = (setupMasterPasswordInput ? setupMasterPasswordInput.value : '').trim();
    const confirmPassword = (setupConfirmPasswordInput ? setupConfirmPasswordInput.value : '').trim();

    if (!password) {
        showSetupMessage('Please enter a master password', 'error');
        return;
    }

    if (password.length < 8) {
        showSetupMessage('Master password must be at least 8 characters', 'error');
        return;
    }

    if (!confirmPassword) {
        showSetupMessage('Please confirm your master password', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showSetupMessage('Passwords do not match. Please try again.', 'error');
        return;
    }

    try {
        const result = await window.electronAPI.setMasterPassword(password);
        if (result.success) {
            masterPassword = password;
            if (setupMasterPasswordInput) setupMasterPasswordInput.value = '';
            if (setupConfirmPasswordInput) setupConfirmPasswordInput.value = '';
            showMainApp();
            showToast('Master password set successfully!');
            try { await window.electronAPI.cacheSaveMaster(masterPassword); } catch (_) {}
        } else {
            showSetupMessage('Error setting master password', 'error');
        }
    } catch (error) {
        console.error('Error setting master password:', error);
        showSetupMessage('Error setting master password', 'error');
    }
}

function handleLogout() {
    masterPassword = null;
    passwordEntries = [];
    editingIndex = -1;
    showLoginScreen();
    // Clear cache on explicit logout
    try { window.electronAPI.cacheClearMaster(); } catch (_) {}
}

// Event listeners
loginBtn.addEventListener('click', handleLogin);
// logout removed
masterPasswordInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        handleLogin();
    }
});

if (setupMasterPasswordInput) {
    setupMasterPasswordInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            if (setupConfirmPasswordInput) setupConfirmPasswordInput.focus();
        }
    });
}
if (setupConfirmPasswordInput) {
    setupConfirmPasswordInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            handleCreateMaster();
        }
    });
}
if (createMasterBtn) {
    createMasterBtn.addEventListener('click', handleCreateMaster);
}

// addEntry removed
addFieldBtn.addEventListener('click', () => addFieldInput());
saveEntryBtn.addEventListener('click', saveEntry);
// Allow Enter to submit the modal form
if (entryForm) {
    entryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveEntry();
    });
}
cancelEntryBtn.addEventListener('click', () => attemptCloseEntryModal());

// Close modal when clicking outside or on close button
document.querySelector('.close').addEventListener('click', () => attemptCloseEntryModal());
// Make close controls keyboard-activatable (Enter/Space)
try {
    const allCloseEls = document.querySelectorAll('.close');
    allCloseEls.forEach(el => {
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
        });
    });
} catch (_) {}
window.addEventListener('click', (event) => {
    if (event.target === entryModal) attemptCloseEntryModal();
    if (event.target === discardModal) { discardModal.style.display = 'none'; removeFocusTrap(discardModal); }
    if (event.target === renameCompanyModal) {
        renameCompanyModal.style.display = 'none';
        removeFocusTrap(renameCompanyModal);
        pendingRenameCompany = null;
    }
});

// Add entity buttons handlers
addCompanyBtn.addEventListener('click', () => {
    editingIndex = -1;
    modalMode = 'addCompany';
    entryForm.reset();
    modalTitle.textContent = 'Add Company';
    if (companyGroup) companyGroup.style.display = 'block';
    companyInput.disabled = false;
    companyInput.value = '';
    if (loginNameGroup) loginNameGroup.style.display = 'none';
    if (fieldsContainer) fieldsContainer.style.display = 'none';
    addFieldBtn.style.display = 'none';
    deleteLoginBtn.style.display = 'none'; // Ensure delete button is hidden
    entryModal.style.display = 'block';
    focusFirstEnabledInput(entryModal);
    initFocusTrap(entryModal);
});

newItemBtn.addEventListener('click', () => {
    if (!selectedCompany) { showToast('Select a company first'); return; }
    editingIndex = -1;
    modalMode = 'addLogin';
    entryForm.reset();
    modalTitle.textContent = 'Add Login';
    if (companyGroup) companyGroup.style.display = 'block';
    companyInput.value = selectedCompany;
    companyInput.disabled = true;
    if (loginNameGroup) {
        loginNameGroup.style.display = 'block';
        loginNameInput.value = '';
        loginNameInput.disabled = false;
    }
    if (fieldsContainer) fieldsContainer.style.display = 'none';
    addFieldBtn.style.display = 'none';
    entryModal.style.display = 'block';
    focusFirstEnabledInput(entryModal);
    initFocusTrap(entryModal);
});

editDetailsBtn.addEventListener('click', () => {
    if (selectedEntryIndex === null) { showToast('Select a login first'); return; }
    const entry = passwordEntries[selectedEntryIndex];
    if (!entry || entry.isCompanyOnly) { showToast('Select a login first'); return; }
    editingIndex = selectedEntryIndex;
    modalMode = 'edit';
    showModal(true, entry);
});

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// ----- Dirty check helpers -----
// Rename company modal handlers
if (renameCompanyCancelBtn) {
    renameCompanyCancelBtn.addEventListener('click', () => {
        renameCompanyModal.style.display = 'none';
        removeFocusTrap(renameCompanyModal);
        pendingRenameCompany = null;
    });
}
const renameCloseEl = document.querySelector('.rename-close');
if (renameCloseEl) {
    renameCloseEl.addEventListener('click', () => {
        renameCompanyModal.style.display = 'none';
        removeFocusTrap(renameCompanyModal);
        pendingRenameCompany = null;
    });
}
if (renameCompanySaveBtn) {
    renameCompanySaveBtn.addEventListener('click', () => {
        const newName = (renameCompanyInput.value || '').trim();
        const oldName = pendingRenameCompany;
        if (!oldName) { renameCompanyModal.style.display = 'none'; return; }
        if (!newName) { alert('Company name cannot be empty'); return; }
        if (newName === oldName) { renameCompanyModal.style.display = 'none'; return; }
        passwordEntries.forEach(e => { if (e.company === oldName) e.company = newName; });
        if (selectedCompany === oldName) selectedCompany = newName;
        renameCompanyModal.style.display = 'none';
        removeFocusTrap(renameCompanyModal);
        pendingRenameCompany = null;
        saveData();
        renderCompanies();
    });
}

// ----- Dirty check helpers -----
function captureFormSnapshot() {
    const snapshot = {
        company: companyInput.value,
        loginName: loginNameInput ? loginNameInput.value : '',
        fields: []
    };
    const groups = fieldsContainer.querySelectorAll('.field-group');
    groups.forEach(g => {
        const valueInput = g.querySelector('.field-input');
        const typeSelect = g.querySelector('.field-type-select');
        snapshot.fields.push({ value: valueInput ? valueInput.value : '', type: typeSelect ? typeSelect.value : 'text' });
    });
    return snapshot;
}

function isFormDirty() {
    if (!formBaseline) return false;
    const current = captureFormSnapshot();
    if (formBaseline.company !== current.company) return true;
    if (formBaseline.loginName !== current.loginName) return true;
    if (formBaseline.fields.length !== current.fields.length) return true;
    for (let i = 0; i < current.fields.length; i++) {
        if (formBaseline.fields[i].type !== current.fields[i].type) return true;
        if (formBaseline.fields[i].value !== current.fields[i].value) return true;
    }
    return false;
}

function attemptCloseEntryModal() {
    if (modalMode === 'edit' && isFormDirty()) {
        // show confirm discard modal
        discardModal.style.display = 'block';
        focusFirstEnabledInput(discardModal);
        initFocusTrap(discardModal);
        // wire buttons
        const confirmBtn = document.getElementById('confirmDiscardBtn');
        const keepBtn = document.getElementById('keepEditingBtn');
        const closeX = document.querySelector('.discard-close');
        const hideDiscard = () => { discardModal.style.display = 'none'; removeFocusTrap(discardModal); };
        confirmBtn.onclick = () => { hideDiscard(); hideModal(); };
        keepBtn.onclick = hideDiscard;
        closeX.onclick = hideDiscard;
    } else {
        hideModal();
    }
}

// ----- Global keyboard ergonomics -----
function isVisible(el) { return !!el && el.style && el.style.display !== 'none'; }

document.addEventListener('keydown', (e) => {
    // Escape closes the topmost open modal
    if (e.key === 'Escape') {
        if (isVisible(discardModal)) { discardModal.style.display = 'none'; removeFocusTrap(discardModal); e.preventDefault(); return; }
        if (isVisible(renameCompanyModal)) { renameCompanyModal.style.display = 'none'; removeFocusTrap(renameCompanyModal); pendingRenameCompany = null; e.preventDefault(); return; }
        if (isVisible(entryModal)) { attemptCloseEntryModal(); e.preventDefault(); return; }
    }

    // Enter to save on rename company (not a form)
    if (e.key === 'Enter' && isVisible(renameCompanyModal)) {
        if (document.activeElement && renameCompanyModal.contains(document.activeElement)) {
            e.preventDefault();
            if (renameCompanySaveBtn) renameCompanySaveBtn.click();
            return;
        }
    }

    // Keyboard Shortcuts
    const accel = e.metaKey || e.ctrlKey;
    if (accel && e.key.toLowerCase() === 'n') { // New login
        if (isVisible(mainApp)) { e.preventDefault(); newItemBtn.click(); }
    }
    if (accel && e.key.toLowerCase() === 'e') { // Edit selected
        if (isVisible(mainApp)) { e.preventDefault(); editDetailsBtn.click(); }
    }
    if (accel && e.key.toLowerCase() === 's') { // Save in modal
        if (isVisible(entryModal)) { e.preventDefault(); saveEntry(); }
    }
});

// Helpful titles
try {
    const headerNewBtn = document.getElementById('newItemBtn');
    if (headerNewBtn) headerNewBtn.title = 'New Login (Cmd/Ctrl+N)';
    if (editDetailsBtn) editDetailsBtn.title = 'Edit (Cmd/Ctrl+E)';
} catch (_) {}
