# sprout
By plants, for plants

## Run locally (novice-friendly)

### 1) Install prerequisites
- **Node.js 18+** (includes npm). If you do not have Node installed, download it from https://nodejs.org and install the LTS version.

### 2) Get the code from GitHub
```bash
git clone <YOUR_REPO_URL>
cd sprout
```

### 3) Install project dependencies
```bash
npm install
```

### 4) Start the development server
```bash
npm run dev
```
- Vite will print a local URL (usually http://localhost:5173). Open that in your browser.

### 5) Run tests (optional)
```bash
npm run test
```

### Troubleshooting
- If `npm install` fails with a 403 or registry error, your network may block npm. Try the steps below in order:
  1) **Verify the registry you’re using:**
     ```bash
     npm config get registry
     ```
     The default should be `https://registry.npmjs.org/`.
  2) **Reset to the public registry (if allowed by your network):**
     ```bash
     npm config set registry https://registry.npmjs.org/
     ```
  3) **If you’re on a corporate network**, ask for the approved registry URL and set it:
     ```bash
     npm config set registry https://<your-company-registry>
     ```
  4) **If a proxy is required**, ensure your proxy is configured in npm:
     ```bash
     npm config set proxy http://<proxy-host>:<proxy-port>
     npm config set https-proxy http://<proxy-host>:<proxy-port>
     ```
  5) **Try again:**
     ```bash
     npm install
     ```
