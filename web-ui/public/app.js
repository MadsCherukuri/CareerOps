document.addEventListener('DOMContentLoaded', () => {
  loadPipeline();

  // Button Listeners
  document.getElementById('btn-scan').addEventListener('click', () => runCommand('node scan.mjs'));
  document.getElementById('btn-verify').addEventListener('click', () => runCommand('node verify-pipeline.mjs'));
  document.getElementById('btn-doctor').addEventListener('click', () => runCommand('node doctor.mjs'));
  
  // Modal Listeners
  document.getElementById('close-modal').addEventListener('click', closeModal);
});

async function loadPipeline() {
  try {
    const response = await fetch('/api/applications');
    const data = await response.json();
    renderTable(data);
    renderStats(data);
  } catch (error) {
    console.error('Failed to load applications:', error);
  }
}

function renderTable(data) {
  const tbody = document.querySelector('#applications-table tbody');
  const emptyState = document.getElementById('empty-state');
  
  tbody.innerHTML = '';
  
  if (!data || data.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  
  data.forEach(app => {
    // Basic mapping of markdown row cells
    // The columns usually are: #, Date, Company, Role, Score, Status, PDF, Report, Notes
    const id = app['#'] || '-';
    const date = app['Date'] || '-';
    const company = app['Company'] || '-';
    const role = app['Role'] || '-';
    const score = app['Score'] || '-';
    const status = app['Status'] || '-';
    const notes = app['Notes'] || '';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${id}</td>
      <td>${date}</td>
      <td><strong>${company}</strong></td>
      <td>${role}</td>
      <td>${score}</td>
      <td><span class="status-badge status-${status.trim()}">${status}</span></td>
      <td style="color: var(--text-secondary); max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${notes}">${notes}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderStats(data) {
  const statsContainer = document.getElementById('pipeline-stats');
  if (!data) return;

  const total = data.length;
  const applied = data.filter(d => d['Status'] && d['Status'].trim() === 'Applied').length;
  const interviews = data.filter(d => d['Status'] && d['Status'].trim() === 'Interview').length;

  statsContainer.innerHTML = `
    <div class="stat-item">
      <span class="stat-value">${total}</span>
      <span class="stat-label">Total roles</span>
    </div>
    <div class="stat-item">
      <span class="stat-value">${applied}</span>
      <span class="stat-label">Applied</span>
    </div>
    <div class="stat-item">
      <span class="stat-value">${interviews}</span>
      <span class="stat-label">Interviews</span>
    </div>
  `;
}

async function runCommand(command) {
  openModal();
  const terminal = document.getElementById('terminal-output');
  terminal.innerHTML = `Running command: <strong>${command}</strong><br>Waiting for output...<br><br>`;

  try {
    const res = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    });
    
    const result = await res.json();
    
    let outputText = '';
    if (result.error) {
      outputText = `<strong>Error:</strong><br>${result.error}<br><br><strong>Stderr:</strong><br>${result.stderr || ''}`;
    } else {
      outputText = `<strong>Success!</strong><br><br><strong>Output:</strong><br>${result.stdout || ''}<br>${result.stderr || ''}`;
    }
    
    // Convert URLs to clickable links and newlines to <br>
    const formattedOutput = outputText
      .replace(/</g, '&lt;') // Escape HTML to prevent injection
      .replace(/>/g, '&gt;')
      .replace(/&lt;strong&gt;/g, '<strong>') // Restore our bold tags
      .replace(/&lt;\/strong&gt;/g, '</strong>')
      .replace(/&lt;br&gt;/g, '<br>') // Restore our breaks
      .replace(/\n/g, '<br>') // Convert newlines
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color: #60a5fa; text-decoration: underline;">$1</a>'); // Linkify URLs

    terminal.innerHTML += formattedOutput;
    
    // Refresh table after command
    loadPipeline();
    
  } catch (err) {
    terminal.innerHTML += `<br><strong>Failed to run command:</strong><br>${err.message}`;
  }
}

function openModal() {
  document.getElementById('terminal-modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('terminal-modal').classList.add('hidden');
}
