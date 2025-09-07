let passwordEntries = [];
let editingIndex = -1;
let masterPassword = null;
let selectedCompany = null;
let selectedEntryIndex = null; // index into passwordEntries

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
const logoutBtn = document.getElementById('logoutBtn');
const loginMessage = document.getElementById('loginMessage');
const addEntryBtn = document.getElementById('addEntry');
const entryModal = document.getElementById('entryModal');
const entryForm = document.getElementById('entryForm');
const modalTitle = document.getElementById('modalTitle');
const saveEntryBtn = document.getElementById('saveEntry');
const cancelEntryBtn = document.getElementById('cancelEntry');
const addFieldBtn = document.getElementById('addField');
const companyInput = document.getElementById('company');
const fieldsContainer = document.getElementById('fieldsContainer');

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
        .filter(x => x.entry.company === company);
}

function getEntryTitle(entry) {
    if (!entry || !Array.isArray(entry.fields)) return 'Login';
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
        li.textContent = company;
        li.addEventListener('click', () => {
            selectedCompany = company;
            selectedEntryIndex = null;
            renderCompanies();
            renderLogins();
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

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '12px';

    const title = document.createElement('div');
    title.style.fontWeight = '600';
    title.textContent = `${entry.company} · ${getEntryTitle(entry)}`;

    const actions = document.createElement('div');
    actions.className = 'action-buttons';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-secondary';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => editEntry(selectedEntryIndex));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => deleteEntry(selectedEntryIndex));

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    header.appendChild(title);
    header.appendChild(actions);
    detailsView.appendChild(header);

    entry.fields.forEach(field => {
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

        row.appendChild(label);
        row.appendChild(line);
        detailsView.appendChild(row);
    });
}

// Show modal for adding/editing entry
function showModal(isEditing = false, entry = null) {
    if (isEditing && entry) {
        modalTitle.textContent = 'Edit Entry';
        companyInput.value = entry.company;

        // Clear existing fields
        fieldsContainer.innerHTML = '';

        // Add existing fields
        entry.fields.forEach(field => {
            addFieldInput(field.label, field.value, field.type);
        });
    } else {
        modalTitle.textContent = 'Add New Entry';
        entryForm.reset();
        fieldsContainer.innerHTML = `
            <div class="field-group">
                <label>Username:</label>
                <input type="text" class="field-input" placeholder="Enter username">
            </div>
            <div class="field-group">
                <label>Password:</label>
                <input type="password" class="field-input" placeholder="Enter password">
            </div>
        `;
    }

    entryModal.style.display = 'block';
}

// Hide modal
function hideModal() {
    entryModal.style.display = 'none';
    editingIndex = -1;
}

// Add a new field input to the form
function addFieldInput(label = '', value = '', type = 'text') {
    const fieldGroup = document.createElement('div');
    fieldGroup.className = 'field-group';

    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.placeholder = 'Field name';
    labelInput.value = label;
    labelInput.className = 'field-label-input';

    const valueInput = document.createElement('input');
    valueInput.type = type;
    valueInput.placeholder = 'Field value';
    valueInput.value = value;
    valueInput.className = 'field-input';

    const typeSelect = document.createElement('select');
    typeSelect.className = 'field-type-select';
    typeSelect.innerHTML = `
        <option value="text" ${type === 'text' ? 'selected' : ''}>Text</option>
        <option value="password" ${type === 'password' ? 'selected' : ''}>Password</option>
        <option value="email" ${type === 'email' ? 'selected' : ''}>Email</option>
    `;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn-danger';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => {
        fieldGroup.remove();
    });

    fieldGroup.appendChild(labelInput);
    fieldGroup.appendChild(valueInput);
    fieldGroup.appendChild(typeSelect);
    fieldGroup.appendChild(removeBtn);

    fieldsContainer.appendChild(fieldGroup);
}

// Save entry (add or edit)
function saveEntry() {
    const company = companyInput.value.trim();

    if (!company) {
        alert('Company name is required');
        return;
    }

    const fields = [];
    const fieldGroups = fieldsContainer.querySelectorAll('.field-group');

    fieldGroups.forEach(group => {
        const labelInput = group.querySelector('.field-label-input');
        const valueInput = group.querySelector('.field-input');
        const typeSelect = group.querySelector('.field-type-select');

        if (labelInput && valueInput && typeSelect) {
            const label = labelInput.value.trim();
            const value = valueInput.value.trim();
            const type = typeSelect.value;

            if (label && value) {
                fields.push({ label, value, type });
            }
        }
    });

    if (fields.length === 0) {
        alert('At least one field is required');
        return;
    }

    const entry = { company, fields };

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
logoutBtn.addEventListener('click', handleLogout);
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

addEntryBtn.addEventListener('click', () => showModal());
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

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
