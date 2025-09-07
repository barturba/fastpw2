let passwordEntries = [];
let editingIndex = -1;
let masterPassword = null;
let selectedCompany = null;
let selectedEntryIndex = null; // index into passwordEntries
let companyContextMenuEl = null;

// DOM elements
const companyList = document.getElementById('companyList');
const loginList = document.getElementById('loginList');
const detailsView = document.getElementById('detailsView');
const toastEl = document.getElementById('toast');
const loginScreen = document.getElementById('loginScreen');
const mainApp = document.getElementById('mainApp');
const masterPasswordInput = document.getElementById('masterPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');
const confirmPasswordLabel = document.getElementById('confirmPasswordLabel');
const loginBtn = document.getElementById('loginBtn');
const setupPasswordBtn = document.getElementById('setupPasswordBtn');
const loginMessage = document.getElementById('loginMessage');
const addCompanyBtn = document.getElementById('addCompanyBtn');
const newItemBtn = document.getElementById('newItemBtn');
const editDetailsBtn = document.getElementById('editDetailsBtn');
const entryModal = document.getElementById('entryModal');
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
let modalMode = null; // 'addCompany' | 'addLogin' | 'edit' | null
let modalTargetIndex = null; // used for addField/edit

// Initialize the application
async function init() {
    // Check if master password is already set
    try {
        const result = await window.electronAPI.loadData('');
        if (result.needsSetup) {
            showLoginScreen();
        } else {
            showLoginScreen();
        }
    } catch (error) {
        console.error('Error initializing:', error);
        showLoginScreen();
    }
}

// Show login screen
function showLoginScreen() {
    loginScreen.style.display = 'flex';
    mainApp.style.display = 'none';

    // Reset UI to default login state
    confirmPasswordInput.style.display = 'none';
    confirmPasswordLabel.style.display = 'none';
    loginBtn.style.display = 'block';
    setupPasswordBtn.textContent = 'Setup New Password';

    // Clear inputs
    masterPasswordInput.value = '';
    confirmPasswordInput.value = '';

    masterPasswordInput.focus();
}

// Show main application
function showMainApp() {
    loginScreen.style.display = 'none';
    mainApp.style.display = 'block';
    renderCompanies();
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

// Save data to storage
async function saveData() {
    try {
        console.log('Saving data. Master password available:', !!masterPassword);
        console.log('Number of entries:', passwordEntries.length);

        // Check if master password is set
        if (!masterPassword) {
            const shouldSetup = confirm('No master password is set. Would you like to set up a master password now to secure your data?');
            if (shouldSetup) {
                await promptMasterPasswordSetup();
                return; // Don't proceed with saving until master password is set
            } else {
                alert('Master password is required to save data. Please set up a master password first.');
                return;
            }
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
        }
    } catch (error) {
        console.error('Error saving data:', error);
        alert('Error saving data');
    }
}

// Prompt user to set up master password
async function promptMasterPasswordSetup() {
    // Show setup mode with confirmation field
    confirmPasswordInput.style.display = 'block';
    confirmPasswordLabel.style.display = 'block';
    loginBtn.style.display = 'none';
    setupPasswordBtn.textContent = 'Create Master Password';

    // Clear any previous messages
    loginMessage.style.display = 'none';

    // Focus on password input
    masterPasswordInput.focus();

    showLoginScreen();
    showLoginMessage('Please create a master password to secure your data.', 'success');
}

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

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '12px';

    const title = document.createElement('div');
    title.style.fontWeight = '600';
    title.textContent = `${entry.company} · ${getEntryTitle(entry)}`;

    header.appendChild(title);
    detailsView.appendChild(header);

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

        // Value
        const value = document.createElement('div');
        value.className = 'field-value';
        value.textContent = secret ? '••••••••' : field.value;
        value.style.cursor = 'pointer';
        value.title = 'Click to copy';

        // Right: copy hint
        const copyHint = document.createElement('div');
        copyHint.className = 'copy-hint';
        copyHint.textContent = 'Copy';

        value.addEventListener('click', async () => {
            await copyToClipboard(field.value);
            showToast(`${field.label} copied`);
        });

        revealBtn.addEventListener('click', () => {
            if (!secret) return;
            isRevealed = !isRevealed;
            value.textContent = isRevealed ? field.value : '••••••••';
            revealBtn.innerHTML = isRevealed ? '<span>▾</span><span>Hide</span>' : '<span>▸</span><span>Reveal</span>';
        });

        line.appendChild(revealBtn);
        line.appendChild(value);
        line.appendChild(copyHint);

        // Inline edit/delete for fields via small buttons
        const fieldActions = document.createElement('div');
        fieldActions.className = 'action-buttons';
        const editFieldBtn = document.createElement('button');
        editFieldBtn.className = 'btn btn-secondary';
        editFieldBtn.textContent = 'Edit';
        editFieldBtn.addEventListener('click', () => {
            editingIndex = selectedEntryIndex;
            modalMode = 'edit';
            showModal(true, passwordEntries[editingIndex]);
            // Focus the field by adding one more empty row to encourage edits
        });
        const deleteFieldBtn = document.createElement('button');
        deleteFieldBtn.className = 'btn btn-danger';
        deleteFieldBtn.textContent = 'Delete';
        deleteFieldBtn.addEventListener('click', () => {
            if (!Array.isArray(passwordEntries[selectedEntryIndex].fields)) return;
            passwordEntries[selectedEntryIndex].fields.splice(fieldIdx, 1);
            saveData();
            renderDetails();
        });
        fieldActions.appendChild(editFieldBtn);
        fieldActions.appendChild(deleteFieldBtn);

        row.appendChild(label);
        row.appendChild(line);
        row.appendChild(fieldActions);
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
    } else {
        modalTitle.textContent = 'Add New Entry';
        entryForm.reset();
        fieldsContainer.innerHTML = '';
        addFieldBtn.style.display = 'inline-block';
        deleteLoginBtn.style.display = 'none';
    }

    entryModal.style.display = 'block';
}

