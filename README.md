# FastPW2 - Streamlined Password Manager

A secure, desktop password manager built with Electron that stores your passwords locally with encryption.

## Features

- **Secure Storage**: All passwords are encrypted using AES encryption
- **Master Password**: Single master password protects all your stored credentials
- **Three-Column Layout**:
  - Company: The service/website name
  - Login: URL for easy access
  - Fields: Custom fields for username, password, keys, etc.
- **Easy Management**: Add, edit, and delete password entries
- **Password Visibility**: Click on password fields to reveal/hide them
- **Cross-Platform**: Runs on Windows, macOS, and Linux

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the application:
   ```bash
   npm start
   ```

## Usage

### First Time Setup
1. When you first run the app, you'll see a login screen
2. Click "Setup New Password" to create your master password
3. Choose a strong master password (minimum 8 characters)
4. Your password database will be created and encrypted

### Adding Password Entries
1. Click "Add New Entry" in the main interface
2. Fill in:
   - **Company**: Name of the service (e.g., "Google", "GitHub")
   - **Login**: Website URL (optional)
   - **Fields**: Add username, password, API keys, etc.
3. Click "Save" to store the entry

### Managing Entries
- **Edit**: Click the "Edit" button next to any entry
- **Delete**: Click "Delete" to remove an entry
- **View Passwords**: Click on password fields to toggle visibility

### Security Notes
- Your master password is never stored - only a hash is kept for verification
- All password data is encrypted using AES encryption
- Data is stored locally in your user data directory
- No data is sent to external servers

## Development

### Project Structure
```
fastpw2/
├── main.js          # Electron main process
├── preload.js       # Security preload script
├── renderer.js      # Frontend JavaScript
├── index.html       # Main UI layout
├── styles.css       # Application styling
├── crypto.js        # Encryption utilities
├── package.json     # Dependencies and scripts
└── README.md        # This file
```

### Technologies Used
- **Electron**: Cross-platform desktop app framework
- **CryptoJS**: AES encryption for password security
- **HTML/CSS/JavaScript**: Frontend interface

## Security Considerations

This is a basic password manager for demonstration purposes. For production use, consider:

- Using more secure encryption methods (like PBKDF2 for key derivation)
- Implementing password strength requirements
- Adding backup/export functionality
- Using a more robust database solution
- Adding two-factor authentication

## License

MIT License - feel free to use and modify as needed.
