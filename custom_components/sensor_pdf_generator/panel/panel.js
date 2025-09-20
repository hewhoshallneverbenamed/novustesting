class PdfGeneratorPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.users = []; // Will be filled from hass
    this.filteredUsers = [];
    this.selectedUser = null;
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: row;
          height: 100%;
          font-family: Arial, sans-serif;
        }

        .left, .right {
          padding: 20px;
        }

        .left {
          flex: 1;
          border-right: 1px solid #ddd;
          overflow-y: auto; /* Enable scrolling for left panel */
          max-height: 100vh;
        }

        .right {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        button {
          padding: 10px 18px;
          font-size: 16px;
          cursor: pointer;
          border-radius: 8px;
          border: none;
          background: #03a9f4;
          color: white;
          transition: background 0.2s;
        }
        button:hover {
          background: #0288d1;
        }

        #status {
          margin-top: 12px;
          font-size: 14px;
        }

        .card {
          border: 1px solid #ccc;
          border-radius: 8px;
          padding: 15px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .card h2 {
          margin-top: 0;
          font-size: 18px;
        }

        .stat {
          display: flex;
          justify-content: space-between;
          margin: 6px 0;
        }
        .stat span:first-child {
          font-weight: bold;
        }

        /* Additional styles for user list */
        #user-list {
          list-style-type: none;
          padding: 0;
          margin: 0;
          max-height: 60vh;
          overflow-y: auto; /* Enable scrolling for user list */
        }
        #user-list li {
          padding: 8px;
          border-radius: 4px;
          border: 2px solid transparent;
          transition: border 0.2s, color 0.2s;
          color: #fff;            /* White text */
          font-weight: bold;      /* Bold text */
        }
        #user-list li:hover {
          background: #f0f0f0;
          color: #000; /* Black text on hover */
        }
        #user-list li.selected {
          border: 2px solid #2196f3; /* Blue border for selected */
          background: #e3f2fd;
          color: #1976d2;
        }

        /* Hide the original content */
        .original-content {
          display: none;
        }
      </style>

      <div class="left">
        <h1>PDF Generator</h1>
        <input id="search" type="text" placeholder="Search users..." />
        <ul id="user-list"></ul>
        <button id="generate" disabled>Generate PDF</button>
        <div id="status"></div>
      </div>

      <div class="right">
        <div class="card">
          <h2 id="stats-title">Current Stats</h2>
          <div class="stat"><span>Phase A Current:</span><span id="stat-phase-a-current">-</span></div>
          <div class="stat"><span>Phase A Power:</span><span id="stat-phase-a-power">-</span></div>
          <div class="stat"><span>Phase A Voltage:</span><span id="stat-phase-a-voltage">-</span></div>
          <div class="stat"><span>Temperature:</span><span id="stat-temperature">-</span></div>
          <div class="stat"><span>Total Energy:</span><span id="stat-total-energy">-</span></div>
        </div>
      </div>

      <!-- Original content, hidden by default -->
      <div class="original-content">
        <div class="left">
          <h1>PDF Generator</h1>
          <button id="generate">Generate PDF</button>
          <div id="status"></div>
        </div>

        <div class="right">
          <div class="card">
            <h2>Current Stats</h2>
            <div class="stat"><span>Total Energy:</span><span id="stat-energy">-</span></div>
            <div class="stat"><span>Power:</span><span id="stat-power">-</span></div>
            <div class="stat"><span>Current:</span><span id="stat-current">-</span></div>
          </div>
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
  
  _getUsersFromHass() {
    if (!this._hass) return [];
  
    const sensorTypes = [
      "phase_a_current",
      "phase_a_power",
      "phase_a_voltage",
      "temperature",
      "total_energy"
    ];
  
    const breakers = {};  // map: baseName -> Set of detected sensorTypes
  
    Object.keys(this._hass.states).forEach(entityId => {
      if (!entityId.startsWith("sensor.")) return;
  
      const lower = entityId.toLowerCase();
  
      // Check each sensorType if entityId ends with that type
      sensorTypes.forEach(type => {
        if (lower.endsWith(`_${type}`)) {
          // get the baseName
          // remove the "sensor." prefix
          const withoutSensor = entityId.substring("sensor.".length);
          // remove the `_${type}` suffix
          const baseName = withoutSensor.substring(0, withoutSensor.length - (`_${type}`).length);
          // initialize if needed
          if (!breakers[baseName]) {
            breakers[baseName] = new Set();
          }
          breakers[baseName].add(type);
        }
      });
    });
    
    // Build user objects
    const users = Object.entries(breakers).map(([baseName, typesSet]) => {
      // optionally FILTER: only include baseName if it has at least one important sensor
      // For example, require phase_a_current and total_energy
      if (!typesSet.has("phase_a_current") || !typesSet.has("total_energy")) return null;
  
      // Construct sensors map, only for types present (or for all if you want to include all)
      const sensors = {};
      sensorTypes.forEach(type => {
        if (typesSet.has(type)) {
          sensors[type] = `sensor.${baseName}_${type}`;
        }
      });
  
      return {
        name: baseName,
        sensors
      };
    }).filter(u => u !== null);  
    return users;  
  
  }

  _filterUsers(query) {
    query = query.toLowerCase();
    this.filteredUsers = this.users.filter(u => u.name.toLowerCase().includes(query));
    this._renderUserList();
  }

  _renderUserList() {
    const ul = this.shadowRoot.getElementById("user-list");
    ul.innerHTML = "";
    this.filteredUsers.forEach(user => {
      const li = document.createElement("li");
      li.textContent = user.name;
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
    statsTitle.textContent = `${this.selectedUser.name} Current Stats`;
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