// Hide modal
function hideModal() {
    entryModal.style.display = 'none';
    editingIndex = -1;
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

// Add a new field input to the form: [type select][value input][remove]
function addFieldInput(value = '', type = 'text') {
    const fieldGroup = document.createElement('div');
    fieldGroup.className = 'field-group';

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

    // Ensure value input masks when password type is selected
    typeSelect.addEventListener('change', () => {
        const t = typeSelect.value;
        valueInput.type = t === 'password' ? 'password' : 'text';
    });

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn-danger';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => {
        fieldGroup.remove();
    });

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
    if (fields.length === 0) { alert('At least one field is required'); return; }
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
        const newName = prompt('Enter new company name:', companyName);
        if (newName && newName.trim() && newName.trim() !== companyName) {
            const trimmed = newName.trim();
            passwordEntries.forEach(e => { if (e.company === companyName) e.company = trimmed; });
            selectedCompany = trimmed;
            saveData();
            renderCompanies();
        }
        hideCompanyContextMenu();
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
    }
}

async function handleSetupPassword() {
    const password = masterPasswordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();

    if (!password) {
        showLoginMessage('Please enter a master password', 'error');
        return;
    }

    if (password.length < 8) {
        showLoginMessage('Master password must be at least 8 characters', 'error');
        return;
    }

    // Check if confirmation is required (when in setup mode)
    if (confirmPasswordInput.style.display !== 'none') {
        if (!confirmPassword) {
            showLoginMessage('Please confirm your master password', 'error');
            return;
        }

        if (password !== confirmPassword) {
            showLoginMessage('Passwords do not match. Please try again.', 'error');
            return;
        }
    }

    try {
        const result = await window.electronAPI.setMasterPassword(password);
        if (result.success) {
            masterPassword = password;
            console.log('Master password set successfully in renderer:', !!masterPassword);

            // Clear inputs
            masterPasswordInput.value = '';
            confirmPasswordInput.value = '';

            // Reset UI to normal state
            confirmPasswordInput.style.display = 'none';
            confirmPasswordLabel.style.display = 'none';
            loginBtn.style.display = 'block';
            setupPasswordBtn.textContent = 'Setup New Password';

            showMainApp();
            showLoginMessage('Master password set successfully!', 'success');
        } else {
            showLoginMessage('Error setting master password', 'error');
        }
    } catch (error) {
        console.error('Error setting master password:', error);
        showLoginMessage('Error setting master password', 'error');
    }
}

function handleLogout() {
    masterPassword = null;
    passwordEntries = [];
    editingIndex = -1;
    showLoginScreen();
}

// Event listeners
loginBtn.addEventListener('click', handleLogin);
setupPasswordBtn.addEventListener('click', handleSetupPassword);
// logout removed
masterPasswordInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        // If confirmation is visible, focus on it, otherwise proceed with login/setup
        if (confirmPasswordInput.style.display !== 'none') {
            confirmPasswordInput.focus();
        } else if (loginBtn.style.display !== 'none') {
            handleLogin();
        } else {
            handleSetupPassword();
        }
    }
});

confirmPasswordInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        handleSetupPassword();
    }
});

// addEntry removed
addFieldBtn.addEventListener('click', () => addFieldInput());
saveEntryBtn.addEventListener('click', saveEntry);
cancelEntryBtn.addEventListener('click', hideModal);

// Close modal when clicking outside or on close button
document.querySelector('.close').addEventListener('click', hideModal);
window.addEventListener('click', (event) => {
    if (event.target === entryModal) {
        hideModal();
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
    entryModal.style.display = 'block';
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
