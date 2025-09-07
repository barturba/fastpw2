# FastPW2

A lightweight, local-first password manager built with Electron. All data is encrypted on your device and never leaves it.

## What it does
- **Local encryption**: AES-256 with keys derived via PBKDF2 (SHA-256, 200k iterations)
- **Master password**: Protects all entries; never stored
- **Keychain cache**: Optional 14‑day cache of the master password using the OS keychain
- **Simple UI**: Companies → Logins → Details, with add/edit/delete and password visibility toggle
- **Cross‑platform**: macOS, Windows, Linux

## Quick start
```bash
npm install
npm start
```

## Build
- Current OS:
  ```bash
  npm run build
  ```
- All platforms (macOS, Windows, Linux):
  ```bash
  npm run dist
  ```
- Publish on tag or draft (requires GitHub token in CI):
  ```bash
  npm run release
  ```

## How it stores data
- Verifier file `master.hash` (JSON) in Electron `userData` directory
- Encrypted entries `passwords.enc` in the same directory
- No network calls; no telemetry

## Development
```
fastpw2/
├── main.js       # Electron main process
├── preload.js    # Preload (context isolation)
├── renderer.js   # UI logic
├── index.html    # UI layout
├── styles.css    # Styling
├── crypto.js     # Crypto utilities
├── package.json  # Scripts & config
└── README.md
```

## Security notes
- Master password must be at least 8 characters
- PBKDF2 parameters and salt are stored with the verifier for future derivation
- Consider increasing iterations over time with a migration flow

## License
MIT
