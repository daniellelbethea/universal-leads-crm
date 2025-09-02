/**
 * Universal Leads CRM simplified script.
 * Manages leads, clients, tasks, campaigns and settings using localStorage.
 * Renders UI components and handles interactions.
 */
(function() {
  'use strict';
  const STORAGE_KEY = 'universalLeadsCRMData';
  let data = {
    leads: [],
    clients: [],
    tasks: [],
    campaigns: [],
    settings: {
      stages: ['New','Contacted','Qualified','Proposal','Won','Lost'],
      scoringRules: []
    }
  };
  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
  function loadData() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        Object.assign(data, parsed);
      } catch(e) {
        console.warn('Failed to parse stored data', e);
        saveData();
      }
    }
  }
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2,5);
  }
  // Navigation and page rendering
  function renderPage(pageId) {
    document.querySelectorAll('main .page').forEach(section => {
      section.hidden = section.id !== pageId;
    });
    document.querySelectorAll('nav .nav-list a').forEach(a => {
      a.classList.toggle('active', a.dataset.page === pageId);
    });
    switch(pageId) {
      case 'dashboard': updateDashboard(); break;
      case 'leads': renderLeadsTable(); break;
      case 'pipeline': renderPipeline(); break;
      case 'clients': renderClientsTable(); break;
      case 'tasks': renderTasksTable(); break;
      case 'campaigns': renderCampaignsTable(); break;
      case 'settings': renderSettings(); break;
    }
  }
  document.querySelectorAll('nav .nav-list a').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      renderPage(a.dataset.page);
    });
  });
  // Dashboard update
  function updateDashboard() {
    document.getElementById('stat-total-leads').textContent = data.leads.length;
    document.getElementById('stat-total-clients').textContent = data.clients.length;
    document.getElementById('stat-open-tasks').textContent = data.tasks.filter(t => t.status !== 'Done').length;
    document.getElementById('stat-running-campaigns').textContent = data.campaigns.length;
    const today = new Date().toISOString().split('T')[0];
    const list = document.getElementById('todays-tasks');
    list.innerHTML = '';
    data.tasks.filter(t => t.dueDate && t.dueDate.startsWith(today)).forEach(task => {
      const li = document.createElement('li');
      li.textContent = `${task.title} (due ${new Date(task.dueDate).toLocaleDateString()})`;
      if (task.status === 'Done') li.classList.add('done');
      list.appendChild(li);
    });
  }
  // Quick add lead
  const quickForm = document.getElementById('quick-add-form');
  if (quickForm) {
    quickForm.addEventListener('submit', e => {
      e.preventDefault();
      const name = quickForm.querySelector('[name="name"]').value.trim();
      const email = quickForm.querySelector('[name="email"]').value.trim();
      const phone = quickForm.querySelector('[name="phone"]').value.trim();
      if (!name) return;
      data.leads.push({ id: generateId(), name, email, phone, status: data.settings.stages[0], source:'', tags: [], notes:'' });
      saveData();
      quickForm.reset();
      updateDashboard();
      renderLeadsTable();
      renderPipeline();
    });
  }
  // Leads table
  function renderLeadsTable() {
    const tbody = document.getElementById('leads-table-body');
    if (!tbody) return;
    const statusSel = document.getElementById('lead-filter-status');
    statusSel.innerHTML = '<option value="">All Statuses</option>';
    data.settings.stages.forEach(stage => {
      const opt = document.createElement('option');
      opt.value = stage;
      opt.textContent = stage;
      statusSel.appendChild(opt);
    });
    const searchTerm = document.getElementById('lead-search-input').value.toLowerCase();
    const filterStatus = statusSel.value;
    tbody.innerHTML = '';
    data.leads.filter(lead => {
      const matchesStatus = filterStatus ? lead.status === filterStatus : true;
      const matchesSearch = !searchTerm || lead.name.toLowerCase().includes(searchTerm) || (lead.email || '').toLowerCase().includes(searchTerm) || (lead.phone || '').toLowerCase().includes(searchTerm);
      return matchesStatus && matchesSearch;
    }).forEach(lead => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${lead.name}</td>
        <td>${lead.email || ''}</td>
        <td>${lead.phone || ''}</td>
        <td>${lead.status}</td>
        <td>${lead.source || ''}</td>
        <td>${computeLeadScore(lead)}</td>
        <td class="actions"></td>
      `;
      const actions = tr.querySelector('.actions');
      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => openLeadModal(lead));
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', () => {
        if (confirm('Delete this lead?')) {
          data.leads = data.leads.filter(l => l.id !== lead.id);
          saveData();
          renderLeadsTable();
          renderPipeline();
          updateDashboard();
        }
      });
      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
      tbody.appendChild(tr);
    });
  }
  // Compute lead score using scoring rules
  function computeLeadScore(lead) {
    if (!data.settings.scoringRules.length) return 0;
    let score = 0;
    const tags = (lead.tags || []).map(t => t.toLowerCase());
    const source = (lead.source || '').toLowerCase();
    data.settings.scoringRules.forEach(rule => {
      const name = rule.name.toLowerCase();
      if (tags.includes(name) || source === name) score += parseInt(rule.value, 10) || 0;
    });
    return score;
  }
  // Lead modal
  function openLeadModal(lead) {
    const isNew = !lead;
    const obj = isNew ? { id: generateId(), name:'', email:'', phone:'', status:data.settings.stages[0], source:'', tags:[], notes:'' } : Object.assign({}, lead);
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h3>${isNew ? 'New Lead' : 'Edit Lead'}</h3>
        <form id="lead-form">
          <input type="text" name="name" placeholder="Name" value="${obj.name}" required>
          <input type="email" name="email" placeholder="Email" value="${obj.email}">
          <input type="tel" name="phone" placeholder="Phone" value="${obj.phone}">
          <select name="status">${data.settings.stages.map(st => `<option value="${st}" ${obj.status===st?'selected':''}>${st}</option>`).join('')}</select>
          <input type="text" name="source" placeholder="Source" value="${obj.source}">
          <input type="text" name="tags" placeholder="Tags (comma separated)" value="${obj.tags.join(', ')}">
          <textarea name="notes" placeholder="Notes">${obj.notes || ''}</textarea>
          <button type="submit">Save</button>
          <button type="button" id="cancel-btn">Cancel</button>
        </form>
      </div>
    `;
    document.body.appendChild(overlay);
    const form = overlay.querySelector('#lead-form');
    form.addEventListener('submit', e => {
      e.preventDefault();
      obj.name = form.name.value.trim();
      obj.email = form.email.value.trim();
      obj.phone = form.phone.value.trim();
      obj.status = form.status.value;
      obj.source = form.source.value.trim();
      obj.tags = form.tags.value.split(',').map(s => s.trim()).filter(s => s);
      obj.notes = form.notes.value.trim();
      if (isNew) {
        data.leads.push(obj);
      } else {
        const idx = data.leads.findIndex(l => l.id === obj.id);
        if (idx > -1) data.leads[idx] = obj;
      }
      saveData();
      renderLeadsTable();
      renderPipeline();
      updateDashboard();
      document.body.removeChild(overlay);
    });
    overlay.querySelector('#cancel-btn').addEventListener('click', () => {
      document.body.removeChild(overlay);
    });
  }
  // Pipeline rendering and drag-n-drop
  function renderPipeline() {
    const board = document.getElementById('pipeline-board');
    if (!board) return;
    board.innerHTML = '';
    data.settings.stages.forEach(stage => {
      const col = document.createElement('div');
      col.className = 'pipeline-column';
      col.dataset.stage = stage;
      col.innerHTML = `
        <h3>${stage}</h3>
        <div class="column-content" data-stage="${stage}"></div>
      `;
      board.appendChild(col);
    });
    data.leads.forEach(lead => {
      const card = document.createElement('div');
      card.className = 'lead-card';
      card.draggable = true;
      card.dataset.id = lead.id;
      card.innerHTML = `<strong>${lead.name}</strong><br><small>${lead.email || ''}</small>`;
      const column = board.querySelector(`.column-content[data-stage="${lead.status}"]`);
      if (column) column.appendChild(card);
    });
    board.querySelectorAll('.lead-card').forEach(card => {
      card.addEventListener('dragstart', e => {
        card.classList.add('dragging');
        e.dataTransfer.setData('text/plain', card.dataset.id);
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
      });
    });
    board.querySelectorAll('.column-content').forEach(col => {
      col.addEventListener('dragover', e => {
        e.preventDefault();
      });
      col.addEventListener('drop', e => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain');
        const lead = data.leads.find(l => l.id === id);
        if (!lead) return;
        lead.status = col.dataset.stage;
        saveData();
        renderPipeline();
        renderLeadsTable();
      });
    });
  }
  // Clients table
  function renderClientsTable() {
    const tbody = document.getElementById('clients-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    data.clients.forEach(client => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${client.name}</td>
        <td>${client.company || ''}</td>
        <td>${client.value || ''}</td>
        <td>${client.status || ''}</td>
        <td class="actions"></td>
      `;
      const actions = tr.querySelector('.actions');
      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => openClientModal(client));
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', () => {
        if (confirm('Delete this client?')) {
          data.clients = data.clients.filter(c => c.id !== client.id);
          saveData();
          renderClientsTable();
          updateDashboard();
        }
      });
      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
      tbody.appendChild(tr);
    });
  }
  function openClientModal(client) {
    const isNew = !client;
    const obj = isNew ? { id: generateId(), name:'', company:'', value:'', status:'', notes:'' } : Object.assign({}, client);
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h3>${isNew ? 'New Client' : 'Edit Client'}</h3>
        <form id="client-form">
          <input type="text" name="name" placeholder="Contact Name" value="${obj.name}" required>
          <input type="text" name="company" placeholder="Company" value="${obj.company}">
          <input type="text" name="value" placeholder="Client Value" value="${obj.value}">
          <input type="text" name="status" placeholder="Status" value="${obj.status}">
          <textarea name="notes" placeholder="Notes">${obj.notes || ''}</textarea>
          <button type="submit">Save</button>
          <button type="button" id="cancel">Cancel</button>
        </form>
      </div>
    `;
    document.body.appendChild(overlay);
    const form = overlay.querySelector('#client-form');
    form.addEventListener('submit', e => {
      e.preventDefault();
      obj.name = form.name.value.trim();
      obj.company = form.company.value.trim();
      obj.value = form.value.value.trim();
      obj.status = form.status.value.trim();
      obj.notes = form.notes.value.trim();
      if (isNew) {
        data.clients.push(obj);
      } else {
        const idx = data.clients.findIndex(c => c.id === obj.id);
        if (idx > -1) data.clients[idx] = obj;
      }
      saveData();
      renderClientsTable();
      updateDashboard();
      document.body.removeChild(overlay);
    });
    overlay.querySelector('#cancel').addEventListener('click', () => {
      document.body.removeChild(overlay);
    });
  }
  // Tasks
  function renderTasksTable() {
    const tbody = document.getElementById('tasks-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    data.tasks.forEach(task => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${task.title}</td>
        <td>${task.dueDate || ''}</td>
        <td>${task.priority || ''}</td>
        <td>${task.status}</td>
        <td class="actions"></td>
      `;
      const actions = tr.querySelector('.actions');
      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => openTaskModal(task));
      const doneBtn = document.createElement('button');
      doneBtn.textContent = task.status === 'Done' ? 'Open' : 'Done';
      doneBtn.addEventListener('click', () => {
        task.status = task.status === 'Done' ? 'Open' : 'Done';
        saveData();
        renderTasksTable();
        updateDashboard();
      });
      actions.appendChild(editBtn);
      actions.appendChild(doneBtn);
      tbody.appendChild(tr);
    });
  }
  function openTaskModal(task) {
    const isNew = !task;
    const obj = isNew ? { id: generateId(), title:'', dueDate:'', priority:'', status:'Open', notes:'' } : Object.assign({}, task);
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h3>${isNew ? 'New Task' : 'Edit Task'}</h3>
        <form id="task-form">
          <input type="text" name="title" placeholder="Title" value="${obj.title}" required>
          <input type="date" name="dueDate" value="${obj.dueDate}">
          <select name="priority">
            <option value="Low" ${obj.priority==='Low'?'selected':''}>Low</option>
            <option value="Medium" ${obj.priority==='Medium'?'selected':''}>Medium</option>
            <option value="High" ${obj.priority==='High'?'selected':''}>High</option>
          </select>
          <select name="status">
            <option value="Open" ${obj.status==='Open'?'selected':''}>Open</option>
            <option value="Done" ${obj.status==='Done'?'selected':''}>Done</option>
          </select>
          <textarea name="notes" placeholder="Notes">${obj.notes || ''}</textarea>
          <button type="submit">Save</button>
          <button type="button" id="cancel">Cancel</button>
        </form>
      </div>
    `;
    document.body.appendChild(overlay);
    const form = overlay.querySelector('#task-form');
    form.addEventListener('submit', e => {
      e.preventDefault();
      obj.title = form.title.value.trim();
      obj.dueDate = form.dueDate.value;
      obj.priority = form.priority.value;
      obj.status = form.status.value;
      obj.notes = form.notes.value.trim();
      if (isNew) {
        data.tasks.push(obj);
      } else {
        const idx = data.tasks.findIndex(t => t.id === obj.id);
        if (idx > -1) data.tasks[idx] = obj;
      }
      saveData();
      renderTasksTable();
      updateDashboard();
      document.body.removeChild(overlay);
    });
    overlay.querySelector('#cancel').addEventListener('click', () => {
      document.body.removeChild(overlay);
    });
  }
  // Campaigns
  function renderCampaignsTable() {
    const tbody = document.getElementById('campaigns-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    data.campaigns.forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${c.name}</td>
        <td>${c.startDate || ''}</td>
        <td>${c.endDate || ''}</td>
        <td>${c.steps ? c.steps.length : 0}</td>
        <td class="actions"></td>
      `;
      const actions = tr.querySelector('.actions');
      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => openCampaignModal(c));
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', () => {
        if (confirm('Delete this campaign?')) {
          data.campaigns = data.campaigns.filter(x => x.id !== c.id);
          saveData();
          renderCampaignsTable();
          updateDashboard();
        }
      });
      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
      tbody.appendChild(tr);
    });
  }
  function openCampaignModal(campaign) {
    const isNew = !campaign;
    const obj = isNew ? { id: generateId(), name:'', startDate:'', endDate:'', steps:[], notes:'' } : Object.assign({}, campaign);
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h3>${isNew ? 'New Campaign' : 'Edit Campaign'}</h3>
        <form id="campaign-form">
          <input type="text" name="name" placeholder="Campaign Name" value="${obj.name}" required>
          <input type="date" name="startDate" value="${obj.startDate}">
          <input type="date" name="endDate" value="${obj.endDate}">
          <textarea name="notes" placeholder="Notes">${obj.notes || ''}</textarea>
          <button type="submit">Save</button>
          <button type="button" id="cancel">Cancel</button>
        </form>
      </div>
    `;
    document.body.appendChild(overlay);
    const form = overlay.querySelector('#campaign-form');
    form.addEventListener('submit', e => {
      e.preventDefault();
      obj.name = form.name.value.trim();
      obj.startDate = form.startDate.value;
      obj.endDate = form.endDate.value;
      obj.notes = form.notes.value.trim();
      if (isNew) {
        data.campaigns.push(obj);
      } else {
        const idx = data.campaigns.findIndex(x => x.id === obj.id);
        if (idx > -1) data.campaigns[idx] = obj;
      }
      saveData();
      renderCampaignsTable();
      updateDashboard();
      document.body.removeChild(overlay);
    });
    overlay.querySelector('#cancel').addEventListener('click', () => {
      document.body.removeChild(overlay);
    });
  }
  // Settings (scoring rules & stages)
  function renderSettings() {
    const stagesList = document.getElementById('stage-list');
    if (stagesList) {
      stagesList.innerHTML = '';
      data.settings.stages.forEach((stage, idx) => {
        const li = document.createElement('li');
        li.textContent = stage;
        const del = document.createElement('button');
        del.textContent = 'x';
        del.addEventListener('click', () => {
          data.settings.stages.splice(idx,1);
          saveData();
          renderSettings();
          renderPipeline();
          renderLeadsTable();
        });
        li.appendChild(del);
        stagesList.appendChild(li);
      });
      const addStage = document.getElementById('add-stage-form');
      if (addStage) {
        addStage.onsubmit = ev => {
          ev.preventDefault();
          const val = addStage.stage.value.trim();
          if (val && !data.settings.stages.includes(val)) {
            data.settings.stages.push(val);
            saveData();
            renderSettings();
            renderPipeline();
            renderLeadsTable();
            addStage.reset();
          }
        };
      }
    }
    const ruleList = document.getElementById('scoring-rule-list');
    if (ruleList) {
      ruleList.innerHTML = '';
      data.settings.scoringRules.forEach((rule, idx) => {
        const li = document.createElement('li');
        li.textContent = `${rule.name}: ${rule.value}`;
        const del = document.createElement('button');
        del.textContent = 'x';
        del.addEventListener('click', () => {
          data.settings.scoringRules.splice(idx,1);
          saveData();
          renderSettings();
        });
        li.appendChild(del);
        ruleList.appendChild(li);
      });
      const ruleForm = document.getElementById('add-rule-form');
      if (ruleForm) {
        ruleForm.onsubmit = ev => {
          ev.preventDefault();
          const name = ruleForm.ruleName.value.trim();
          const value = parseInt(ruleForm.ruleValue.value, 10) || 0;
          if (name) {
            data.settings.scoringRules.push({ id: generateId(), name, value });
            saveData();
            renderSettings();
            ruleForm.reset();
          }
        };
      }
    }
  }
  // Import and export leads
  const importInput = document.getElementById('import-input');
  if (importInput) {
    importInput.addEventListener('change', e => {
      const file = importInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const imported = JSON.parse(ev.target.result);
          if (Array.isArray(imported)) {
            data.leads = imported;
            saveData();
            renderLeadsTable();
            renderPipeline();
            updateDashboard();
          }
        } catch(err) {
          alert('Failed to import leads. Invalid JSON.');
        }
      };
      reader.readAsText(file);
      importInput.value = '';
    });
  }
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const json = JSON.stringify(data.leads, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'leads.json';
      a.click();
      URL.revokeObjectURL(url);
    });
  }
  loadData();
  renderPage('dashboard');
  renderPipeline();
})();
