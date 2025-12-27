class PdfGeneratorPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.users = [];
    this.filteredUsers = [];
    this.selectedUsers = new Set();
    this.selectedDateRange = null;
    this._initialized = false;
    this.selectedStreet = "all"; // floor filter
    this.selectedBuilding = "all"; // area filter
    
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
          display: flex;
          align-items: center;
          gap: 12px;
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

        /* Checkbox styling */
        .user-checkbox {
          width: 18px;
          height: 18px;
          border: 2px solid var(--border-color);
          border-radius: 4px;
          background: var(--bg-secondary);
          position: relative;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          flex-shrink: 0;
        }

        .user-item.selected .user-checkbox {
          background: var(--ha-primary-color);
          border-color: var(--ha-primary-color);
        }

        .user-checkbox::after {
          content: '✓';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-size: 12px;
          font-weight: bold;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .user-item.selected .user-checkbox::after {
          opacity: 1;
        }

        .user-text {
          flex: 1;
        }

        /* Selection counter */
        .selection-info {
          padding: 12px 24px;
          background: var(--bg-tertiary);
          border-top: 1px solid var(--border-color);
          font-size: 14px;
          color: var(--text-secondary);
          text-align: center;
        }

        .selection-count {
          font-weight: 600;
          color: var(--ha-primary-color);
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

        /* Clear Selection Button */
        .clear-selection-btn {
          width: 100%;
          padding: 8px 16px;
          background: transparent;
          color: var(--text-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 12px;
        }

        .clear-selection-btn:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        /* Filter Section */
        .filter-section {
          padding: 16px 24px;
          border-bottom: 1px solid var(--border-color);
          background: var(--bg-secondary);
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 12px;
        }

        .filter-group:last-child {
          margin-bottom: 0;
        }

        .filter-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .filter-select {
          width: 100%;
          padding: 10px 12px;
          border: 2px solid var(--border-color);
          border-radius: 8px;
          background: var(--bg-tertiary);
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .filter-select:focus {
          outline: none;
          border-color: var(--ha-primary-color);
          background: var(--bg-secondary);
          box-shadow: 0 0 0 4px rgba(248, 77, 68, 0.1);
        }

        .filter-select:hover {
          border-color: var(--text-secondary);
        }

        .filter-summary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: var(--bg-tertiary);
          border-radius: 6px;
          font-size: 13px;
          color: var(--text-secondary);
          margin-top: 8px;
        }

        .filter-summary-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .filter-badge {
          background: var(--ha-primary-color);
          color: white;
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 11px;
        }

        .clear-filters-btn {
          padding: 6px 12px;
          background: transparent;
          color: var(--text-secondary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          margin-left: auto;
        }

        .clear-filters-btn:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
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

        /* Simple Date Picker Styles */
        .date-range-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .date-inputs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .date-input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .date-input-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .date-input {
          padding: 12px 16px;
          border: 2px solid var(--border-color);
          border-radius: 8px;
          background: var(--bg-tertiary);
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .date-input:focus {
          outline: none;
          border-color: var(--ha-primary-color);
          background: var(--bg-secondary);
          box-shadow: 0 0 0 4px rgba(248, 77, 68, 0.1);
        }

        .date-presets {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }

        .date-preset-btn {
          padding: 8px 12px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .date-preset-btn:hover {
          background: var(--ha-primary-color);
          color: white;
          border-color: var(--ha-primary-color);
        }

        .date-info {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px;
          background: var(--bg-tertiary);
          border-radius: 8px;
          border: 1px solid var(--border-color);
        }

        .date-info-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .date-info-label {
          font-weight: 500;
          color: var(--text-secondary);
          font-size: 13px;
        }

        .date-info-value {
          font-weight: 600;
          color: var(--text-primary);
          font-size: 13px;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .date-inputs {
            grid-template-columns: 1fr;
          }
          
          .date-presets {
            flex-direction: column;
          }
          
          .date-preset-btn {
            width: 100%;
          }
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
        
        <div class="filter-section">
          <div class="filter-group">
            <label class="filter-label">Building</label>
            <select id="building-filter" class="filter-select">
              <option value="all">All Buildings</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label class="filter-label">Street</label>
            <select id="street-filter" class="filter-select">
              <option value="all">All Streets</option>
            </select>
          </div>
          
          <div class="filter-summary">
            <span id="filter-summary-text">Showing all users</span>
            <button id="clear-filters" class="clear-filters-btn" style="display: none;">Clear Filters</button>
          </div>
        </div>
        
        <div class="user-list-container">
          <ul id="user-list" class="user-list"></ul>
        </div>
        
        <div class="selection-info">
          <span class="selection-count" id="selection-count">0</span> users selected
        </div>
        
        <div class="generate-section">
          <div style="display: flex; gap: 8px; margin-bottom: 12px;">
            <button id="select-all" class="clear-selection-btn" style="flex: 1; margin-bottom: 0;">Select All</button>
            <button id="clear-selection" class="clear-selection-btn" style="flex: 1; margin-bottom: 0;">Clear Selection</button>
          </div>
          <button id="generate" class="generate-btn" disabled>Generate Receipts</button>
          <div id="status" class="status-message"></div>
        </div>
      </div>

      <div class="main-content">
        <div class="card">
          <h2 id="stats-title" class="card-title">Select Users</h2>
          <div id="selected-users-list" class="stats-grid">
            <div style="text-align: center; color: var(--text-secondary); padding: 20px;">
              No users selected
            </div>
          </div>
        </div>

        <!-- Simple Date Range Picker -->
        <div class="card">
          <h2 class="card-title">Date Range Selection</h2>
          <div class="date-range-container">
            <div class="date-inputs">
              <div class="date-input-group">
                <label class="date-input-label">Start Date</label>
                <input id="start-date" class="date-input" type="date" />
              </div>
              <div class="date-input-group">
                <label class="date-input-label">End Date</label>
                <input id="end-date" class="date-input" type="date" />
              </div>
            </div>
            
            <div class="date-presets">
              <button class="date-preset-btn" data-days="1">Today</button>
              <button class="date-preset-btn" data-days="7">Last 7 Days</button>
              <button class="date-preset-btn" data-days="30">Last 30 Days</button>
              <button class="date-preset-btn" data-days="90">Last 90 Days</button>
              <button class="date-preset-btn" data-preset="month">This Month</button>
              <button class="date-preset-btn" data-preset="year">This Year</button>
            </div>
            
            <div class="date-info">
              <div class="date-info-item">
                <span class="date-info-label">Selected Period:</span>
                <span id="selected-period" class="date-info-value">No range selected</span>
              </div>
              <div class="date-info-item">
                <span class="date-info-label">Total Days:</span>
                <span id="total-days" class="date-info-value">0</span>
              </div>
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
    this.shadowRoot.getElementById("select-all").addEventListener("click", () => this._selectAll());
    this.shadowRoot.getElementById("clear-selection").addEventListener("click", () => this._clearSelection());
    this.shadowRoot.getElementById("refresh-pdfs").addEventListener("click", () => this._loadPdfFiles());
    
    // Filter event listeners
    this.shadowRoot.getElementById("building-filter").addEventListener("change", (e) => {
      this.selectedBuilding = e.target.value;
      this._applyFilters();
    });
    
    this.shadowRoot.getElementById("street-filter").addEventListener("change", (e) => {
      this.selectedStreet = e.target.value;
      this._applyFilters();
    });
    
    this.shadowRoot.getElementById("clear-filters").addEventListener("click", () => {
      this._clearFilters();
    });
    
    // Date picker event listeners
    const startDate = this.shadowRoot.getElementById("start-date");
    const endDate = this.shadowRoot.getElementById("end-date");
    
    startDate.addEventListener("change", () => this._updateDateRange());
    endDate.addEventListener("change", () => this._updateDateRange());
    
    // Date preset buttons
    this.shadowRoot.querySelectorAll(".date-preset-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const days = e.target.dataset.days;
        const preset = e.target.dataset.preset;
        
        if (days) {
          this._setDatePreset(parseInt(days));
        } else if (preset) {
          this._setDatePresetSpecial(preset);
        }
      });
    });
    
    // Initialize with today's date
    this._initializeDates();
    
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
    this._getUsersFromHass().then(users => {
      this.users = users;
      this.filteredUsers = users;
      this._populateFilterDropdowns(); // This will populate both filters
      this._renderUserList();
      this._updateSelectedUsersDisplay();
    });
  }

  _initializeDates() {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    this.shadowRoot.getElementById("start-date").value = todayString;
    this.shadowRoot.getElementById("end-date").value = todayString;
    
    this._updateDateRange();
  }

  _setDatePreset(days) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days + 1);
    
    this.shadowRoot.getElementById("start-date").value = startDate.toISOString().split('T')[0];
    this.shadowRoot.getElementById("end-date").value = endDate.toISOString().split('T')[0];
    
    this._updateDateRange();
  }

  _setDatePresetSpecial(preset) {
    const today = new Date();
    let startDate, endDate;
    
    if (preset === "month") {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (preset === "year") {
      startDate = new Date(today.getFullYear(), 0, 1);
      endDate = new Date(today.getFullYear(), 11, 31);
    }
    
    this.shadowRoot.getElementById("start-date").value = startDate.toISOString().split('T')[0];
    this.shadowRoot.getElementById("end-date").value = endDate.toISOString().split('T')[0];
    
    this._updateDateRange();
  }

  _updateDateRange() {
    const startInput = this.shadowRoot.getElementById("start-date");
    const endInput = this.shadowRoot.getElementById("end-date");
    
    if (!startInput.value || !endInput.value) {
      this.shadowRoot.getElementById("selected-period").textContent = "No range selected";
      this.shadowRoot.getElementById("total-days").textContent = "0";
      this.selectedDateRange = null;
      return;
    }
    
    const startDate = new Date(startInput.value);
    const endDate = new Date(endInput.value);
    
    // Validate date range
    if (startDate > endDate) {
      // Swap dates if start is after end
      startInput.value = endInput.value;
      endInput.value = startInput.value;
      return;
    }
    
    // Calculate days difference
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    // Format display
    const formatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    const startFormatted = startDate.toLocaleDateString('en-US', formatOptions);
    const endFormatted = endDate.toLocaleDateString('en-US', formatOptions);
    
    this.shadowRoot.getElementById("selected-period").textContent = `${startFormatted} - ${endFormatted}`;
    this.shadowRoot.getElementById("total-days").textContent = diffDays;
    
    // Store the selected range
    this.selectedDateRange = {
      start: startDate,
      end: endDate,
      startString: startInput.value,
      endString: endInput.value
    };
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
      if (event.data.file_count > 1) {
        status.textContent = `✅ Generated ${event.data.file_count} PDFs successfully`;
      } else {
        status.textContent = `✅ PDF Generated: ${event.data.filename || 'Receipt'}`;
      }
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
      const wrapper = document.createElement("div");
      wrapper.style.display = "flex";
      wrapper.style.alignItems = "center";
      wrapper.style.gap = "8px";
      wrapper.style.marginBottom = "4px";
      
      const link = document.createElement("a");
      link.href = `/local/receipts/${filename}`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "pdf-link";
      link.style.flex = "1";
      link.style.marginBottom = "0";
      link.textContent = filename;
      
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "🗑️";
      deleteBtn.title = "Delete receipt";
      deleteBtn.style.padding = "8px 12px";
      deleteBtn.style.background = "transparent";
      deleteBtn.style.border = "1px solid var(--border-color)";
      deleteBtn.style.borderRadius = "6px";
      deleteBtn.style.cursor = "pointer";
      deleteBtn.style.transition = "all 0.2s";
      deleteBtn.style.fontSize = "14px";
      
      deleteBtn.onmouseover = () => {
        deleteBtn.style.background = "var(--ha-error-color)";
        deleteBtn.style.borderColor = "var(--ha-error-color)";
      };
      
      deleteBtn.onmouseout = () => {
        deleteBtn.style.background = "transparent";
        deleteBtn.style.borderColor = "var(--border-color)";
      };
      
      deleteBtn.onclick = async () => {
        if (confirm(`Are you sure you want to delete "${filename}"?\n\nThis action cannot be undone.`)) {
          try {
            await this._hass.callService(
              "sensor_pdf_generator",
              "delete_pdf",
              { filename: filename }
            );
            
            // Remove from UI immediately
            wrapper.remove();
            
            // Show success message
            const statusDiv = document.createElement("div");
            statusDiv.textContent = `✅ Deleted: ${filename}`;
            statusDiv.style.padding = "8px 12px";
            statusDiv.style.background = "rgba(76, 175, 80, 0.1)";
            statusDiv.style.border = "1px solid rgba(76, 175, 80, 0.2)";
            statusDiv.style.borderRadius = "6px";
            statusDiv.style.color = "var(--ha-success-color)";
            statusDiv.style.fontSize = "14px";
            statusDiv.style.marginBottom = "8px";
            
            container.insertBefore(statusDiv, container.firstChild);
            
            // Remove success message after 3 seconds
            setTimeout(() => statusDiv.remove(), 3000);
            
          } catch (error) {
            console.error("Error deleting PDF:", error);
            alert(`Failed to delete "${filename}". Please try again.`);
          }
        }
      };
      
      wrapper.appendChild(link);
      wrapper.appendChild(deleteBtn);
      container.appendChild(wrapper);
    });
  }

  _sanitizeDisplayName(name) {
    if (!name) return "";
    let result = name.trim();
    [
      /phase a current$/i,
      /phase a power$/i,
      /phase a voltage$/i,
      /total energy$/i,
      /switch$/i
    ].forEach(pattern => {
      result = result.replace(pattern, "").trim();
    });
    result = result.replace(/\s{2,}/g, " ").trim();
    return result || name.trim();
  }

  async _getUsersFromHass() {
    if (!this._hass) return [];

    console.log("=== STARTING USER DISCOVERY ===");

    let deviceRegistry = {};
    let entityRegistry = {};
    let areaRegistry = {};
    let floorRegistry = {};
    
    try {
      // Fetch floors
      const floors = await this._hass.callWS({
        type: "config/floor_registry/list"
      });
      
      floors.forEach(floor => {
        floorRegistry[floor.floor_id] = floor.name;
      });
      
      console.log("Floors found:", floorRegistry);
      
      // Fetch areas
      const areas = await this._hass.callWS({
        type: "config/area_registry/list"
      });
      
      areas.forEach(area => {
        areaRegistry[area.area_id] = {
          name: area.name,
          floor_id: area.floor_id  // Areas are assigned to floors
        };
      });
      
      console.log("Areas found:", areaRegistry);
      
      // Fetch devices
      const devices = await this._hass.callWS({
        type: "config/device_registry/list"
      });
      
      devices.forEach(device => {
        deviceRegistry[device.id] = {
          id: device.id,
          name: device.name,
          name_by_user: device.name_by_user,
          manufacturer: device.manufacturer,
          model: device.model,
          model_id: device.model_id,
          area_id: device.area_id
        };
      });
      
      // Fetch entities
      const entities = await this._hass.callWS({
        type: "config/entity_registry/list"
      });
      
      entities.forEach(entity => {
        if (entity.device_id) {
          entityRegistry[entity.entity_id] = {
            device_id: entity.device_id,
            area_id: entity.area_id
          };
        }
      });
      
    } catch (error) {
      console.error("Failed to fetch registry data:", error);
    }

    const sensorTypes = [
      "phase_a_current",
      "phase_a_power", 
      "phase_a_voltage",
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
          
          const stateObj = this._hass.states[entityId];
          const entityInfo = entityRegistry[entityId];
          const deviceId = entityInfo?.device_id;
          const deviceInfo = deviceId ? deviceRegistry[deviceId] : null;
          
          // Get area from entity or device
          const areaId = entityInfo?.area_id || deviceInfo?.area_id;
          const areaInfo = areaId ? areaRegistry[areaId] : null;
          const areaName = areaInfo?.name || null;
          
          // Get floor from area (areas are assigned to floors)
          const floorId = areaInfo?.floor_id;
          const floorName = floorId ? floorRegistry[floorId] : null;
          
          if (!breakers[baseName]) {
            breakers[baseName] = {
              types: new Set(),
              friendlyName: null,
              allEntities: {},
              deviceId: deviceId,
              deviceInfo: deviceInfo,
              area: areaName,
              floor: floorName,
              areaId: areaId,
              floorId: floorId
            };
          }
          breakers[baseName].types.add(type);
          breakers[baseName].allEntities[type] = {
            entityId: entityId,
            state: stateObj?.state,
            attributes: stateObj?.attributes,
            fullStateObj: stateObj
          };
          
          if (type === "total_energy" || !breakers[baseName].friendlyName) {
            if (stateObj?.attributes?.friendly_name) {
              breakers[baseName].friendlyName = stateObj.attributes.friendly_name;
            }
          }
        }
      });
    });
    
    console.log(`Total breakers found: ${Object.keys(breakers).length}`);
    
    const users = Object.entries(breakers).map(([baseName, data]) => {
      console.log(`\n--- Processing breaker: ${baseName} ---`);
      
      if (!data.deviceInfo) {
        console.log("❌ SKIPPING - No device info");
        return null;
      }
      
      const isTuyaDevice = data.deviceInfo.manufacturer === "Tuya";
      const hasCorrectModelId = data.deviceInfo.model_id === "vylye9wwllb1av7a";
      
      if (!isTuyaDevice || !hasCorrectModelId) {
        console.log("❌ SKIPPING - Not a Tuya device with model_id 'vylye9wwllb1av7a'");
        return null;
      }
      
      if (!data.types.has("phase_a_current") || !data.types.has("total_energy")) {
        console.log("❌ SKIPPING - Missing required sensors");
        return null;
      }
  
      const sensors = {};
      sensorTypes.forEach(type => {
        if (data.types.has(type)) {
          sensors[type] = `sensor.${baseName}_${type}`;
        }
      });

      const displayName = data.friendlyName 
        ? this._sanitizeDisplayName(data.friendlyName)
        : baseName;

      const userObj = {
        name: baseName,
        displayName: displayName,
        sensors,
        deviceId: data.deviceId,
        deviceInfo: data.deviceInfo,
        allEntities: data.allEntities,
        building: data.area || "Unassigned", // area -> building
        street: data.floor || "Unassigned", // floor (from area) -> street
        areaId: data.areaId,
        floorId: data.floorId
      };
      
      console.log("✅ INCLUDED - Display Name:", displayName, "| Building (Area):", userObj.building, "| Street (Floor):", userObj.street);
      
      return userObj;
    }).filter(u => u !== null);
    
    console.log(`\n=== FINAL RESULT: ${users.length} users included ===\n`);
    
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
      li.innerHTML = '<div class="user-text" style="text-align: center; font-style: italic;">No users found</div>';
      ul.appendChild(li);
      return;
    }
    
    this.filteredUsers.forEach(user => {
      const li = document.createElement("li");
      li.className = "user-item";
      
      // Check if this user is currently selected
      if (this.selectedUsers.has(user.name)) {
        li.classList.add("selected");
      }
      
      li.innerHTML = `
        <div class="user-checkbox"></div>
        <div class="user-text">${user.displayName}</div>
      `;
      
      li.onclick = () => {
        // Toggle selection
        if (this.selectedUsers.has(user.name)) {
          this.selectedUsers.delete(user.name);
          li.classList.remove("selected");
        } else {
          this.selectedUsers.add(user.name);
          li.classList.add("selected");
        }
        
        this._updateSelectionInfo();
        this._updateSelectedUsersDisplay();
        this._updateGenerateButton();
      };
      
      ul.appendChild(li);
    });
  }

  _selectAll() {
    // Add all filtered users to selection
    this.filteredUsers.forEach(user => {
      this.selectedUsers.add(user.name);
    });
    
    this._updateSelectionInfo();
    this._updateSelectedUsersDisplay();
    this._updateGenerateButton();
    this._renderUserList(); // Re-render to update checkboxes
  }

  _updateSelectionInfo() {
    const count = this.selectedUsers.size;
    this.shadowRoot.getElementById("selection-count").textContent = count;
  }

  _updateSelectedUsersDisplay() {
    const container = this.shadowRoot.getElementById("selected-users-list");
    const statsTitle = this.shadowRoot.getElementById("stats-title");
    
    if (this.selectedUsers.size === 0) {
      statsTitle.textContent = "Select Users";
      container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">No users selected</div>';
      return;
    }
    
    statsTitle.textContent = `Selected Users (${this.selectedUsers.size})`;
    container.innerHTML = "";
    
    // Get the actual user objects for the selected names
    const selectedUserObjects = this.users.filter(user => this.selectedUsers.has(user.name));
    
    selectedUserObjects.forEach((user, index) => {
      const userDiv = document.createElement("div");
      userDiv.className = "stat-item";
      userDiv.style.borderBottom = "1px solid var(--border-color)";
      userDiv.style.padding = "12px 0";
      userDiv.style.display = "flex";
      userDiv.style.flexDirection = "column";
      userDiv.style.gap = "0";
      
      // Main row with name, energy, and controls
      const mainRow = document.createElement("div");
      mainRow.style.display = "flex";
      mainRow.style.justifyContent = "space-between";
      mainRow.style.alignItems = "center";
      mainRow.style.padding = "4px 0";
      
      const leftDiv = document.createElement("div");
      leftDiv.style.display = "flex";
      leftDiv.style.flexDirection = "column";
      leftDiv.style.gap = "2px";
      leftDiv.style.flex = "1";
      leftDiv.style.marginRight = "24px"; // Added more space between name and energy
      
      const nameDiv = document.createElement("div");
      nameDiv.style.fontWeight = "600";
      nameDiv.style.color = "var(--text-primary)";
      nameDiv.style.fontSize = "14px";
      nameDiv.textContent = user.displayName;
      
      const idDiv = document.createElement("div");
      idDiv.style.fontSize = "11px";
      idDiv.style.color = "var(--text-secondary)";
      idDiv.textContent = user.name;
      
      leftDiv.appendChild(nameDiv);
      leftDiv.appendChild(idDiv);
      
      // Energy display
      const energyDiv = document.createElement("div");
      energyDiv.style.display = "flex";
      energyDiv.style.flexDirection = "column";
      energyDiv.style.alignItems = "flex-end";
      energyDiv.style.gap = "2px";
      energyDiv.style.marginRight = "16px"; // Increased space between energy and controls
      energyDiv.style.minWidth = "80px"; // Ensure consistent width for energy column
      
      if (this._hass && user.sensors.total_energy) {
        const energyState = this._hass.states[user.sensors.total_energy];
        if (energyState) {
          const energyValueDiv = document.createElement("div");
          energyValueDiv.style.fontWeight = "600";
          energyValueDiv.style.color = "var(--text-primary)";
          energyValueDiv.style.fontSize = "14px";
          energyValueDiv.style.fontVariantNumeric = "tabular-nums";
          energyValueDiv.style.textAlign = "right"; // Right-align the numbers
          
          const numValue = parseFloat(energyState.state);
          energyValueDiv.textContent = `${numValue.toFixed(2)} kWh`;
          
          const energyLabelDiv = document.createElement("div");
          energyLabelDiv.style.fontSize = "10px";
          energyLabelDiv.style.color = "var(--text-secondary)";
          energyLabelDiv.style.textTransform = "uppercase";
          energyLabelDiv.style.letterSpacing = "0.5px";
          energyLabelDiv.style.textAlign = "right"; // Right-align the label
          energyLabelDiv.textContent = "Total Energy";
          
          energyDiv.appendChild(energyValueDiv);
          energyDiv.appendChild(energyLabelDiv);
        }
      }
      
      // Controls (expand button and remove button)
      const controlsDiv = document.createElement("div");
      controlsDiv.style.display = "flex";
      controlsDiv.style.gap = "8px";
      controlsDiv.style.alignItems = "center";
      controlsDiv.style.flexShrink = "0"; // Prevent controls from shrinking
      
      // Expand/collapse button
      const expandBtn = document.createElement("button");
      expandBtn.style.background = "transparent";
      expandBtn.style.border = "1px solid var(--border-color)";
      expandBtn.style.borderRadius = "4px";
      expandBtn.style.padding = "4px 6px";
      expandBtn.style.fontSize = "12px";
      expandBtn.style.color = "var(--text-secondary)";
      expandBtn.style.cursor = "pointer";
      expandBtn.style.transition = "all 0.2s";
      expandBtn.style.display = "flex";
      expandBtn.style.alignItems = "center";
      expandBtn.style.justifyContent = "center";
      expandBtn.innerHTML = "▼";
      expandBtn.title = "Show details";
      
      // Remove button
      const removeBtn = document.createElement("button");
      removeBtn.style.background = "transparent";
      removeBtn.style.border = "1px solid var(--border-color)";
      removeBtn.style.borderRadius = "4px";
      removeBtn.style.padding = "4px 6px";
      removeBtn.style.fontSize = "10px";
      removeBtn.style.color = "var(--text-secondary)";
      removeBtn.style.cursor = "pointer";
      removeBtn.style.transition = "all 0.2s";
      removeBtn.textContent = "✕";
      removeBtn.title = "Remove";
      removeBtn.onmouseover = () => {
        removeBtn.style.background = "var(--ha-error-color)";
        removeBtn.style.color = "white";
        removeBtn.style.borderColor = "var(--ha-error-color)";
      };
      removeBtn.onmouseout = () => {
        removeBtn.style.background = "transparent";
        removeBtn.style.color = "var(--text-secondary)";
        removeBtn.style.borderColor = "var(--border-color)";
      };
      removeBtn.onclick = (e) => {
        e.stopPropagation();
        this.selectedUsers.delete(user.name);
        this._updateSelectionInfo();
        this._updateSelectedUsersDisplay();
        this._updateGenerateButton();
        this._renderUserList(); // Re-render to update checkboxes
      };
      
      controlsDiv.appendChild(expandBtn);
      controlsDiv.appendChild(removeBtn);
      
      mainRow.appendChild(leftDiv);
      mainRow.appendChild(energyDiv);
      mainRow.appendChild(controlsDiv);
      
      // Expandable stats section (initially hidden)
      const statsSection = document.createElement("div");
      statsSection.style.display = "none";
      statsSection.style.marginTop = "12px";
      statsSection.style.paddingTop = "12px";
      statsSection.style.borderTop = "1px solid var(--border-color)";
      
      const statsGrid = document.createElement("div");
      statsGrid.style.display = "grid";
      statsGrid.style.gridTemplateColumns = "1fr 1fr";
      statsGrid.style.gap = "8px";
      
      // Define the sensor mappings with their display info (excluding total_energy since it's shown above)
      const sensorMappings = [
        {
          key: 'phase_a_current',
          label: 'Current',
          unit: 'A',
          icon: '🔌',
          priority: 2
        },
        {
          key: 'phase_a_power',
          label: 'Power',
          unit: 'W',
          icon: '💡',
          priority: 3
        },
        {
          key: 'phase_a_voltage',
          label: 'Voltage',
          unit: 'V',
          icon: '⚡',
          priority: 4
        }
      ];
      
      // Sort by priority and filter available sensors
      const availableStats = sensorMappings
        .filter(mapping => user.sensors[mapping.key])
        .sort((a, b) => a.priority - b.priority);
      
      availableStats.forEach(mapping => {
        const sensorEntityId = user.sensors[mapping.key];
        const sensorState = this._hass?.states[sensorEntityId];
        
        if (sensorState) {
          const statDiv = document.createElement("div");
          statDiv.style.display = "flex";
          statDiv.style.flexDirection = "column";
          statDiv.style.padding = "8px 12px";
          statDiv.style.background = "var(--bg-tertiary)";
          statDiv.style.borderRadius = "6px";
          statDiv.style.border = "1px solid var(--border-color)";
          
          const labelDiv = document.createElement("div");
          labelDiv.style.fontSize = "11px";
          labelDiv.style.color = "var(--text-secondary)";
          labelDiv.style.fontWeight = "500";
          labelDiv.style.textTransform = "uppercase";
          labelDiv.style.letterSpacing = "0.5px";
          labelDiv.style.marginBottom = "2px";
          labelDiv.textContent = `${mapping.icon} ${mapping.label}`;
          
          const valueDiv = document.createElement("div");
          valueDiv.style.fontSize = "14px";
          valueDiv.style.fontWeight = "600";
          valueDiv.style.color = "var(--text-primary)";
          valueDiv.style.fontVariantNumeric = "tabular-nums";
          
          // Format the value based on sensor type
          let displayValue = sensorState.state;
          if (!isNaN(displayValue)) {
            const numValue = parseFloat(displayValue);
            if (mapping.key === 'phase_a_current') {
              displayValue = numValue.toFixed(1);
            } else if (mapping.key === 'phase_a_power') {
              displayValue = Math.round(numValue).toString();
            } else if (mapping.key === 'phase_a_voltage') {
              displayValue = Math.round(numValue).toString();
            } else if (mapping.key === 'temperature') {
              displayValue = numValue.toFixed(1);
            }
          }
          
          valueDiv.textContent = `${displayValue} ${mapping.unit}`;
          
          statDiv.appendChild(labelDiv);
          statDiv.appendChild(valueDiv);
          statsGrid.appendChild(statDiv);
        }
      });
      
      // If we have an odd number of stats, make the last one span full width
      if (availableStats.length % 2 === 1) {
        const lastChild = statsGrid.lastChild;
        if (lastChild) {
          lastChild.style.gridColumn = "1 / -1";
        }
      }
      
      statsSection.appendChild(statsGrid);
      
      // Expand/collapse functionality
      let isExpanded = false;
      expandBtn.onclick = (e) => {
        e.stopPropagation();
        isExpanded = !isExpanded;
        
        if (isExpanded) {
          statsSection.style.display = "block";
          expandBtn.innerHTML = "▲";
          expandBtn.title = "Hide details";
          expandBtn.style.color = "var(--ha-primary-color)";
        } else {
          statsSection.style.display = "none";
          expandBtn.innerHTML = "▼";
          expandBtn.title = "Show details";
          expandBtn.style.color = "var(--text-secondary)";
        }
      };
      
      // Only show expand button if there are additional stats to show
      if (availableStats.length === 0) {
        expandBtn.style.display = "none";
      }
      
      userDiv.appendChild(mainRow);
      userDiv.appendChild(statsSection);
      container.appendChild(userDiv);
    });
  }

  _updateGenerateButton() {
    const generateBtn = this.shadowRoot.getElementById("generate");
    const clearBtn = this.shadowRoot.getElementById("clear-selection");
    const selectAllBtn = this.shadowRoot.getElementById("select-all");
    
    generateBtn.disabled = this.selectedUsers.size === 0;
    
    // Show/hide select all based on if all filtered users are selected
    const allFilteredSelected = this.filteredUsers.length > 0 && 
      this.filteredUsers.every(user => this.selectedUsers.has(user.name));
    
    if (allFilteredSelected && this.filteredUsers.length > 0) {
      selectAllBtn.style.display = "none";
      clearBtn.style.flex = "1";
    } else {
      selectAllBtn.style.display = "block";
      clearBtn.style.flex = "1";
    }
    
    // Update button text
    if (this.selectedUsers.size === 0) {
      generateBtn.textContent = "Generate Receipts";
    } else if (this.selectedUsers.size === 1) {
      generateBtn.textContent = "Generate Receipt";
    } else {
      generateBtn.textContent = `Generate ${this.selectedUsers.size} Receipts`;
    }
  }

  _clearSelection() {
    this.selectedUsers.clear();
    this._updateSelectionInfo();
    this._updateSelectedUsersDisplay();
    this._updateGenerateButton();
    this._renderUserList(); // Re-render to update checkboxes
  }

  async _generate() {
    const status = this.shadowRoot.getElementById("status");
    if (this.selectedUsers.size === 0) return;
    
    status.className = "status-message loading";
    status.textContent = `Generating ${this.selectedUsers.size} PDF${this.selectedUsers.size > 1 ? 's' : ''}...`;
    
    const dateRange = this.getSelectedDateRange();
    
    // Get the selected user objects and their total energy sensors
    const selectedUserObjects = this.users.filter(user => this.selectedUsers.has(user.name));
    const entityIds = selectedUserObjects.map(user => user.sensors.total_energy);
    
    try {
      await this.hass.callService(
        "sensor_pdf_generator",
        "generate_pdf",
        {
          total_energy_entity_ids: entityIds,
          filename_prefix: "receipt",
          start_date: dateRange.startString,
          end_date: dateRange.endString
        }
      );
      
      // Status will be updated by the event handler
    } catch (err) {
      console.error("Service call failed:", err);
      status.className = "status-message error";
      status.textContent = "❌ Error generating PDFs";
    }
  }

  getSelectedDateRange() {
    // Return the stored selection or current input values
    if (this.selectedDateRange) {
      return this.selectedDateRange;
    }
    
    // Default to today if nothing is selected
    const today = new Date();
    return {
      start: today,
      end: today,
      startString: today.toISOString().split('T')[0],
      endString: today.toISOString().split('T')[0]
    };
  }
    async _populateFilterDropdowns() {
    const buildingFilter = this.shadowRoot.getElementById("building-filter");
    
    // Get unique buildings from users
    const buildings = new Set();
    
    this.users.forEach(user => {
      buildings.add(user.building);
    });
    
    // Clear existing options (except "All")
    buildingFilter.innerHTML = '<option value="all">All Buildings</option>';
    
    // Add building options (sorted)
    Array.from(buildings).sort().forEach(building => {
      const option = document.createElement("option");
      option.value = building;
      option.textContent = building;
      buildingFilter.appendChild(option);
    });
    
    // Get ALL streets from Home Assistant floor registry (not just from users)
    await this._populateAllStreets();
  }

  async _populateAllStreets() {
    const streetFilter = this.shadowRoot.getElementById("street-filter");
    
    try {
      // Fetch all floors from Home Assistant
      const floors = await this._hass.callWS({
        type: "config/floor_registry/list"
      });
      
      console.log("All floors/streets found:", floors);
      
      // Clear and add all floors as streets
      streetFilter.innerHTML = '<option value="all">All Streets</option>';
      
      // Sort floors by name and add them
      floors
        .map(floor => floor.name)
        .sort()
        .forEach(floorName => {
          const option = document.createElement("option");
          option.value = floorName;
          option.textContent = floorName;
          streetFilter.appendChild(option);
        });
      
      console.log("Streets populated successfully");
        
    } catch (error) {
      console.error("Failed to fetch floors:", error);
      
      // Fallback: just show Unassigned if fetching fails
      streetFilter.innerHTML = '<option value="all">All Streets</option>';
      const option = document.createElement("option");
      option.value = "Unassigned";
      option.textContent = "Unassigned";
      streetFilter.appendChild(option);
    }
  }

  _applyFilters() {
    const searchQuery = this.shadowRoot.getElementById("search").value;
    this._filterUsers(searchQuery);
    this._updateFilterSummary();
  }

  _filterUsers(query = "") {
    query = query.toLowerCase().trim();
    
    this.filteredUsers = this.users.filter(u => {
      // Text search
      const matchesSearch = !query || 
        u.name.toLowerCase().includes(query) || 
        u.displayName.toLowerCase().includes(query);
      
      // Building filter
      const matchesBuilding = this.selectedBuilding === "all" || 
        u.building === this.selectedBuilding;
      
      // Street filter
      const matchesStreet = this.selectedStreet === "all" || 
        u.street === this.selectedStreet;
      
      return matchesSearch && matchesBuilding && matchesStreet;
    });
    
    this._renderUserList();
    this._updateFilterSummary();
  }

  _updateFilterSummary() {
    const summaryText = this.shadowRoot.getElementById("filter-summary-text");
    const clearBtn = this.shadowRoot.getElementById("clear-filters");
    
    const hasFilters = this.selectedBuilding !== "all" || this.selectedStreet !== "all";
    
    if (!hasFilters) {
      summaryText.innerHTML = `Showing all ${this.filteredUsers.length} users`;
      clearBtn.style.display = "none";
    } else {
      let filterParts = [];
      
      if (this.selectedBuilding !== "all") {
        filterParts.push(`<span class="filter-badge">${this.selectedBuilding}</span>`);
      }
      
      if (this.selectedStreet !== "all") {
        filterParts.push(`<span class="filter-badge">${this.selectedStreet}</span>`);
      }
      
      summaryText.innerHTML = `Filtered: ${filterParts.join(" • ")} (${this.filteredUsers.length} users)`;
      clearBtn.style.display = "block";
    }
  }

  _clearFilters() {
    this.selectedBuilding = "all";
    this.selectedStreet = "all";
    
    this.shadowRoot.getElementById("building-filter").value = "all";
    this.shadowRoot.getElementById("street-filter").value = "all";
    this.shadowRoot.getElementById("search").value = "";
    
    this._applyFilters();
  }

}

customElements.define("pdf-generator-panel", PdfGeneratorPanel);

