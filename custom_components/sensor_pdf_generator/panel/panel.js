class PdfGeneratorPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.users = [];
    this.filteredUsers = [];
    this.selectedUser = null;
    this._initialized = false;
    
    this.shadowRoot.innerHTML = `
      <style>
        * {
          box-sizing: border-box;
        }

        :host {
          --ha-primary-color: #f84d44;
          --ha-primary-dark: #e53e3e;
          --ha-primary-light: #ff6b5b;
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
            --bg-primary: #111111;
            --bg-secondary: #1c1c1c;
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

        /* PDF List - Simple */
        .pdf-links {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .pdf-link {
          color: var(--ha-primary-color);
          text-decoration: none;
          padding: 8px 12px;
          border-radius: 6px;
          background: var(--bg-tertiary);
          transition: all 0.2s;
        }

        .pdf-link:hover {
          background: var(--ha-primary-color);
          color: white;
          transform: translateX(4px);
        }

        /* Scrollbars */
        .user-list::-webkit-scrollbar,
        .main-content::-webkit-scrollbar {
          width: 6px;
        }

        .user-list::-webkit-scrollbar-track,
        .main-content::-webkit-scrollbar-track {
          background: transparent;
        }

        .user-list::-webkit-scrollbar-thumb,
        .main-content::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 3px;
        }

        .user-list::-webkit-scrollbar-thumb:hover,
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

        .icon {
          width: 20px;
          height: 20px;
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
          <button id="refresh-pdfs" style="margin-bottom: 10px;">Refresh List</button>
          <div id="pdf-list" class="pdf-links"></div>
        </div>
      </div>
    `;
  }

  connectedCallback() {
    this.shadowRoot.getElementById("search").addEventListener("input", (e) => {
      this._filterUsers(e.target.value);
    });
    this.shadowRoot.getElementById("generate").addEventListener("click", () => this._generate());
    this.shadowRoot.getElementById("refresh-pdfs").addEventListener("click", () => this._loadPdfFiles());
    
    // Listen for PDF generation completion
    if (this._hass?.connection) {
      this._hass.connection.subscribeEvents((event) => {
        this._handlePdfGenerationEvent(event);
      }, "pdf_generator_complete");
    }
  }

  set hass(hass) {
    this._hass = hass;
    
    if (!this._initialized && hass) {
      this._initialize();
      this._initialized = true;
      
      if (hass.connection) {
        hass.connection.subscribeEvents((event) => {
          this._handlePdfGenerationEvent(event);
        }, "pdf_generator_complete");
      }
      
      this._loadPdfFiles();
    }
  }

  get hass() {
    return this._hass;
  }

  _initialize() {
    this.users = this._getUsersFromHass();
    this.filteredUsers = this.users;
    this._renderUserList();
    this._updateStats();
  }

  async _loadPdfFiles() {
    try {
      const response = await this._hass.connection.sendMessagePromise({
        type: "call_service",
        domain: "sensor_pdf_generator",
        service: "list_pdfs",
        service_data: {},
        return_response: true
      });
      
      const pdfNames = response.response?.pdf_files || [];
      this._renderPdfLinks(pdfNames);
      
    } catch (error) {
      console.error("Error loading PDF files:", error);
      this._renderPdfLinks([]);
    }
  }

  _handlePdfGenerationEvent(event) {
    const status = this.shadowRoot.getElementById("status");
    if (event.data.success) {
      status.className = "status-message success";
      status.textContent = `✅ PDF Generated: ${event.data.filename}`;
      setTimeout(() => this._loadPdfFiles(), 1000);
    } else {
      status.className = "status-message error";
      status.textContent = `❌ Error: ${event.data.error}`;
    }
  }

  _renderPdfLinks(pdfNames) {
    const container = this.shadowRoot.getElementById("pdf-list");
    if (!container) {
      console.error("PDF list container not found");
      return;
    }
    
    container.innerHTML = "";
    
    if (pdfNames.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: var(--text-secondary);">No reports generated yet</div>';
      return;
    }
    
    pdfNames.forEach(filename => {
      const link = document.createElement("a");
      link.href = `/local/receipts/${filename}`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "pdf-link";
      link.textContent = filename;
      container.appendChild(link);
    });
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
  
    const breakers = {};
  
    Object.keys(this._hass.states).forEach(entityId => {
      if (!entityId.startsWith("sensor.")) return;
      
      const lower = entityId.toLowerCase();
  
      sensorTypes.forEach(type => {
        if (lower.endsWith(`_${type}`)) {
          const withoutSensor = entityId.substring("sensor.".length);
          const baseName = withoutSensor.substring(0, withoutSensor.length - (`_${type}`).length);
          if (!breakers[baseName]) {
            breakers[baseName] = {
              types: new Set(),
              friendlyName: null
            };
          }
          breakers[baseName].types.add(type);
          
          // Get friendly name from the entity (prefer total_energy sensor for the name)
          if (type === "total_energy" || !breakers[baseName].friendlyName) {
            const stateObj = this._hass.states[entityId];
            if (stateObj?.attributes?.friendly_name) {
              breakers[baseName].friendlyName = stateObj.attributes.friendly_name;
            }
          }
        }
      });
    });
    
    const users = Object.entries(breakers).map(([baseName, data]) => {
      if (!data.types.has("phase_a_current") || !data.types.has("total_energy")) return null;
  
      const sensors = {};
      sensorTypes.forEach(type => {
        if (data.types.has(type)) {
          sensors[type] = `sensor.${baseName}_${type}`;
        }
      });

      // Create display name
      const displayName = data.friendlyName 
        ? this._sanitizeDisplayName(data.friendlyName)
        : baseName;

      return {
        name: baseName,
        displayName: displayName,
        sensors
      };
    }).filter(u => u !== null);
    
    return users;
  }

  _filterUsers(query) {
    query = query.toLowerCase().trim();
    this.filteredUsers = this.users.filter(u => 
      u.name.toLowerCase().includes(query) || 
      u.displayName.toLowerCase().includes(query)
    );
    this._renderUserList();
  }

  _renderUserList() {
    const ul = this.shadowRoot.getElementById("user-list");
    ul.innerHTML = "";
    
    // If no filtered results, show a message
    if (this.filteredUsers.length === 0) {
      const li = document.createElement("li");
      li.className = "user-item";
      li.textContent = "No users found";
      li.style.textAlign = "center";
      li.style.fontStyle = "italic";
      ul.appendChild(li);
      return;
    }
    
    this.filteredUsers.forEach(user => {
      const li = document.createElement("li");
      li.className = "user-item";
      
      // Show display name with base name in parentheses
      li.textContent = `${user.displayName} (${user.name})`;
      
      // Check if this user is currently selected
      if (this.selectedUser && this.selectedUser.name === user.name) {
        li.classList.add("selected");
      }
      
      li.onclick = () => {
        // Clear previous selection from all items
        this.shadowRoot.querySelectorAll(".user-item").forEach(item => {
          item.classList.remove("selected");
        });
        
        // Set new selection
        this.selectedUser = user;
        li.classList.add("selected");
        this._updateStats();
        this.shadowRoot.getElementById("generate").disabled = false;
      };
      
      ul.appendChild(li);
    });
    
    if (!this.selectedUser) {
      this.shadowRoot.getElementById("generate").disabled = true;
      this._updateStats();
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
    
    // Use display name in stats title
    statsTitle.textContent = `${this.selectedUser.displayName} Current Stats`;
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
