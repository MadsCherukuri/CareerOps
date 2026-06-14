const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = 3000;
const CAREER_OPS_DIR = path.join(__dirname, '..');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper to parse markdown table
function parseApplicationsTable(mdContent) {
  const lines = mdContent.split('\n').filter(l => l.trim().startsWith('|'));
  if (lines.length < 3) return []; // No data
  
  const headers = lines[0].split('|').map(h => h.trim()).slice(1, -1);
  const dataLines = lines.slice(2);
  
  return dataLines.map(line => {
    const cells = line.split('|').map(c => c.trim()).slice(1, -1);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cells[i] || '';
    });
    return row;
  });
}

// Get Applications
app.get('/api/applications', (req, res) => {
  const appPath = path.join(CAREER_OPS_DIR, 'data', 'applications.md');
  try {
    const content = fs.readFileSync(appPath, 'utf8');
    const apps = parseApplicationsTable(content);
    res.json(apps);
  } catch (error) {
    res.status(500).json({ error: 'Could not read applications.md', details: error.message });
  }
});

// Run commands
app.post('/api/run', (req, res) => {
  const { command } = req.body;
  
  // Basic security: only allow specific npm/node scripts
  const allowedCommands = ['node scan.mjs', 'node verify-pipeline.mjs', 'node doctor.mjs', 'node merge-tracker.mjs'];
  if (!allowedCommands.includes(command)) {
    return res.status(403).json({ error: 'Command not permitted' });
  }

  // Load nvm if necessary and run command
  const nvmLoader = `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" &&`;
  
  exec(`${nvmLoader} ${command}`, { cwd: CAREER_OPS_DIR }, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: error.message, stderr, stdout });
    }
    res.json({ stdout, stderr });
  });
});

app.listen(PORT, () => {
  console.log(`Career-Ops Dashboard running on http://localhost:${PORT}`);
});
