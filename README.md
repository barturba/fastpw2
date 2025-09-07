# FastPW2 - Streamlined Password Manager

A secure, desktop password manager built with Electron that stores your passwords locally with encryption.

## Features

- **Secure Storage**: AES-256 encryption; key derived via PBKDF2 (SHA-256, 200k iterations)
- **Master Password**: Single master password protects all your stored credentials
- **Two-Column Layout**:
  - Company: The service/website name
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

## Packaging / Distribution

- Local builds:
  - macOS/Linux/Windows targets from any platform:
    ```bash
    npm run dist
    ```
  - To publish on GitHub Releases when pushing a tag:
    ```bash
    git tag v1.3.1 && git push origin v1.3.1
    ```
    The CI will run and upload assets.

### Build Scripts

- `npm run build`: Run electron-builder for current OS
- `npm run dist`: Build for macOS, Windows and Linux (`-mwl`)
- `npm run release`: Build and publish on tag or draft (needs `GH_TOKEN`)

### CI (GitHub Actions)

A workflow at `.github/workflows/release.yml` builds on macOS, Windows, and Linux.

- On branch pushes: it builds installers and uploads them as workflow artifacts
- On tags starting with `v*`: it publishes to GitHub Releases

No additional secrets are needed; `GITHUB_TOKEN` is provided automatically.

## Usage

### First Time Setup
1. On first run (no master password yet), you will be taken to a dedicated setup screen.
2. Enter your master password twice to confirm (minimum 8 characters).
3. After creation, you'll be taken into the app. The password will be stored in a secure 14‑day keychain cache for convenience.
4. If a master password already exists, you'll see the login screen instead.

### Adding Password Entries
1. Click "Add New Entry" in the main interface
2. Fill in:
   - **Company**: Name of the service (e.g., "Google", "GitHub")
   - **Fields**: Add username, password, API keys, etc.
3. Click "Save" to store the entry

### Managing Entries
- **Edit**: Click the "Edit" button next to any entry
- **Delete**: Click "Delete" to remove an entry
- **View Passwords**: Click on password fields to toggle visibility

### Security Notes
- Your master password is never stored — a PBKDF2-derived verifier (JSON with salt, iterations, hash) is kept
- All password data is encrypted using AES-256 with a random IV; keys derived via PBKDF2-SHA256 (200k iters)
- Data is stored locally in your user data directory
- No data is sent to external servers
- No legacy compatibility: older non-PBKDF2 formats are not supported

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
- **CryptoJS**: PBKDF2 (SHA-256) key derivation and AES-256 encryption
- **HTML/CSS/JavaScript**: Frontend interface

## Security Considerations

This is a basic password manager for demonstration purposes. For production use, consider:

- Increasing PBKDF2 iterations over time and providing in-app migration
- Implementing password strength requirements
- Adding backup/export functionality
- Using a more robust database solution
- Adding two-factor authentication

## License

MIT License - feel free to use and modify as needed.
