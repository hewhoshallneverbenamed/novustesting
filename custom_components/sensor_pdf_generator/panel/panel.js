class PdfGeneratorPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.users = []; // Will be filled from hass
    this.filteredUsers = [];
    this.selectedUser = null;
    this.shadowRoot.innerHTML = `
      <style>
        * {
          box-sizing: border-box;
        }

        :host {
          --ha-primary-color: #03a9f4;
          --ha-primary-dark: #0288d1;
          --ha-success-color: #4caf50;
          --ha-error-color: #f44336;
          --ha-warning-color: #ff9800;
          
          /* Light theme defaults */
          --bg-primary: #fafafa;
          --bg-secondary: #ffffff;
          --bg-tertiary: #f5f5f5;
          --text-primary: #212121;
          --text-secondary: #757575;
          --text-tertiary: #9e9e9e;
          --border-color: #e0e0e0;
          --shadow-light: rgba(0, 0, 0, 0.05);
          --shadow-medium: rgba(0, 0, 0, 0.1);
          --shadow-heavy: rgba(0, 0, 0, 0.15);
          
          display: flex;
          height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          background: var(--bg-primary);
          color: var(--text-primary);
          overflow: hidden;
        }

        /* Dark theme */
        @media (prefers-color-scheme: dark) {
          :host {
            --bg-primary: #0d1117;
            --bg-secondary: #161b22;
            --bg-tertiary: #21262d;
            --text-primary: #f0f6fc;
            --text-secondary: #8b949e;
            --text-tertiary: #656d76;
            --border-color: #30363d;
            --shadow-light: rgba(0, 0, 0, 0.3);
            --shadow-medium: rgba(0, 0, 0, 0.5);
            --shadow-heavy: rgba(0, 0, 0, 0.7);
          }
        }

        /* Layout */
        .sidebar {
          width: 400px;
          background: var(--bg-secondary);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 24px;
          padding: 24px;
          overflow-y: auto;
        }

        /* Sidebar Header */
        .sidebar-header {
          padding: 24px;
          border-bottom: 1px solid var(--border-color);
          background: var(--bg-secondary);
        }

        .sidebar-header h1 {
          margin: 0 0 16px 0;
          font-size: 24px;
          font-weight: 600;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }

        /* Search Input */
        .search-container {
          position: relative;
        }

        .search-input {
          width: 100%;
          padding: 12px 16px 12px 44px;
          border: 2px solid var(--border-color);
          border-radius: 12px;
          background: var(--bg-tertiary);
          color: var(--text-primary);
          font-size: 14px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .search-input:focus {
          outline: none;
          border-color: var(--ha-primary-color);
          background: var(--bg-secondary);
          box-shadow: 0 0 0 4px rgba(3, 169, 244, 0.1);
        }

        .search-input::placeholder {
          color: var(--text-tertiary);
        }

        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-tertiary);
          pointer-events: none;
        }

        /* User List */
        .user-list-container {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .user-list {
          flex: 1;
          overflow-y: auto;
          padding: 0 16px;
          margin: 0;
          list-style: none;
        }

        .user-item {
          padding: 14px 16px;
          margin: 6px 0;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          background: transparent;
          color: var(--text-primary);
          font-weight: 500;
          border: 2px solid transparent;
          position: relative;
          overflow: hidden;
        }

        .user-item::before {
          content: '';
          position: absolute;
          inset: 0;
          background: var(--ha-primary-color);
          opacity: 0;
          transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: -1;
        }

        .user-item:hover {
          background: var(--bg-tertiary);
          transform: translateX(4px);
        }

        .user-item.selected {
          background: rgba(3, 169, 244, 0.08);
          border-color: var(--ha-primary-color);
          color: var(--ha-primary-color);
          transform: translateX(6px);
        }

        .user-item.selected::before {
          opacity: 0.05;
        }

        /* Generate Button */
        .generate-section {
          padding: 16px 24px 24px;
          border-top: 1px solid var(--border-color);
        }

        .generate-btn {
          width: 100%;
          padding: 16px 24px;
          background: var(--ha-primary-color);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .generate-btn:hover:not(:disabled) {
          background: var(--ha-primary-dark);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(3, 169, 244, 0.3);
        }

        .generate-btn:active:not(:disabled) {
          transform: translateY(-1px);
        }

        .generate-btn:disabled {
          background: var(--text-tertiary);
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
          opacity: 0.6;
        }

        .status-message {
          margin-top: 12px;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 14px;
          text-align: center;
          font-weight: 500;
          min-height: 20px;
        }

        .status-message.success {
          background: rgba(76, 175, 80, 0.1);
          color: var(--ha-success-color);
          border: 1px solid rgba(76, 175, 80, 0.2);
        }

        .status-message.error {
          background: rgba(244, 67, 54, 0.1);
          color: var(--ha-error-color);
          border: 1px solid rgba(244, 67, 54, 0.2);
        }

        .status-message.loading {
          background: rgba(3, 169, 244, 0.1);
          color: var(--ha-primary-color);
          border: 1px solid rgba(3, 169, 244, 0.2);
        }

        /* Cards */
        .card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 2px 8px var(--shadow-light);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .card:hover {
          box-shadow: 0 8px 24px var(--shadow-medium);
          transform: translateY(-2px);
        }

        .card-title {
          margin: 0 0 20px 0;
          font-size: 20px;
          font-weight: 600;
          color: var(--text-primary);
          letter-spacing: -0.01em;
        }

        /* Stats */
        .stats-grid {
          display: grid;
          gap: 16px;
        }

        .stat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 0;
          border-bottom: 1px solid var(--border-color);
        }

        .stat-item:last-child {
          border-bottom: none;
        }

        .stat-label {
          font-weight: 500;
          color: var(--text-secondary);
          font-size: 14px;
        }

        .stat-value {
          font-weight: 700;
          color: var(--text-primary);
          font-size: 16px;
          font-variant-numeric: tabular-nums;
        }

        /* PDF List */
        .pdf-list {
          list-style: none;
          padding: 0;
          margin: 0;
          max-height: 300px;
          overflow-y: auto;
        }

        .pdf-item {
          padding: 12px 16px;
          margin: 8px 0;
          background: var(--bg-tertiary);
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 14px;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .pdf-item:hover {
          background: var(--bg-secondary);
          color: var(--text-primary);
          transform: translateX(4px);
        }

        /* Scrollbars */
        .user-list::-webkit-scrollbar,
        .pdf-list::-webkit-scrollbar,
        .main-content::-webkit-scrollbar {
          width: 6px;
        }

        .user-list::-webkit-scrollbar-track,
        .pdf-list::-webkit-scrollbar-track,
        .main-content::-webkit-scrollbar-track {
          background: transparent;
        }

        .user-list::-webkit-scrollbar-thumb,
        .pdf-list::-webkit-scrollbar-thumb,
        .main-content::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 3px;
        }

        .user-list::-webkit-scrollbar-thumb:hover,
        .pdf-list::-webkit-scrollbar-thumb:hover,
        .main-content::-webkit-scrollbar-thumb:hover {
          background: var(--text-tertiary);
        }

        /* Responsive */
        @media (max-width: 768px) {
          :host {
            flex-direction: column;
          }

          .sidebar {
            width: 100%;
            max-height: 50vh;
          }

          .main-content {
            padding: 16px;
          }

          .card {
            padding: 20px;
          }
        }

        /* Loading animation */
        .loading {
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* Icons */
        .icon {
          width: 20px;
          height: 20px;
        }

        /* Hide original content */
        .original-content {
          display: none;
        }
      </style>

      <div class="sidebar">
        <div class="sidebar-header">
          <h1>Receipt Generator</h1>
          <div class="search-container">
            <svg class="search-icon icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input id="search" class="search-input" type="text" placeholder="Search users..." />
          </div>
        </div>
        
        <div class="user-list-container">
          <ul id="user-list" class="user-list"></ul>
        </div>
        
        <div class="generate-section">
          <button id="generate" class="generate-btn" disabled>Generate Receipt</button>
          <div id="status" class="status-message"></div>
        </div>
      </div>

      <div class="main-content">
        <div class="card">
          <h2 id="stats-title" class="card-title">Select a User</h2>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">Phase A Current</span>
              <span id="stat-phase-a-current" class="stat-value">-</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Phase A Power</span>
              <span id="stat-phase-a-power" class="stat-value">-</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Phase A Voltage</span>
              <span id="stat-phase-a-voltage" class="stat-value">-</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Temperature</span>
              <span id="stat-temperature" class="stat-value">-</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Total Energy</span>
              <span id="stat-total-energy" class="stat-value">-</span>
            </div>
          </div>
        </div>
        
        <div class="card">
          <h2 class="card-title">Generated Reports</h2>
          <ul id="pdf-list-ul" class="pdf-list">
            <li class="pdf-item loading">Loading reports...</li>
          </ul>
        </div>
      </div>
    `;
  }

  connectedCallback() {
    this.shadowRoot.getElementById("search").addEventListener("input", (e) => {
      this._filterUsers(e.target.value);
    });
    this.shadowRoot.getElementById("generate").addEventListener("click", () => this._generate());
    this._renderUserList();
  }

  set hass(hass) {
    this._hass = hass;

    this.users = this._getUsersFromHass();
    this.filteredUsers = this.users;
    this._renderUserList();
    this._updateStats();
  }

  get hass() {
    return this._hass;
  }

  _stripSuffix(value, suffix) {
    if (!value || !suffix) return value;
    return value.endsWith(suffix) ? value.slice(0, -suffix.length) : value;
  }

  _sanitizeDisplayName(name) {
    if (!name) return "";
    let result = name.trim();
    [
      /phase a current$/i,
      /phase a power$/i,
      /phase a voltage$/i,
      /temperature$/i,
      /total energy$/i,
      /switch$/i
    ].forEach(pattern => {
      result = result.replace(pattern, "").trim();
    });
    result = result.replace(/\s{2,}/g, " ").trim();
    return result || name.trim();
  }

  _getUsersFromHass() {
    if (!this._hass) return [];

    const sensorTypes = [
      "phase_a_current",
      "phase_a_power",
      "phase_a_voltage",
      "temperature",
      "total_energy"
    ];

    const usersByBase = new Map();

    Object.entries(this._hass.states).forEach(([entityId, stateObj]) => {
      if (!entityId.startsWith("switch.")) return;
      const objectId = entityId.substring("switch.".length);
      const baseName = this._stripSuffix(objectId, "_switch");
      const entry = usersByBase.get(baseName) ?? {
        name: baseName,
        displayName: "",
        sensors: {},
        switchEntityId: entityId
      };
      entry.switchEntityId = entityId;
      if (!entry.displayName) {
        entry.displayName = this._sanitizeDisplayName(
          stateObj?.attributes?.friendly_name ?? baseName
        );
      }
      usersByBase.set(baseName, entry);
    });

    Object.keys(this._hass.states).forEach(entityId => {
      if (!entityId.startsWith("sensor.")) return;
      const objectId = entityId.substring("sensor.".length);
      sensorTypes.forEach(type => {
        if (!objectId.endsWith(`_${type}`)) return;
        const baseCandidate = objectId.slice(0, -(`_${type}`).length);
        const baseName = this._stripSuffix(baseCandidate, "_switch");
        const entry = usersByBase.get(baseName);
        if (!entry) return;
        entry.sensors[type] = entityId;
        if (!entry.displayName) {
          const friendly =
            this._hass.states[entityId]?.attributes?.friendly_name ?? baseName;
          entry.displayName = this._sanitizeDisplayName(friendly);
        }
      });
    });

    return Array.from(usersByBase.values())
      .filter(entry => entry.sensors.total_energy)
      .map(entry => ({
        ...entry,
        displayName: entry.displayName || this._sanitizeDisplayName(entry.name)
      }));
  }

  _filterUsers(query) {
    const normalized = (query || "").toLowerCase();
    if (!normalized) {
      this.filteredUsers = this.users;
    } else {
      this.filteredUsers = this.users.filter(user =>
        user.name.toLowerCase().includes(normalized) ||
        user.switchEntityId?.toLowerCase().includes(normalized)
      );
    }
    this._renderUserList();
  }

  _renderUserList() {
    const ul = this.shadowRoot.getElementById("user-list");
    ul.innerHTML = "";
    this.filteredUsers.forEach(user => {
      const li = document.createElement("li");
      li.textContent = user.displayName || user.name;
      li.style.cursor = "pointer";
      if (this.selectedUser && this.selectedUser.name === user.name) {
        li.classList.add("selected");
      }
      li.onclick = () => {
        this.selectedUser = user;
        this._updateStats();
        this.shadowRoot.getElementById("generate").disabled = false;
        this._renderUserList(); // re-render to update selection
      };
      ul.appendChild(li);
    });
    if (!this.selectedUser) {
      this.shadowRoot.getElementById("generate").disabled = true;
    }
  }

  _updateStats() {
    const statsTitle = this.shadowRoot.getElementById("stats-title");
    if (!this._hass || !this.selectedUser) {
      statsTitle.textContent = "Current Stats";
      this.shadowRoot.getElementById("stat-phase-a-current").textContent = "-";
      this.shadowRoot.getElementById("stat-phase-a-power").textContent = "-";
      this.shadowRoot.getElementById("stat-phase-a-voltage").textContent = "-";
      this.shadowRoot.getElementById("stat-temperature").textContent = "-";
      this.shadowRoot.getElementById("stat-total-energy").textContent = "-";
      return;
    }
    statsTitle.textContent = `${(this.selectedUser.displayName || this.selectedUser.name)} Current Stats`;
    const sensors = this.selectedUser.sensors;
    this.shadowRoot.getElementById("stat-phase-a-current").textContent =
      this._hass.states[sensors.phase_a_current]?.state ?? "-";
    this.shadowRoot.getElementById("stat-phase-a-power").textContent =
      this._hass.states[sensors.phase_a_power]?.state ?? "-";
    this.shadowRoot.getElementById("stat-phase-a-voltage").textContent =
      this._hass.states[sensors.phase_a_voltage]?.state ?? "-";
    this.shadowRoot.getElementById("stat-temperature").textContent =
      this._hass.states[sensors.temperature]?.state ?? "-";
    this.shadowRoot.getElementById("stat-total-energy").textContent =
      this._hass.states[sensors.total_energy]?.state ?? "-";
  }

  async _generate() {
    const status = this.shadowRoot.getElementById("status");
    if (!this.selectedUser) return;
    status.textContent = "Generating PDF...";
    const today = new Date().toISOString().slice(0, 10);
    const filename = `${this.selectedUser.name}_${today}.pdf`;
    const totalEnergy = this.selectedUser.sensors.total_energy;
    console.log(totalEnergy)
    try {
      await this.hass.callService(
        "sensor_pdf_generator",
        "generate_pdf",
        {
          total_energy_entity_id: totalEnergy,
          filename
        }
      );
      status.textContent = `✅ PDF Generated: ${filename}`;
    } catch (err) {
      console.error("Service call failed:", err);
      status.textContent = "❌ Error generating PDF";
    }
  }
}

customElements.define("pdf-generator-panel", PdfGeneratorPanel);
