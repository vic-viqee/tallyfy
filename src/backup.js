async function exportBackup() {
  try {
    const data = await dbApi.exportAllData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `tallyfy-backup-${date}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    showToast('Backup downloaded!');
  } catch (error) {
    showToast('Backup failed: ' + error.message);
  }
}

function triggerImport() {
  document.getElementById('import-file').click();
}

async function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);
    
    if (!data.products || !data.customers) {
      showToast('Invalid backup file');
      return;
    }

    showModal(`
      <h2>Restore Backup</h2>
      <p style="text-align: center; margin-bottom: 16px;">
        This will replace all current data with the backup.<br>
        Are you sure?
      </p>
      <div class="modal-actions">
        <button class="btn btn-surface" onclick="hideModal()">Cancel</button>
        <button class="btn btn-danger" onclick="confirmImport()">Restore</button>
      </div>
    `);

    window.pendingBackupData = data;
  } catch (error) {
    showToast('Failed to read file: ' + error.message);
  }

  event.target.value = '';
}

async function confirmImport() {
  try {
    await dbApi.importAllData(window.pendingBackupData);
    hideModal();
    showToast('Backup restored!');
    
    window.location.reload();
  } catch (error) {
    showToast('Restore failed: ' + error.message);
  }
}

function initBackup() {
  document.getElementById('export-btn').addEventListener('click', exportBackup);
  document.getElementById('import-btn').addEventListener('click', triggerImport);
  document.getElementById('import-file').addEventListener('change', handleImport);
}