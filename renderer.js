let passwordEntries = [];
let editingIndex = -1;
let masterPassword = null;

// DOM elements
const passwordTableBody = document.getElementById('passwordTableBody');
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
const loginInput = document.getElementById('login');
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
    renderTable();
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

// Render the password table
function renderTable() {
    passwordTableBody.innerHTML = '';

    passwordEntries.forEach((entry, index) => {
        const row = document.createElement('tr');

        // Company column
        const companyCell = document.createElement('td');
        companyCell.textContent = entry.company;
        row.appendChild(companyCell);

        // Login column
        const loginCell = document.createElement('td');
        if (entry.login) {
            const loginLink = document.createElement('a');
            loginLink.href = entry.login;
            loginLink.textContent = entry.login;
            loginLink.target = '_blank';
            loginCell.appendChild(loginLink);
        } else {
            loginCell.textContent = '-';
        }
        row.appendChild(loginCell);

        // Fields column
        const fieldsCell = document.createElement('td');
        const fieldsList = document.createElement('div');
        fieldsList.className = 'fields-list';

        entry.fields.forEach(field => {
            const fieldDiv = document.createElement('div');
            fieldDiv.className = 'field-item';

            const labelSpan = document.createElement('span');
            labelSpan.className = 'field-label';
            labelSpan.textContent = field.label + ': ';

            const valueSpan = document.createElement('span');
            valueSpan.className = 'field-value';
            valueSpan.textContent = field.type === 'password' ? '••••••••' : field.value;

            // Toggle password visibility
            if (field.type === 'password') {
                valueSpan.style.cursor = 'pointer';
                valueSpan.addEventListener('click', () => {
                    if (valueSpan.textContent === '••••••••') {
                        valueSpan.textContent = field.value;
                    } else {
                        valueSpan.textContent = '••••••••';
                    }
                });
            }

            fieldDiv.appendChild(labelSpan);
            fieldDiv.appendChild(valueSpan);
            fieldsList.appendChild(fieldDiv);
        });

        fieldsCell.appendChild(fieldsList);
        row.appendChild(fieldsCell);

        // Actions column
        const actionsCell = document.createElement('td');
        actionsCell.className = 'action-buttons';

        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-secondary';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => editEntry(index));

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => deleteEntry(index));

        actionsCell.appendChild(editBtn);
        actionsCell.appendChild(deleteBtn);
        row.appendChild(actionsCell);

        passwordTableBody.appendChild(row);
    });
}

// Show modal for adding/editing entry
function showModal(isEditing = false, entry = null) {
    if (isEditing && entry) {
        modalTitle.textContent = 'Edit Entry';
        companyInput.value = entry.company;
        loginInput.value = entry.login || '';

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
    const login = loginInput.value.trim();

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

    const entry = { company, login, fields };

    if (editingIndex >= 0) {
        passwordEntries[editingIndex] = entry;
    } else {
        passwordEntries.push(entry);
    }

    saveData();
    renderTable();
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
        renderTable();
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
