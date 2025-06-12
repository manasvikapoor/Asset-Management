const BACKEND_URL = "http://localhost:3000"; // Update if your server runs on a different port

console.log("script.js loaded successfully");

// Cookie helper functions
function setCookie(name, value, days) {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie =
    name + "=" + (value || "") + expires + "; path=/; SameSite=Strict";
}

function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function deleteCookie(name) {
  document.cookie = name + "=; Max-Age=-99999999; path=/";
}

// Function to display error messages in the UI
function showError(formFace, message) {
  const errorElement =
    formFace.querySelector(".error-message") || document.createElement("div");
  errorElement.className = "error-message";
  errorElement.id = formFace.querySelector("form").ariaDescribedBy;
  errorElement.textContent = message;
  errorElement.style.display = "block";
  formFace.querySelector(".auth-form").prepend(errorElement);
  setTimeout(() => (errorElement.style.display = "none"), 5000);
}

// Variables for filtering, searching, sorting, and table type
let allAssets = []; // Store all fetched data
let sortColumn = null; // Default to null to disable initial sorting
let sortDirection = "asc"; // Default sort direction
let currentTableType = ""; // Store the selected table type
const cube = document.getElementById("cube");
const video = document.getElementById("background-video");

// Cube rotation functions
function rotateToLogin() {
  cube.style.transform = "translateZ(-200px) rotateY(0deg)";
}

function rotateToRegister() {
  cube.style.transform = "translateZ(-200px) rotateY(-120deg)";
}

function rotateToReset() {
  cube.style.transform = "translateZ(-200px) rotateY(-240deg)";
}

// Password show/hide toggle
document.querySelectorAll(".toggle-password").forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const targetId = toggle.getAttribute("data-target");
    const passwordInput = document.getElementById(targetId);

    if (passwordInput.type === "password") {
      passwordInput.type = "text";
      toggle.classList.add("active");
    } else {
      passwordInput.type = "password";
      toggle.classList.remove("active");
    }
  });

  // Add keyboard support for accessibility
  toggle.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle.click();
    }
  });
});

// Ensure the video plays on page load
window.addEventListener("load", () => {
  video.play().catch((error) => {
    console.log("Autoplay blocked by browser:", error);
  });
});

// Handle login form submission
document
  .querySelector(".face.front form")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const button = e.target.querySelector(".auth-btn");
    const formFace = e.target.closest(".face.front");

    // Show loading state
    button.disabled = true;
    button.textContent = "Signing In...";

    const username = document.getElementById("login-username")?.value;
    const password = document.getElementById("login-password")?.value;

    if (!username || !password) {
      showError(formFace, "Please enter both username and password");
      button.disabled = false;
      button.textContent = "Sign In";
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include", // Send cookies with request
      });
      const data = await response.json();

      if (response.ok) {
        console.log("Login successful, redirecting to dashboard");
        window.location.href = "public/views/dashboard.html";
      } else {
        console.error("Login failed:", data.error);
        showError(formFace, data.error || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      showError(formFace, "Server error during login");
    } finally {
      button.disabled = false;
      button.textContent = "Sign In";
    }
  });

// Check authentication on page load
document.addEventListener("DOMContentLoaded", async () => {
  if (
    window.location.pathname.includes("index.html") ||
    window.location.pathname === "/"
  ) {
    try {
      const response = await fetch(`${BACKEND_URL}/check-auth`, {
        credentials: "include", // Send cookies with request
      });
      const data = await response.json();

      if (data.authenticated) {
        console.log("User is authenticated, redirecting to dashboard");
        window.location.href = "dashboard.html";
      }
    } catch (error) {
      console.error("Auth check error:", error);
    }
  }
});

// Handle logout
function logout() {
  console.log("Logout initiated");
  fetch(`${BACKEND_URL}/logout`, {
    method: "POST",
    credentials: "include",
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Logout response:", data);
      if (data.message) {
        console.log("Logout successful, redirecting to index.html");
        window.location.href = "index.html";
      }
    })
    .catch((error) => {
      console.error("Logout error:", error);
      alert("Error during logout");
    });
}

// Define visible columns for each table type
const visibleColumnsMap = {
  firewall: ["sr_no", "type", "model", "location", "asset_tag"],
  switch: ["sr_no", "make", "model", "location", "site_location", "asset_tag"],
  systems: [
    "sr_no",
    "user_name",
    "location",
    "machine_asset_tag",
    "monitor_asset_tag",
    "status",
  ],
  servers: ["sr_no", "description", "location", "host_name", "asset_tag"],
  printers_and_scanners: [
    "sr_no",
    "name_and_model",
    "printer_type",
    "location",
    "asset_tag",
  ],
};

// Define filters for each table type
const filterFieldsMap = {
  systems: [
    { field: "department", label: "Department" },
    { field: "location", label: "Location" },
  ],
  servers: [
    { field: "host_name", label: "Hostname" },
    { field: "location", label: "Location" },
  ],
  switch: [
    { field: "location", label: "Location" },
    { field: "site_location", label: "Site Location" },
  ],
  firewall: [
    { field: "model", label: "Model" },
    { field: "location", label: "Location" },
  ],
  printers_and_scanners: [
    { field: "printer_type", label: "Printer Type" },
    { field: "location", label: "Location" },
  ],
};

// Primary key values should not be edited
const primaryKeyFieldsMap = {
  systems: ["sr_no", "monitor_asset_tag", "machine_asset_tag"],
  servers: ["sr_no", "asset_tag"],
  switch: ["sr_no", "asset_tag"],
  firewall: ["sr_no", "asset_tag"],
  printers_and_scanners: ["sr_no", "asset_tag"],
};

// Define non-required fields for each table type
const nonRequiredFieldsMap = {
  systems: ["remarks", "date_of_issue", "invoice_number", "invoice_file"],
  servers: ["remarks", "invoice_number", "invoice_file"],
  switch: ["remarks", "invoice_number", "invoice_file"],
  firewall: ["remarks", "invoice_number", "invoice_file"],
  printers_and_scanners: ["remarks", "invoice_number", "invoice_file"],
};

// Helper function to format column names
function formatColumnName(column) {
  const words = column.replace(/_/g, " ").split(" ");
  return words
    .map((word, index) => {
      if (index !== 0 && word.toLowerCase() === "of") {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

// Helper function to find a column in an object (case-insensitive)
function getColumnValue(item, columnName) {
  const keys = Object.keys(item);
  const matchingKey = keys.find(
    (key) => key.toLowerCase() === columnName.toLowerCase()
  );
  return matchingKey ? item[matchingKey] : undefined;
}

// Helper function to normalize a date string
function normalizeDateAsUTC(dateValue) {
  if (!dateValue || dateValue === "N/A") return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return dateValue;
  const pad = (num) => num.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
}

function formatDateForDisplay(dateValue) {
  if (!dateValue || dateValue === "N/A") return "N/A";
  return normalizeDateAsUTC(dateValue);
}

function normalizeDateForComparison(dateValue) {
  if (!dateValue || dateValue === "N/A") return "";
  return normalizeDateAsUTC(dateValue);
}

// Helper function to get financial year from a date string (YYYY-MM-DD)
function getFinancialYear(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return "";
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // Months are 0-based
  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;
  return `${startYear.toString().slice(-2)}-${endYear.toString().slice(-2)}`;
}

// Function to fetch the last counter for a company and device type
async function fetchLastCounter(company, deviceType, isMachine = true) {
  try {
    const response = await fetch(`${BACKEND_URL}/fetchLastCounter`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        company,
        deviceType,
        tableType: "systems",
        isMachine,
      }),
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch counter");
    }

    const data = await response.json();
    return data.lastCounter || 0; // Default to 0 if no counter exists
  } catch (error) {
    console.error("Error fetching last counter:", error.message);
    return 0; // Fallback to 0
  }
}

// Function to generate asset tag
async function generateAssetTag(deviceType, isMachine = true) {
  const companyInput = document.querySelector("#companyInput")?.value.trim().toUpperCase();
  const deviceTypeSelect = document.querySelector("#deviceTypeInput")?.value;
  const dateOfPurchaseInput = document.querySelector(
    isMachine ? "#machine_date_of_purchaseInput" : "#monitor_date_of_purchaseInput"
  )?.value;
  const serialInput = document.querySelector(
    isMachine ? "#serial_numberInput" : "#monitor_serialInput"
  )?.value.trim().toUpperCase();
  const assetTagInput = document.querySelector(
    isMachine ? "#machine_asset_tagInput" : "#monitor_asset_tagInput"
  );
  const assetNoInput = document.querySelector(
    isMachine ? "#machine_asset_noInput" : "#monitor_asset_noInput"
  );

  if (!assetTagInput || !assetNoInput) return; // Exit if input fields don’t exist

  // Only generate tag/number if all required fields are filled
  if (companyInput && deviceTypeSelect && dateOfPurchaseInput && serialInput) {
    // Get financial year
    const financialYear = getFinancialYear(dateOfPurchaseInput);
    if (!financialYear) {
      return; // Skip update if date is invalid
    }

    // Adjust device type for counter
    const counterDeviceType = isMachine
      ? (["Desktop", "Workstation"].includes(deviceTypeSelect) ? "Laptop" : deviceTypeSelect)
      : "Monitor";

    // Fetch last counter
    const lastCounter = await fetchLastCounter(companyInput, counterDeviceType, isMachine);
    const newCounter = lastCounter + 1;

    // Generate base tag (without SN) for asset number
    const baseTag = `${companyInput}/${deviceTypeSelect}/${financialYear}/${newCounter}`;
    // Generate full asset tag with SN
    const assetTag = `${baseTag} SN:${serialInput}`;

    // Set the input fields
    assetTagInput.value = assetTag;
    assetNoInput.value = baseTag;
  }
}

// Helper function to calculate the width of text
function getTextWidth(text, font = "16px Arial") {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  context.font = font;
  const metrics = context.measureText(text);
  return metrics.width + 20;
}

// Helper function to show error messages
function showErrorMessage(message, container) {
  console.log("Showing error message:", message);
  let errorElement = container.querySelector(".error-message");
  if (!errorElement) {
    errorElement = document.createElement("div");
    errorElement.classList.add("error-message");
    container.insertBefore(errorElement, container.firstChild);
  }
  errorElement.textContent = message;
  errorElement.style.display = "block";

  setTimeout(() => {
    errorElement.style.display = "none";
  }, 5000);
}

// Helper function to show success messages
function showSuccessMessage(message, container) {
  console.log("Showing success message:", message);
  let successElement = container.querySelector(".success-message");
  if (!successElement) {
    successElement = document.createElement("div");
    successElement.classList.add("success-message");
    container.insertBefore(successElement, container.firstChild);
  }
  successElement.textContent = message;
  successElement.style.display = "block";

  setTimeout(() => {
    successElement.style.display = "none";
  }, 5000);
}

// Function to toggle the expanded state of a card
function toggleCard(card) {
  document.querySelectorAll(".history-asset-card").forEach((c) => {
    if (c !== card) {
      c.classList.remove("expanded");
    }
  });
  card.classList.toggle("expanded");
}

// Function to show asset history in the Asset History Log tab
async function showAssetHistory() {
  console.log("Entering showAssetHistory");
  const historyTableTypeFilter = document.getElementById(
    "historyTableTypeFilter"
  );
  const historySearchInput = document.getElementById("historySearchInput");
  const historyResetSearchBtn = document.getElementById(
    "historyResetSearchBtn"
  );
  const historyMessageContainer = document.getElementById(
    "historyMessageContainer"
  );
  const historyAssetGrid = document.getElementById("historyAssetGrid");

  console.log("Checking required DOM elements for Asset History page");
  if (
    !historyTableTypeFilter ||
    !historySearchInput ||
    !historyResetSearchBtn ||
    !historyMessageContainer ||
    !historyAssetGrid
  ) {
    console.error("Required elements not found in asset-history.html");
    console.error({
      historyTableTypeFilter: !!historyTableTypeFilter,
      historySearchInput: !!historySearchInput,
      historyResetSearchBtn: !!historyResetSearchBtn,
      historyMessageContainer: !!historyMessageContainer,
      historyAssetGrid: !!historyAssetGrid,
    });
    console.log("Exiting showAssetHistory due to missing elements");
    return;
  }
  console.log("All required DOM elements found");

  let historyAssets = [];
  let filteredAssets = [];
  let assetChangeHistoryMap = new Map();

  async function fetchChangeHistory(asset, tableType) {
    console.log(
      `Entering fetchChangeHistory for asset ${asset.sr_no}, tableType: ${tableType}`
    );
    const body = { tableType };
    if (tableType.toLowerCase() === "systems") {
      body.sr_no = asset.sr_no;
      body.machine_asset_tag = asset.machine_asset_tag;
      body.monitor_asset_tag = asset.monitor_asset_tag;
    } else {
      body.sr_no = asset.sr_no;
      body.asset_tag = asset.asset_tag;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/assetHistory`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch asset history");
      }

      const data = await response.json();
      return data.history || [];
    } catch (error) {
      console.error(
        `Error fetching asset history for asset ${asset.sr_no}:`,
        error.message
      );
      return [];
    }
  }

  async function renderAssets(assets) {
    console.log("Entering renderAssets");
    historyAssetGrid.innerHTML = "";
    if (assets.length === 0) {
      historyAssetGrid.innerHTML =
        '<p class="empty-message">No assets with changes available.</p>';
      return;
    }

    const tableType = historyTableTypeFilter.value;
    const allColumns = assets.length > 0 ? Object.keys(assets[0]) : [];
    const visibleColumns =
      visibleColumnsMap[tableType.toLowerCase()] || allColumns;
    let hasRenderedCards = false;

    assets.forEach((asset) => {
      const { history } = assetChangeHistoryMap.get(JSON.stringify(asset)) || {
        history: [],
      };
      if (history.length === 0) return;

      const card = document.createElement("div");
      card.classList.add("history-asset-card");
      card.setAttribute("onclick", "toggleCard(this)");
      card.dataset.asset = JSON.stringify(asset);

      let cardContent = '<div class="card-content">';
      visibleColumns.forEach((column) => {
        if (allColumns.includes(column)) {
          const formattedColumn = formatColumnName(column);
          let value = asset[column] || "";
          if (column.toLowerCase().includes("date")) {
            value = formatDateForDisplay(value);
          }
          cardContent += `
            <p><strong>${formattedColumn}:</strong> ${value}</p>
          `;
        }
      });
      cardContent += "</div>";

      let historyContent = '<div class="history-details">';
      if (history.length === 0) {
        historyContent += "<p>No changes available for this asset.</p>";
      } else {
        historyContent += `
          <table class="changes-table">
            <thead>
              <tr>
                <th>Field Name</th>
                <th>Old Value</th>
                <th>New Value</th>
                <th>Changed By</th>
                <th>Change Date</th>
              </tr>
            </thead>
            <tbody>
        `;
        history.forEach((entry) => {
          const formattedDate = formatDateForDisplay(entry.change_date);
          historyContent += `
            <tr>
              <td>${formatColumnName(entry.field_name)}</td>
              <td>${entry.old_value || ""}</td>
              <td>${entry.new_value || ""}</td>
              <td>${entry.changed_by}</td>
              <td>${formattedDate}</td>
            </tr>
          `;
        });
        historyContent += `
            </tbody>
          </table>
        `;
      }
      historyContent += "</div>";

      card.innerHTML = cardContent + historyContent;
      historyAssetGrid.appendChild(card);
      hasRenderedCards = true;
    });

    if (!hasRenderedCards) {
      historyAssetGrid.innerHTML =
        '<p class="empty-message">No assets with changes available.</p>';
    }
  }

  async function fetchAssets(tableType) {
    if (!tableType) {
      historyAssetGrid.innerHTML = "";
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/fetchData/${tableType}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch assets");
      const allFetchedAssets = await response.json();

      historyAssets = [];
      assetChangeHistoryMap.clear();
      for (const asset of allFetchedAssets) {
        const history = await fetchChangeHistory(asset, tableType);
        if (history.length > 0) {
          historyAssets.push(asset);
          assetChangeHistoryMap.set(JSON.stringify(asset), { history });
        }
      }

      filteredAssets = [...historyAssets];
      await renderAssets(filteredAssets);
    } catch (error) {
      console.error("Error fetching assets for history:", error.message);
      showErrorMessage(
        "Failed to load assets. Please try again.",
        historyMessageContainer
      );
      historyAssetGrid.innerHTML =
        '<p class="empty-message">Error loading assets.</p>';
    }
  }

  async function applySearchFilter() {
    const searchValue = historySearchInput.value.toLowerCase().trim();
    const tableType = historyTableTypeFilter.value;
    const visibleColumns = visibleColumnsMap[tableType.toLowerCase()] || [];

    filteredAssets = historyAssets.filter((asset) => {
      const { history } = assetChangeHistoryMap.get(JSON.stringify(asset)) || {
        history: [],
      };
      if (history.length === 0) return false;
      return visibleColumns.some((column) => {
        const fieldValue = (asset[column] || "").toString().toLowerCase();
        return fieldValue.includes(searchValue);
      });
    });

    await renderAssets(filteredAssets);
  }

  historyTableTypeFilter.value = "systems";
  fetchAssets("systems");

  historyTableTypeFilter.addEventListener("change", async () => {
    const tableType = historyTableTypeFilter.value;
    historySearchInput.value = "";
    assetChangeHistoryMap.clear();
    await fetchAssets(tableType);
  });

  historySearchInput.addEventListener("input", applySearchFilter);
  historySearchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") applySearchFilter();
  });

  historyResetSearchBtn.addEventListener("click", () => {
    historySearchInput.value = "";
    filteredAssets = [...historyAssets];
    renderAssets(filteredAssets);
  });
}

// System Allocation and Checklist Logic
let records = [];
let srNoCounter = 1;

// Load records from localStorage on script initialization
try {
  const storedRecords = localStorage.getItem("systemAllocationRecords");
  if (storedRecords) {
    records = JSON.parse(storedRecords);
    console.log("Loaded records from localStorage:", records);
    // Update srNoCounter based on the highest srNo in records
    const maxSrNo =
      records.length > 0 ? Math.max(...records.map((r) => r.srNo)) : 0;
    srNoCounter = maxSrNo + 1;
  }
} catch (error) {
  console.error("Error loading records from localStorage:", error);
}

function syncChecklistFields() {
  const username = document.getElementById("username")?.value;
  const serialNo = document.getElementById("serialNo")?.value;
  const assetTag = document.getElementById("assetTag")?.value;

  const checklistUsername = document.getElementById("checklistUsername");
  const checklistSerialNo = document.getElementById("checklistSerialNo");
  const checklistAssetTag = document.getElementById("checklistAssetTag");

  if (checklistUsername) checklistUsername.textContent = username || "";
  if (checklistSerialNo) checklistSerialNo.textContent = serialNo || "";
  if (checklistAssetTag) checklistAssetTag.textContent = assetTag || "";
}

function renderSystemAllocationDashboard() {
  const tbody = document.getElementById("dashboardTableBody");
  if (!tbody) {
    console.error("Dashboard table body not found!");
    return;
  }
  tbody.innerHTML = ""; // Clear existing rows
  console.log("Rendering system allocation dashboard with records:", records);
  records.forEach((record) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${record.srNo}</td>
    <td>${record.username}</td>
      <td>${record.deptName}</td>
      <td>
        <button class="action-btn edit-btn" onclick="editSystemAllocationRecord(${record.srNo})">Edit</button>
        <button class="action-btn delete-btn" onclick="deleteSystemAllocationRecord(${record.srNo})">Delete</button>
        <button class="action-btn print-btn" onclick="printSystemAllocationRecord(${record.srNo})">Print</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function editSystemAllocationRecord(srNo) {
  const record = records.find((r) => r.srNo === Number(srNo));
  const issuingContainer = document.querySelector(".issuing-container");
  const checklistContainer = document.querySelector(".checklist-container");
  const nextBtn = document.getElementById("nextBtn");

  if (record && issuingContainer && checklistContainer && nextBtn) {
    // Populate issuing form
    document.getElementById("username").value = record.username;
    document.getElementById("deptName").value = record.deptName;
    document.getElementById("dateOfIssue").value = record.dateOfIssue;
    document.getElementById("laptop").value = record.laptop;
    document.getElementById("serialNo").value = record.serialNo;
    document.getElementById("configuration").value = record.configuration;
    document.getElementById("accessories").value = record.accessories;
    document.getElementById("assetTag").value = record.assetTag;
    document.getElementById("issuedPerson").value = record.issuedPerson;

    // Populate checklist form
    document.getElementById("systemName").value = record.checklist.systemName;
    for (let i = 1; i <= 32; i++) {
      const statusElement = document.querySelector(`select[name="status${i}"]`);
      if (statusElement) {
        statusElement.value = record.checklist.statuses[`status${i}`] || "N/A";
      }
    }

    // Sync checklist fields and show checklist
    syncChecklistFields();
    issuingContainer.classList.add("active");
    checklistContainer.classList.add("active");
    checklistContainer.style.display = "block";
    nextBtn.style.display = "none";

    // Remove old record from array
    records = records.filter((r) => r.srNo !== Number(srNo));
    // Update localStorage
    try {
      localStorage.setItem("systemAllocationRecords", JSON.stringify(records));
      console.log("Updated records in localStorage after edit:", records);
    } catch (error) {
      console.error("Error saving records to localStorage after edit:", error);
    }
    renderSystemAllocationDashboard();
  }
}

function deleteSystemAllocationRecord(srNo) {
  records = records.filter((r) => r.srNo !== Number(srNo));
  console.log("Record deleted:", srNo);
  console.log("Updated records array:", records);
  // Update localStorage
  try {
    localStorage.setItem("systemAllocationRecords", JSON.stringify(records));
    console.log("Updated records in localStorage after delete:", records);
  } catch (error) {
    console.error("Error saving records to localStorage after delete:", error);
  }
  renderSystemAllocationDashboard();
}

function printSystemAllocationRecord(srNo) {
  console.log(
    "printSystemAllocationRecord called with srNo:",
    srNo,
    "type:",
    typeof srNo
  );

  // Convert srNo to a number to ensure type consistency
  const srNoNum = Number(srNo);
  if (isNaN(srNoNum)) {
    console.error("Invalid srNo value, cannot convert to number:", srNo);
    return;
  }

  // Log the records array to debug
  console.log("Current records array:", records);

  // Find the record
  const record = records.find((r) => {
    console.log(
      `Comparing r.srNo: ${
        r.srNo
      } (type: ${typeof r.srNo}) with srNoNum: ${srNoNum} (type: ${typeof srNoNum})`
    );
    return r.srNo === srNoNum;
  });

  if (!record) {
    console.error(`No record found with srNo: ${srNoNum}`);
    return;
  }

  // Store the srNo in localStorage for the target page to retrieve
  try {
    localStorage.setItem("printSystemAllocationSrNo", srNoNum.toString());
    console.log(`Stored srNo ${srNoNum} in localStorage for printing`);
  } catch (error) {
    console.error("Error storing srNo in localStorage:", error);
    return;
  }

  // Redirect to laptop-checklist.html
  try {
    console.log("Redirecting to laptop-checklist.html for printing");
    window.location.href = "laptop-checklist.html";
  } catch (error) {
    console.error("Error during redirection:", error);
  }
}

// Wait for DOM to be fully loaded
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOMContentLoaded event fired");

  const dashboard = document.querySelector(".dashboard");
  if (dashboard) {
    console.log("Dashboard element found, adding .loaded class");
    dashboard.classList.add("loaded");
  } else {
    console.error("Dashboard element not found in the DOM");
  }

  const sidebar = document.getElementById("sidebar");
  if (sidebar) {
    console.log("Sidebar element found, initializing hover functionality");
    sidebar.classList.add("collapsed");
    sidebar.addEventListener("mouseenter", function () {
      console.log("Mouse entered sidebar, expanding");
      sidebar.classList.remove("collapsed");
    });
    sidebar.addEventListener("mouseleave", function () {
      console.log("Mouse left sidebar, collapsing");
      sidebar.classList.add("collapsed");
    });

    const sidebarLinks = sidebar.querySelectorAll(".sidebar-content ul li a");
    console.log(`Found ${sidebarLinks.length} sidebar links`);
    sidebarLinks.forEach((link, index) => {
      link.addEventListener("click", function (e) {
        console.log(
          `Sidebar link ${index + 1} clicked: ${link.getAttribute("href")}`
        );
        const href = this.getAttribute("href");
        if (href === "#" || !href) {
          console.log("Link is '#' or empty, collapsing sidebar");
          sidebar.classList.add("collapsed");
          return;
        }
        e.preventDefault();
        if (dashboard) {
          console.log("Initiating fade-out transition for navigation");
          dashboard.classList.remove("loaded");
          dashboard.classList.add("fade-out");
        }
        setTimeout(() => {
          console.log(`Navigating to ${href}`);
          window.location.href = href;
        }, 500);
      });
    });

    const logoutBtn = sidebar.querySelector(".logout-btn");
    if (logoutBtn) {
      console.log("Logout button found, adding click event listener");
      logoutBtn.addEventListener("click", function (e) {
        console.log("Logout button clicked");
        e.preventDefault();
        if (dashboard) {
          console.log("Initiating fade-out transition for logout");
          dashboard.classList.remove("loaded");
          dashboard.classList.add("fade-out");
        }
        setTimeout(() => {
          console.log("Calling logout function");
          logout();
        }, 500);
      });
    } else {
      console.error("Logout button not found in the sidebar");
    }
  } else {
    console.error("Sidebar element not found in the DOM");
  }

  // --- NEW FIELD CONFIGURATIONS ---
  const commonFields = [
    "sr_no",
    "user_name",
    "department",
    "location",
    "make",
    "date_of_issue",
    "date_of_expiry",
    "OS",
    "processor",
    "RAM",
    "hard_disk",
    "keyboard",
    "accessories",
    "vendor",
    "status",
    "company",
    "invoice_number",
    "invoice_file",
    "remarks",
  ];

  const machineSpecificFields = [
    "serial_number",
    "machine_asset_tag",
    "model",
    "machine_asset_no",
    "machine_date_of_purchase",
    "laptop_type",
  ];

  const monitorSpecificFields = [
    "monitor_serial",
    "monitor_asset_tag",
    "monitor_model",
    "monitor_asset_no",
    "monitor_date_of_purchase",
  ];

  // Define the desired order of fields for rendering
  const orderedFields = [
    "sr_no",
    "user_name",
    "department",
    "device_type",
    "serial_number", // Used for machine
    "monitor_serial", // Used for monitor
    "make",
    "model", // Used for machine
    "monitor_model", // Used for monitor
    "machine_date_of_purchase", // Machine Date of Purchase
    "monitor_date_of_purchase", // Monitor Date of Purchase
    "company",
    "machine_asset_tag", // Machine Asset Tag
    "monitor_asset_tag", // Monitor Asset Tag
    "location",
    "date_of_issue",
    "date_of_expiry",
    "operating_system",
    "processor",
    "RAM",
    "hard_disk",
    "keyboard",
    "accessories",
    "vendor",
    "machine_asset_no", // Machine Asset No
    "monitor_asset_no", // Monitor Asset No
    "laptop_type",
    "status",
    "invoice_number",
    "invoice_file",
    "remarks",
  ];

  // Logic for save-asset.html
  const tableTypeFilter = document.getElementById("tableTypeFilter");
  const formContainer = document.getElementById("formContainer");
  const messageContainer = document.getElementById("messageContainer");
  const assetForm = document.getElementById("assetForm");

  if (tableTypeFilter && formContainer && assetForm) {
    console.log("Elements for save-asset.html found, initializing");

    async function fetchLastSrNo(tableType) {
      try {
        console.log(`Fetching last sr_no for ${tableType}`);
        const response = await fetch(`${BACKEND_URL}/fetchData/${tableType}`, {
          credentials: "include",
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to fetch data: ${response.status} - ${errorText}`
          );
        }
        const data = await response.json();
        const maxSrNo =
          data.length > 0
            ? Math.max(
                ...data
                  .map((item) => parseInt(item.sr_no, 10))
                  .filter((num) => !isNaN(num))
              )
            : 0;
        return maxSrNo;
      } catch (error) {
        console.error(
          `Error fetching last sr_no for ${tableType}:`,
          error.message
        );
        showErrorMessage(
          "Failed to fetch the last serial number. Please try again.",
          messageContainer
        );
        return 0;
      }
    }

    async function fetchColumnsForTableType(tableType) {
  const formButtonContainer = document.getElementById("formButtonContainer");
  if (!tableType) {
    formContainer.innerHTML = "";
    formButtonContainer.style.display = "none";
    return;
  }

  try {
    const response = await fetch(`${BACKEND_URL}/fetchColumns/${tableType}`, {
      credentials: "include",
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch columns: ${response.status} - ${errorText}`);
    }
    const { columns: backendColumns } = await response.json();
    const nonRequiredFields = nonRequiredFieldsMap[tableType] || [];
    const lastSrNo = await fetchLastSrNo(tableType);
    const nextSrNo = lastSrNo + 1;

    formContainer.innerHTML = "";

    const backendColumnSet = new Set(backendColumns);
    const fieldsToRender =
      tableType.toLowerCase() === "systems"
        ? orderedFields
        : backendColumns.filter(
            (col) =>
              ![
                "create_user",
                "create_time",
                "create_date",
                "change_user",
                "change_time",
                "change_date",
              ].includes(col)
          );

    // Map fields to KDS codes for dropdowns
    const dropdownFields = {
      company: 'COMPANY'
    };

    // Fetch dropdown values for all dropdown fields
    const dropdownPromises = Object.entries(dropdownFields).map(async ([field, kdsCode]) => {
      try {
        const response = await fetch(`${BACKEND_URL}/kdsFetch/${kdsCode}`, {
          credentials: "include",
        });
        if (!response.ok) {
          console.warn(`Failed to fetch dropdown values for ${kdsCode}: ${response.status}`);
          return { field, values: [] };
        }
        const data = await response.json();
        return { field, values: data.values || [] };
      } catch (error) {
        console.error(`Error fetching dropdown for ${kdsCode}:`, error.message);
        return { field, values: [] };
      }
    });

    const dropdownData = await Promise.all(dropdownPromises);
    const dropdownValues = dropdownData.reduce((acc, { field, values }) => {
      acc[field] = values;
      return acc;
    }, {});

    if (tableType.toLowerCase() === "systems") {
      const deviceTypeDiv = document.createElement("div");
      deviceTypeDiv.className = "form-group";
      deviceTypeDiv.id = "deviceTypeGroup";

      const deviceTypeLabel = document.createElement("label");
      deviceTypeLabel.htmlFor = "deviceTypeInput";
      deviceTypeLabel.textContent = "Device Type";

      const deviceTypeSelect = document.createElement("select");
      deviceTypeSelect.id = "deviceTypeInput";
      deviceTypeSelect.name = "device_type";
      deviceTypeSelect.required = true;

      const options = [
        { value: "Laptop", text: "Laptop", default: true },
        { value: "Monitor", text: "Monitor" },
        { value: "Desktop", text: "Desktop (Laptop + Monitor)" },
        { value: "Workstation", text: "Workstation (Laptop + Monitor)" },
        { value: "All-in-one", text: "All-in-one" },
      ];

      options.forEach((option) => {
        const optElement = document.createElement("option");
        optElement.value = option.value;
        optElement.textContent = option.text;
        if (option.default) optElement.selected = true;
        deviceTypeSelect.appendChild(optElement);
      });

      deviceTypeDiv.appendChild(deviceTypeLabel);
      deviceTypeDiv.appendChild(deviceTypeSelect);
      formContainer.appendChild(deviceTypeDiv);

      deviceTypeSelect.addEventListener("change", function () {
        updateFieldVisibility(this.value);
        generateAssetTag(this.value, true);
        generateAssetTag(this.value, false);
      });
    }

    fieldsToRender.forEach((column) => {
      if (column === "device_type") return;

      const div = document.createElement("div");
      div.className = "form-group";
      div.id = `${column}Group`;

      const label = document.createElement("label");
      label.htmlFor = `${column}Input`;
      label.textContent = formatColumnName(column);

      let input;
      if (column in dropdownFields) {
        // Create dropdown for fields with KDS codes
        input = document.createElement("select");
        input.id = `${column}Input`;
        input.name = column;

        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = `Select ${formatColumnName(column)}`;
        input.appendChild(defaultOption);

        const values = dropdownValues[column] || [];
        values.forEach((value) => {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = value;
          input.appendChild(option);
        });
      } else if (column === "invoice_file") {
        input = document.createElement("input");
        input.type = "file";
        input.id = `${column}Input`;
        input.name = column;
        input.accept = "application/pdf";
      } else if (column === "sr_no") {
        input = document.createElement("input");
        input.type = "number";
        input.id = `${column}Input`;
        input.name = column;
        input.value = nextSrNo;
      } else if (
        column.includes("date_of") ||
        column.includes("_date_of_purchase")
      ) {
        input = document.createElement("input");
        input.type = "date";
        input.id = `${column}Input`;
        input.name = column;
      } else if (column === "status") {
        input = document.createElement("select");
        input.id = `${column}Input`;
        input.name = column;
        const statusOptions = ["Active", "Inactive", "Repair", "Scrapped"];
        statusOptions.forEach((optionText) => {
          const opt = document.createElement("option");
          opt.value = optionText;
          opt.textContent = optionText;
          input.appendChild(opt);
        });
      } else {
        input = document.createElement("input");
        input.type = "text";
        input.id = `${column}Input`;
        input.name = column;
      }

      if (!nonRequiredFields.includes(column)) {
        input.required = true;
      } else {
        input.required = false;
      }

      // Handle asset tag and number fields
      if (
        column === "machine_asset_tag" ||
        column === "monitor_asset_tag" ||
        column === "machine_asset_no" ||
        column === "monitor_asset_no"
      ) {
        input.value = "";
      }

      // Add event listeners for asset tag generation
      if (
        column === "company" ||
        column === "serial_number" ||
        column === "monitor_serial" ||
        column === "machine_date_of_purchase" ||
        column === "monitor_date_of_purchase"
      ) {
        input.addEventListener("change", () => {
          if (
            column === "company" ||
            column === "serial_number" ||
            column === "machine_date_of_purchase"
          ) {
            generateAssetTag(
              document.getElementById("deviceTypeInput")?.value,
              true
            );
          }
          if (
            column === "company" ||
            column === "monitor_serial" ||
            column === "monitor_date_of_purchase"
          ) {
            generateAssetTag(
              document.getElementById("deviceTypeInput")?.value,
              false
            );
          }
        });
      }

      div.appendChild(label);
      div.appendChild(input);
      formContainer.appendChild(div);
    });

    if (tableType.toLowerCase() === "systems") {
      updateFieldVisibility("Laptop");
    }
    formButtonContainer.style.display = "block";
  } catch (error) {
    console.error(`Error fetching columns for ${tableType}:`, error.message);
    showErrorMessage(
      "Failed to load form fields. Please try again.",
      messageContainer
    );
    formButtonContainer.style.display = "none";
  }
}

    // Function to update field visibility based on device type
    function updateFieldVisibility(deviceType) {
      const isLaptop = deviceType === "Laptop" || deviceType === "All-in-one";
      const isMonitor = deviceType === "Monitor";
      const isBoth = deviceType === "Desktop" || deviceType === "Workstation";

      const allToggleableFields = [
        ...commonFields.filter(
          (f) =>
            ![
              "sr_no",
              "user_name",
              "department",
              "company",
              "location",
              "vendor",
              "status",
              "invoice_number",
              "invoice_file",
              "remarks",
            ].includes(f)
        ),
        ...machineSpecificFields,
        ...monitorSpecificFields,
      ];

      allToggleableFields.forEach((field) => {
        const fieldGroup = document.getElementById(`${field}Group`);
        const inputElement = document.getElementById(`${field}Input`);

        if (fieldGroup && inputElement) {
          let shouldBeVisible = false;
          let shouldBeRequired = false;
          let defaultValue = "";

          // Handle common fields
          if (
            commonFields.includes(field) &&
            ![
              "sr_no",
              "user_name",
              "department",
              "company",
              "location",
              "vendor",
              "status",
              "invoice_number",
              "invoice_file",
              "remarks",
            ].includes(field)
          ) {
            shouldBeVisible = true;
            shouldBeRequired = !nonRequiredFieldsMap["systems"].includes(field);
          }

          // Handle machine-specific fields
          if (machineSpecificFields.includes(field)) {
            if (isLaptop || isBoth) {
              shouldBeVisible = true;
              shouldBeRequired =
                !nonRequiredFieldsMap["systems"].includes(field);
            } else {
              defaultValue = field === "machine_date_of_purchase" ? "" : "N/A";
            }
          }

          // Handle monitor-specific fields
          if (monitorSpecificFields.includes(field)) {
            if (isMonitor || isBoth) {
              shouldBeVisible = true;
              shouldBeRequired =
                !nonRequiredFieldsMap["systems"].includes(field);
            } else {
              defaultValue = field === "monitor_date_of_purchase" ? "" : "N/A";
            }
          }

          // Apply visibility and requirements
          fieldGroup.style.display = shouldBeVisible ? "block" : "none";
          inputElement.required = shouldBeRequired;

          // Set default values for hidden fields
          if (
            !shouldBeVisible &&
            (inputElement.type === "text" || inputElement.type === "date")
          ) {
            inputElement.value = defaultValue;
          } else if (
            shouldBeVisible &&
            inputElement.value === "N/A" &&
            inputElement.type !== "date"
          ) {
            inputElement.value = "";
          }
        }
      });

      // Ensure always-visible fields
      const alwaysVisibleFields = [
        "sr_no",
        "user_name",
        "department",
        "company",
        "location",
        "vendor",
        "status",
        "invoice_number",
        "invoice_file",
        "remarks",
      ];
      alwaysVisibleFields.forEach((field) => {
        const fieldGroup = document.getElementById(`${field}Group`);
        const inputElement = document.getElementById(`${field}Input`);
        if (fieldGroup && inputElement) {
          fieldGroup.style.display = "block";
          inputElement.required =
            !nonRequiredFieldsMap["systems"].includes(field);
        }
      });
    }

    tableTypeFilter.value = "systems";
    fetchColumnsForTableType("systems");

    tableTypeFilter.addEventListener("change", async function () {
      const tableType = this.value;
      await fetchColumnsForTableType(tableType);
    });

    // Asset form submission
    assetForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const tableType = tableTypeFilter.value;
      if (!tableType) {
        showErrorMessage("Please select an asset type.", messageContainer);
        return;
      }

      const deviceType =
        document.getElementById("deviceTypeInput")?.value || "";
      const formData = new FormData(this);
      const processedFormData = new FormData();
      processedFormData.append("tableType", tableType);
      processedFormData.append("device_type", deviceType);

      const dateFields = [
        "machine_date_of_purchase",
        "monitor_date_of_purchase",
        "date_of_issue",
        "date_of_expiry",
      ];

      // Process form data
      for (const [key, value] of formData.entries()) {
        if (dateFields.includes(key)) {
          if (!value || value === "" || value === "N/A") {
            processedFormData.append(key, "");
          } else {
            const datePattern = /^\d{4}-\d{2}-\d{2}$/;
            if (!datePattern.test(value)) {
              showErrorMessage(
                `Invalid date format for ${formatColumnName(
                  key
                )}. Expected YYYY-MM-DD.`,
                messageContainer
              );
              return;
            }
            processedFormData.append(key, value);
          }
        } else if (value instanceof File && value.size === 0) {
          continue;
        } else {
          processedFormData.append(key, value);
        }
      }

      // Adjust fields based on device type
      if (tableType.toLowerCase() === "systems") {
        const isLaptop = deviceType === "Laptop" || deviceType === "All-in-one";
        const isMonitor = deviceType === "Monitor";
        const isBoth = deviceType === "Desktop" || deviceType === "Workstation";

        if (isLaptop) {
          processedFormData.append("monitor_date_of_purchase", "");
          processedFormData.set("monitor_serial", "N/A");
          processedFormData.set("monitor_model", "N/A");
          processedFormData.set("monitor_asset_tag", "N/A");
          processedFormData.set("monitor_asset_no", "N/A");
        } else if (isMonitor) {
          processedFormData.append("machine_date_of_purchase", "");
          processedFormData.set("serial_number", "N/A");
          processedFormData.set("model", "N/A");
          processedFormData.set("machine_asset_tag", "N/A");
          processedFormData.set("machine_asset_no", "N/A");
        }
      }

      // Log form data for debugging
      console.log("Processed FormData:");
      for (const [key, value] of processedFormData.entries()) {
        console.log(`${key}: ${value}`);
      }

      try {
        const response = await fetch(`${BACKEND_URL}/assets`, {
          method: "POST",
          body: processedFormData,
          credentials: "include",
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to add asset: ${response.status} - ${errorText}`
          );
        }

        const result = await response.json();
        showSuccessMessage("Asset added successfully!", messageContainer);
        assetForm.reset();
        tableTypeFilter.value = "";
        formContainer.innerHTML = "";
        await fetchColumnsForTableType("systems");
      } catch (error) {
        console.error("Error adding asset:", error.message);
        showErrorMessage(
          "Failed to add asset. Please try again.",
          messageContainer
        );
      }
    });
  }

  // System Allocation and Checklist Logic Initialization
  const issuingContainer = document.querySelector(".issuing-container");
  const checklistContainer = document.querySelector(".checklist-container");
  const nextBtn = document.getElementById("nextBtn");
  const submitBtn = document.getElementById("submitBtn");
  const issuingForm = document.getElementById("issuingForm");
  const checklistForm = document.getElementById("checklistForm");
  const addRecordBtn = document.getElementById("addRecordBtn");

  // Format and set current date for "Issued By / Date" field
  const currentDate = new Date();
  const day = currentDate.getDate();
  const month = currentDate
    .toLocaleString("default", { month: "short" })
    .toUpperCase();
  const year = currentDate.getFullYear();
  const formattedDate = `${day}-${month}-${year}`;
  const currentDateElement = document.getElementById("currentDate");
  if (currentDateElement) {
    currentDateElement.textContent = formattedDate;
  }

  if (
    issuingForm &&
    checklistForm &&
    nextBtn &&
    submitBtn &&
    issuingContainer &&
    checklistContainer
  ) {
    console.log("System allocation elements found, initializing");

    nextBtn.addEventListener("click", function () {
      if (issuingForm.checkValidity()) {
        syncChecklistFields();
        issuingContainer.classList.remove("active");
        checklistContainer.classList.add("active");
        checklistContainer.style.display = "block";
        nextBtn.style.display = "none";
      } else {
        issuingForm.reportValidity();
      }
    });

    checklistForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const issuingData = {
        srNo: srNoCounter++,
        username: document.getElementById("username")?.value || "",
        deptName: document.getElementById("deptName")?.value || "",
        dateOfIssue: document.getElementById("dateOfIssue")?.value || "",
        laptop: document.getElementById("laptop")?.value || "",
        serialNo: document.getElementById("serialNo")?.value || "",
        configuration: document.getElementById("configuration")?.value || "",
        accessories: document.getElementById("accessories")?.value || "",
        assetTag: document.getElementById("assetTag")?.value || "",
        issuedPerson: document.getElementById("issuedPerson")?.value || "",
      };

      const checklistData = {
        systemName: document.getElementById("systemName")?.value || "",
        statuses: {},
      };
      for (let i = 1; i <= 32; i++) {
        const statusElement = document.querySelector(
          `select[name="status${i}"]`
        );
        checklistData.statuses[`status${i}`] = statusElement
          ? statusElement.value
          : "N/A";
      }

      const combinedData = { ...issuingData, checklist: checklistData };

      records.push(combinedData);
      console.log("Record added:", combinedData);
      console.log("Current records array:", records);

      // Save records to localStorage
      try {
        localStorage.setItem(
          "systemAllocationRecords",
          JSON.stringify(records)
        );
        console.log("Saved records to localStorage:", records);
      } catch (error) {
        console.error("Error saving records to localStorage:", error);
      }

      renderSystemAllocationDashboard();

      issuingForm.reset();
      checklistForm.reset();
      document.getElementById("checklistUsername").textContent = "";
      document.getElementById("checklistSerialNo").textContent = "";
      document.getElementById("checklistAssetTag").textContent = "";
      issuingContainer.classList.add("active");
      checklistContainer.classList.remove("active");
      checklistContainer.style.display = "none";
      nextBtn.style.display = "block";
    });

    if (addRecordBtn) {
      addRecordBtn.addEventListener("click", function () {
        issuingForm.reset();
        checklistForm.reset();
        document.getElementById("checklistUsername").textContent = "";
        document.getElementById("checklistSerialNo").textContent = "";
        document.getElementById("checklistAssetTag").textContent = "";
        issuingContainer.classList.add("active");
        checklistContainer.classList.remove("active");
        checklistContainer.style.display = "none";
        nextBtn.style.display = "block";
      });
    }

    renderSystemAllocationDashboard();
  }

  function populateFilters(data, tableType) {
    console.log(`Populating filters for table type: ${tableType}`);
    const filterGroup = document.querySelector(
      ".filter-group:not(:first-child)"
    );
    if (!filterGroup) {
      console.error("Filter group element not found in the DOM");
      return;
    }

    filterGroup.innerHTML = "";
    const filterFields = filterFieldsMap[tableType.toLowerCase()] || [];

    filterFields.forEach((filter) => {
      const { field, label } = filter;
      const hasField = data.some(
        (item) => getColumnValue(item, field) !== undefined
      );
      if (!hasField) return;

      const select = document.createElement("select");
      select.id = `${field}Filter`;
      select.classList.add("filter-select");

      const defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.textContent = `All ${label}s`;
      select.appendChild(defaultOption);

      const values = [
        ...new Set(data.map((item) => getColumnValue(item, field) || "")),
      ].filter(Boolean);
      values.forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      });

      filterGroup.appendChild(select);

      select.addEventListener("change", () => {
        const filteredData = applyFiltersAndSearch(allAssets);
        renderTable(filteredData);
      });
    });

    const resetButton = document.createElement("button");
    resetButton.id = "resetFiltersBtn";
    resetButton.classList.add("reset-btn");
    resetButton.textContent = "Reset Filters";
    filterGroup.appendChild(resetButton);

    resetButton.addEventListener("click", () => {
      filterFields.forEach((filter) => {
        const filterElement = document.getElementById(`${filter.field}Filter`);
        if (filterElement) {
          filterElement.value = "";
        }
      });
      const searchInput = document.getElementById("searchInput");
      if (searchInput) {
        searchInput.value = "";
      }
      const filteredData = applyFiltersAndSearch(allAssets);
      renderTable(filteredData);
    });

    if (filterGroup.children.length === 1) {
      filterGroup.classList.add("hidden");
    } else {
      filterGroup.classList.remove("hidden");
    }
  }

  function applyFiltersAndSearch(data) {
    console.log("Applying filters and search to data");
    const searchInput =
      document.getElementById("searchInput")?.value.toLowerCase() || "";
    let filteredData = [...data];

    if (searchInput) {
      filteredData = filteredData.filter((item) => {
        return Object.values(item).some((value) =>
          (value || "").toString().toLowerCase().includes(searchInput)
        );
      });
    }

    const filterFields = filterFieldsMap[currentTableType.toLowerCase()] || [];
    filterFields.forEach((filter) => {
      const { field } = filter;
      const filterElement = document.getElementById(`${filter.field}Filter`);
      if (filterElement) {
        const filterValue = filterElement.value;
        if (
          filterValue &&
          data.some((item) => getColumnValue(item, field) !== undefined)
        ) {
          filteredData = filteredData.filter(
            (item) => (getColumnValue(item, field) || "") === filterValue
          );
        }
      }
    });

    if (sortColumn) {
      filteredData.sort((a, b) => {
        const valueA = (a[sortColumn] || "").toString().toLowerCase();
        const valueB = (b[sortColumn] || "").toString().toLowerCase();
        if (sortColumn === "sr_no") {
          const numA = parseInt(valueA, 10) || 0;
          const numB = parseInt(valueB, 10) || 0;
          return sortDirection === "asc" ? numA - numB : numB - numA;
        } else {
          if (valueA < valueB) return sortDirection === "asc" ? -1 : 1;
          if (valueA > valueB) return sortDirection === "asc" ? 1 : -1;
          return 0;
        }
      });
    }

    return filteredData;
  }

  function renderTable(data) {
    console.log("Rendering table with data:", data);
    const headerRow = document.getElementById("tableHeaderRow");
    const tbody = document.getElementById("assetTableBody");
    const tableWrapper = document.querySelector(".table-wrapper");

    if (!headerRow || !tbody || !tableWrapper) {
      console.error("Table header row, body, or wrapper not found in the DOM");
      return;
    }

    tableWrapper.style.maxHeight = "none";
    tableWrapper.scrollTop = 0;

    headerRow.innerHTML = "";
    tbody.innerHTML = "";

    if (data.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="100" class="empty-message">No data available</td></tr>';
      return;
    }

    const allColumns = Object.keys(data[0]);
    const visibleColumns =
      visibleColumnsMap[currentTableType.toLowerCase()] || allColumns;

    const checkboxHeader = document.createElement("th");
    checkboxHeader.innerHTML =
      '<input type="checkbox" id="selectAllCheckbox" />';
    headerRow.appendChild(checkboxHeader);

    visibleColumns.forEach((column) => {
      if (allColumns.includes(column)) {
        const th = document.createElement("th");
        th.classList.add("sortable");
        th.dataset.sort = column;
        const formattedColumn = formatColumnName(column);
        th.innerHTML = `${formattedColumn} <span class="sort-icon"></span>`;
        headerRow.appendChild(th);
      }
    });

    data.forEach((item, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `<td><input type="checkbox" class="row-checkbox" data-id="${index}" /></td>`;
      visibleColumns.forEach((column) => {
        if (allColumns.includes(column)) {
          const td = document.createElement("td");
          let value = item[column] || "";
          if (column.toLowerCase().includes("date")) {
            value = formatDateForDisplay(value);
          }
          td.textContent = value;
          row.appendChild(td);
        }
      });
      row.dataset.item = JSON.stringify(item);
      tbody.appendChild(row);
    });

    const table = headerRow.closest("table");
    const headers = Array.from(headerRow.querySelectorAll("th"));
    const rows = Array.from(tbody.querySelectorAll("tr"));

    const rawWidths = headers.map((header, colIndex) => {
      const headerText = header.textContent.trim();
      const headerWidth = getTextWidth(headerText);
      const dataWidths = rows.map((row) => {
        const cell = row.children[colIndex];
        return cell ? getTextWidth(cell.textContent.trim()) : 0;
      });
      const maxDataWidth = Math.max(...dataWidths, 0);
      return Math.max(headerWidth, maxDataWidth);
    });

    rawWidths[0] = 40;
    const totalRawWidth = rawWidths.reduce((sum, width) => sum + width, 0);
    const tableWrapperWidth = tableWrapper
      ? tableWrapper.clientWidth
      : window.innerWidth - 270;
    const availableWidth = tableWrapperWidth - 40;
    const widthRatio = availableWidth / (totalRawWidth - rawWidths[0]);

    const normalizedWidths = rawWidths.map((width, index) => {
      if (index === 0) return width;
      let adjustedWidth = width * widthRatio;
      adjustedWidth = Math.max(50, adjustedWidth);
      adjustedWidth = Math.min(300, adjustedWidth);
      return adjustedWidth;
    });

    headers.forEach((header, colIndex) => {
      header.style.width = `${normalizedWidths[colIndex]}px`;
      header.style.minWidth = `${normalizedWidths[colIndex]}px`;
    });

    tableWrapper.style.maxHeight = "calc(100vh - 160px)";

    const selectAllCheckbox = document.getElementById("selectAllCheckbox");
    const rowCheckboxes = document.querySelectorAll(".row-checkbox");

    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener("change", function () {
        rowCheckboxes.forEach((checkbox) => {
          checkbox.checked = this.checked;
        });
      });
    }

    rowCheckboxes.forEach((checkbox, index) => {
      checkbox.addEventListener("change", function () {
        const allChecked = Array.from(rowCheckboxes).every((cb) => cb.checked);
        const someChecked = Array.from(rowCheckboxes).some((cb) => cb.checked);
        selectAllCheckbox.checked = allChecked;
        selectAllCheckbox.indeterminate = someChecked && !allChecked;
      });
    });

    rows.forEach((row, index) => {
      row.addEventListener("click", function (e) {
        if (e.target.type === "checkbox") return;
        const itemData = JSON.parse(this.dataset.item);
        showItemDetails(itemData);
      });
    });

    const sortableHeaders = document.querySelectorAll(".sortable");
    sortableHeaders.forEach((header) => {
      header.addEventListener("click", () => {
        const column = header.dataset.sort;
        const sortIcon = header.querySelector(".sort-icon");

        if (sortColumn === column) {
          sortDirection = sortDirection === "asc" ? "desc" : "asc";
        } else {
          sortColumn = column;
          sortDirection = "asc";
        }

        sortableHeaders.forEach((h) => {
          const icon = h.querySelector(".sort-icon");
          icon.classList.remove("asc", "desc");
        });
        sortIcon.classList.add(sortDirection);

        const filteredData = applyFiltersAndSearch(allAssets);
        renderTable(filteredData);
      });
    });
  }

  async function fetchData(tableType) {
    try {
      sortColumn = null;
      sortDirection = "asc";
      const response = await fetch(`${BACKEND_URL}/fetchData/${tableType}`, {
        credentials: "include",
      });
      if (!response.ok)
        throw new Error(`Network response was not ok: ${response.statusText}`);
      const data = await response.json();

      allAssets = data.map((item) => {
        const newItem = { ...item };
        for (const key in newItem) {
          if (key.toLowerCase().includes("date")) {
            newItem[key] = normalizeDateAsUTC(newItem[key]);
          }
        }
        return newItem;
      });

      populateFilters(allAssets, tableType);
      const filteredData = applyFiltersAndSearch(allAssets);
      renderTable(filteredData);

      const searchBar = document.querySelector(".search-bar");
      const filterGroup = document.querySelector(
        ".filter-group:not(:first-child)"
      );
      const downloadBtnContainer = document.querySelector(
        ".download-btn-container"
      );
      const tableWrapper = document.querySelector(".table-wrapper");

      if (searchBar) searchBar.classList.remove("hidden");
      if (filterGroup) filterGroup.classList.remove("hidden");
      if (downloadBtnContainer) downloadBtnContainer.classList.remove("hidden");
      if (tableWrapper) tableWrapper.classList.remove("hidden");
    } catch (error) {
      console.error(`Error fetching data for ${tableType}:`, error);
      const modalContent = document.getElementById("assetDetailContent");
      if (
        modalContent &&
        modalContent.closest(".modal").style.display === "block"
      ) {
        showErrorMessage(
          `Failed to load data for ${tableType}. Please try again later.`,
          modalContent
        );
      } else {
        const tempContainer = document.createElement("div");
        tempContainer.classList.add("error-message");
        document.body.appendChild(tempContainer);
        showErrorMessage(
          `Failed to load data for ${tableType}. Please try again later.`,
          tempContainer
        );
      }
      const tbody = document.getElementById("assetTableBody");
      if (tbody) {
        tbody.innerHTML =
          '<tr><td colspan="100" class="empty-message">Error loading data</td></tr>';
      }
    }
  }

  // Moved inline script from asset-tracking.html: Initialize table and modal functionality
  const tableTypeFilterTracking = document.getElementById("tableTypeFilter");
  if (tableTypeFilterTracking) {
    tableTypeFilterTracking.value = "systems";
    currentTableType = "systems";
    fetchData("systems");

    tableTypeFilterTracking.addEventListener("change", function () {
      currentTableType = this.value;
      if (currentTableType) {
        fetchData(currentTableType);
      } else {
        const searchBar = document.querySelector(".search-bar");
        const filterGroup = document.querySelector(
          ".filter-group:not(:first-child)"
        );
        const downloadBtnContainer = document.querySelector(
          ".download-btn-container"
        );
        const tableWrapper = document.querySelector(".table-wrapper");
        const tbody = document.getElementById("assetTableBody");
        const headerRow = document.getElementById("tableHeaderRow");

        if (searchBar) searchBar.classList.add("hidden");
        if (filterGroup) filterGroup.classList.add("hidden");
        if (downloadBtnContainer) downloadBtnContainer.classList.add("hidden");
        if (tableWrapper) tableWrapper.classList.add("hidden");
        if (tbody) tbody.innerHTML = "";
        if (headerRow) headerRow.innerHTML = "";
      }
    });
  }

  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const filteredData = applyFiltersAndSearch(allAssets);
      renderTable(filteredData);
    });
  }

  function showItemDetails(item) {
    console.log("Showing item details in modal:", item);
    const modal = document.getElementById("assetDetailModal");
    const modalContent = document.getElementById("assetDetailContent");
    const modalActions = modal.querySelector(".modal-actions");

    const excludedFields = [
      "create_user",
      "create_time",
      "create_date",
      "change_user",
      "change_time",
      "change_date",
    ];

    if (!modal || !modalContent || !modalActions) {
      console.error("Modal elements not found:", {
        modal,
        modalContent,
        modalActions,
      });
      return;
    }

    // Clear existing content and reset modal state
    modalContent.innerHTML = "";
    modal.dataset.item = JSON.stringify(item);
    const originalValues = { ...item };

    // Populate modal content
    for (const [key, value] of Object.entries(item)) {
      if (!excludedFields.includes(key)) {
        const formattedKey = formatColumnName(key);
        const p = document.createElement("p");
        let displayValue = value;

        if (key.toLowerCase().includes("date")) {
          displayValue = formatDateForDisplay(value);
        }

        if (key === "invoice_file" && value) {
          const link = document.createElement("a");
          link.href = `${BACKEND_URL}/${value}`;
          link.textContent = "View Invoice";
          link.target = "_blank";
          link.style.color = "#00ffcc";
          link.style.textDecoration = "underline";
          p.innerHTML = `<strong>${formattedKey}:</strong> `;
          p.appendChild(link);
        } else {
          p.innerHTML = `<strong>${formattedKey}:</strong> <span class="editable-field" data-field="${key}">${
            displayValue || ""
          }</span>`;
        }
        modalContent.appendChild(p);
      }
    }

    // Add "Generate Form" button only for "systems" table type
    if (currentTableType.toLowerCase() === "systems") {
      let generateFormBtn = modalActions.querySelector("#generateFormBtn");
      if (generateFormBtn) {
        generateFormBtn.remove();
      }

      generateFormBtn = document.createElement("button");
      generateFormBtn.className = "action-btn generate-form";
      generateFormBtn.id = "generateFormBtn";
      generateFormBtn.textContent = "Generate Form";
      generateFormBtn.style.display = "inline-block";
      generateFormBtn.addEventListener("click", () => {
        generateSystemAllocationForm(item);
      });

      const editBtn = modalActions.querySelector("#editAssetBtn");
      if (editBtn) {
        editBtn.insertAdjacentElement("afterend", generateFormBtn);
      } else {
        modalActions.appendChild(generateFormBtn);
      }
    }

    modal.style.display = "block";

    // Handle modal close
    const closeBtn = modal.querySelector(".close-btn");
    if (closeBtn) {
      const newCloseBtn = closeBtn.cloneNode(true);
      closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
      newCloseBtn.addEventListener("click", () => {
        modal.style.display = "none";
        const editBtn = document.getElementById("editAssetBtn");
        const saveBtn = document.getElementById("saveAssetBtn");
        const generateFormBtn = document.getElementById("generateFormBtn");
        if (editBtn && saveBtn) {
          editBtn.style.display = "inline-block";
          saveBtn.style.display = "none";
          if (generateFormBtn) {
            generateFormBtn.style.display = "inline-block";
          }
        }
      });
    }

    // Handle window click to close modal
    const windowClickListener = (e) => {
      if (e.target === modal) {
        modal.style.display = "none";
        const editBtn = document.getElementById("editAssetBtn");
        const saveBtn = document.getElementById("saveAssetBtn");
        const generateFormBtn = document.getElementById("generateFormBtn");
        if (editBtn && saveBtn) {
          editBtn.style.display = "inline-block";
          saveBtn.style.display = "none";
          if (generateFormBtn) {
            generateFormBtn.style.display = "inline-block";
          }
        }
      }
    };
    window.removeEventListener("click", windowClickListener);
    window.addEventListener("click", windowClickListener);

    // Setup edit and save buttons
    const editBtn = document.getElementById("editAssetBtn");
    const saveBtn = document.getElementById("saveAssetBtn");
    const generateFormBtn = document.getElementById("generateFormBtn");

    if (editBtn && saveBtn) {
      // Reset button states
      editBtn.style.display = "inline-block";
      saveBtn.style.display = "none";

      // Remove existing listeners by cloning buttons
      const newEditBtn = editBtn.cloneNode(true);
      const newSaveBtn = saveBtn.cloneNode(true);
      editBtn.parentNode.replaceChild(newEditBtn, editBtn);
      saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

      const updatedEditBtn = document.getElementById("editAssetBtn");
      const updatedSaveBtn = document.getElementById("saveAssetBtn");

      updatedEditBtn.addEventListener("click", () => {
        console.log("Edit button clicked");
        const editableFields = modalContent.querySelectorAll(".editable-field");
        const primaryKeyFields =
          primaryKeyFieldsMap[currentTableType.toLowerCase()] || [];

        // Clear any existing inputs
        modalContent
          .querySelectorAll(".edit-input")
          .forEach((input) => input.remove());

        editableFields.forEach((field) => {
          const fieldName = field.dataset.field;
          if (
            !excludedFields.includes(fieldName) &&
            !primaryKeyFields.includes(fieldName)
          ) {
            const input = document.createElement("input");
            input.type =
              fieldName.includes("date") || fieldName.includes("Date")
                ? "date"
                : fieldName.includes("price") || fieldName.includes("cost")
                ? "number"
                : "text";
            input.className = "edit-input";
            input.value = fieldName.toLowerCase().includes("date")
              ? field.textContent
              : field.textContent;
            input.dataset.field = fieldName;
            field.style.display = "none";
            field.parentElement.appendChild(input);
          }
        });
        updatedEditBtn.style.display = "none";
        updatedSaveBtn.style.display = "inline-block";
        if (generateFormBtn) {
          generateFormBtn.style.display = "none";
        }
      });

      updatedSaveBtn.addEventListener("click", async () => {
        console.log("Save button clicked");
        const updatedItem = JSON.parse(modal.dataset.item);
        const inputs = modalContent.querySelectorAll(".edit-input");
        const updates = {};
        let hasChanges = false;

        inputs.forEach((input) => {
          const fieldName = input.dataset.field;
          let newValue = input.value;
          const originalValue = (originalValues[fieldName] || "").toString();

          // Handle date fields
          if (fieldName.toLowerCase().includes("date")) {
            if (!newValue) {
              newValue = "N/A"; // Set empty dates to "N/A"
            } else if (newValue) {
              const datePattern = /^\d{4}-\d{2}-\d{2}$/;
              if (!datePattern.test(newValue)) {
                showErrorMessage(
                  `Invalid date format for ${fieldName}. Expected YYYY-MM-DD.`,
                  modalContent
                );
                return;
              }
            }
          }

          const normalizedNewValue = fieldName.toLowerCase().includes("date")
            ? normalizeDateForComparison(newValue)
            : (newValue || "").toString();
          const normalizedOriginalValue = fieldName
            .toLowerCase()
            .includes("date")
            ? normalizeDateForComparison(originalValue)
            : originalValue;

          const fieldSpan = modalContent.querySelector(
            `.editable-field[data-field="${fieldName}"]`
          );
          if (fieldSpan) {
            fieldSpan.textContent = newValue;
            fieldSpan.style.display = "inline";
            input.remove();
          }

          if (normalizedNewValue !== normalizedOriginalValue) {
            updates[fieldName] = newValue;
            hasChanges = true;
          }
        });

        // Exit early if no changes
        if (!hasChanges) {
          console.log("No changes detected, reverting to edit mode");
          updatedEditBtn.style.display = "inline-block";
          updatedSaveBtn.style.display = "none";
          if (generateFormBtn) {
            generateFormBtn.style.display = "inline-block";
          }
          return;
        }

        Object.assign(updatedItem, updates);
        modal.dataset.item = JSON.stringify(updatedItem); // Update modal dataset

        try {
          console.log("Sending update request:", {
            tableType: currentTableType,
            updates,
          });
          const response = await fetch(`${BACKEND_URL}/assets/updateByKey`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              tableType: currentTableType,
              key: {
                sr_no: updatedItem.sr_no,
                monitor_asset_tag: updatedItem.monitor_asset_tag || null,
                machine_asset_tag: updatedItem.machine_asset_tag || null,
                asset_tag: updatedItem.asset_tag || null,
              },
              updates: updates,
            }),
            credentials: "include",
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
              `Failed to update asset: ${response.status} - ${errorText}`
            );
          }

          showSuccessMessage("Asset updated successfully!", modalContent);

          // Update allAssets
          const index = allAssets.findIndex((asset) => {
            const matchesSrNo = asset.sr_no === updatedItem.sr_no;
            const matchesMonitorTag =
              asset.monitor_asset_tag ===
              (updatedItem.monitor_asset_tag || null);
            const matchesMachineTag =
              asset.machine_asset_tag ===
              (updatedItem.machine_asset_tag || null);
            const matchesAssetTag =
              asset.asset_tag === (updatedItem.asset_tag || null);
            if (currentTableType.toLowerCase() === "systems") {
              return matchesSrNo && matchesMonitorTag && matchesMachineTag;
            }
            return matchesSrNo && matchesAssetTag;
          });

          if (index !== -1) {
            allAssets[index] = updatedItem;
          } else {
            console.warn("Asset not found in allAssets, pushing new item");
            allAssets.push(updatedItem);
          }

          const filteredData = applyFiltersAndSearch(allAssets);
          renderTable(filteredData);

          updatedEditBtn.style.display = "inline-block";
          updatedSaveBtn.style.display = "none";
          if (generateFormBtn) {
            generateFormBtn.style.display = "inline-block";
          }
        } catch (error) {
          console.error("Error updating asset:", error);
          showErrorMessage(
            `Failed to update asset: ${error.message}`,
            modalContent
          );
        }
      });
    } else {
      console.error("Edit or Save button not found");
    }
  }

  function generateSystemAllocationForm(item) {
    console.log("Generating system allocation form for item:", item);

    // Store the item data in localStorage to access it on the target page
    try {
      localStorage.setItem("systemAllocationItem", JSON.stringify(item));
      console.log("Item data stored in localStorage:", item);
    } catch (error) {
      console.error("Error storing item in localStorage:", error);
      const modalContent = document.getElementById("assetDetailContent");
      if (modalContent) {
        showErrorMessage(
          "Failed to store form data. Please try again.",
          modalContent
        );
      }
      return;
    }

    // Close the modal
    const modal = document.getElementById("assetDetailModal");
    if (modal) {
      modal.style.display = "none";
    } else {
      console.warn("Asset detail modal not found, cannot close modal.");
    }

    // Open laptop-checklist.html in a new tab
    try {
      const newTab = window.open("laptop-checklist.html", "_blank");
      if (!newTab) {
        console.error("Failed to open new tab. Popup blocker may be enabled.");
        const modalContent = document.getElementById("assetDetailContent");
        if (modalContent) {
          showErrorMessage(
            "Failed to open form. Please allow popups and try again.",
            modalContent
          );
        }
      } else {
        console.log("Opened new tab for laptop-checklist.html");
      }
    } catch (error) {
      console.error("Error opening new tab:", error);
      const modalContent = document.getElementById("assetDetailContent");
      if (modalContent) {
        showErrorMessage(
          "Failed to open form page. Please try again.",
          modalContent
        );
      }
    }
  }

  const exportExcelBtn = document.getElementById("export-excel-btn");
  if (exportExcelBtn) {
    exportExcelBtn.addEventListener("click", async function () {
      const selectedRows = getSelectedRows();
      if (selectedRows.length > 0) {
        try {
          const response = await fetch(`${BACKEND_URL}/export-excel`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ data: selectedRows }),
            credentials: "include",
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
              `Failed to generate Excel file: ${response.status} - ${errorText}`
            );
          }

          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download =
            response.headers
              .get("Content-Disposition")
              ?.split("filename=")[1] || "IT_Inventory_Management.xlsx";
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        } catch (error) {
          console.error("Error exporting to Excel:", error);
          const errorContainer =
            document.querySelector(".download-btn-container") || document.body;
          if (error.message.includes("404")) {
            showErrorMessage(
              "Export failed: Server endpoint not found. Please ensure the server is running.",
              errorContainer
            );
          } else {
            showErrorMessage(
              "Failed to export to Excel. Please try again.",
              errorContainer
            );
          }
        }
      } else {
        const errorContainer =
          document.querySelector(".download-btn-container") || document.body;
        showErrorMessage(
          "Please select at least one row to export.",
          errorContainer
        );
      }
    });
  }

  function getSelectedRows() {
    const selectedRows = [];
    const rowCheckboxes = document.querySelectorAll(".row-checkbox:checked");

    rowCheckboxes.forEach((checkbox) => {
      const row = checkbox.closest("tr");
      const itemData = JSON.parse(row.dataset.item);
      selectedRows.push(itemData);
    });

    return selectedRows;
  }

  // Updated logic for laptop-checklist.html: Initialize form functionality with new requirements
  if (window.location.pathname.includes("laptop-checklist.html")) {
    const issuingContainer = document.querySelector(".issuing-container");
    const checklistContainer = document.querySelector(".checklist-container");
    const nextBtn = document.getElementById("nextBtn");
    const submitBtn = document.getElementById("submitBtn");
    const issuingForm = document.getElementById("issuingForm");
    const checklistForm = document.getElementById("checklistForm");

    // Create Save, Print, and Back to List buttons dynamically
    const saveBtn = document.createElement("button");
    saveBtn.id = "saveBtn";
    saveBtn.textContent = "Save";
    saveBtn.style.display = "none";
    saveBtn.className = "action-btn submit-btn";

    const printBtn = document.createElement("button");
    printBtn.id = "printBtn";
    printBtn.textContent = "Print";
    printBtn.style.display = "none";
    printBtn.className = "action-btn print-btn";

    const backBtn = document.createElement("button");
    backBtn.id = "backBtn";
    backBtn.textContent = "Back to List";
    backBtn.style.display = "none";
    backBtn.className = "action-btn back-btn";
    backBtn.addEventListener("click", () => {
      window.location.href = "asset-tracking.html";
    });

    // Append Save, Print, and Back to List buttons to the checklist form
    if (checklistForm) {
      const buttonContainer =
        checklistForm.querySelector(".form-buttons") ||
        document.createElement("div");
      buttonContainer.className = "form-buttons";
      buttonContainer.appendChild(saveBtn);
      buttonContainer.appendChild(printBtn);
      buttonContainer.appendChild(backBtn);
      checklistForm.appendChild(buttonContainer);
    }

    if (
      issuingForm &&
      checklistForm &&
      nextBtn &&
      submitBtn &&
      issuingContainer &&
      checklistContainer
    ) {
      // Format and set current date for "Issued By / Date" field
      const currentDate = new Date();
      const day = currentDate.getDate();
      const month = currentDate
        .toLocaleString("default", { month: "short" })
        .toUpperCase();
      const year = currentDate.getFullYear();
      const formattedDate = `${day}-${month}-${year}`;
      const currentDateElement = document.getElementById("currentDate");
      if (currentDateElement) {
        currentDateElement.textContent = formattedDate;
      }

      // Make specified fields editable, others read-only
      const editableFields = [
        "username",
        "deptName",
        "dateOfIssue",
        "accessories",
      ];
      const allInputs = issuingForm.querySelectorAll("input");
      allInputs.forEach((input) => {
        if (!editableFields.includes(input.id)) {
          input.setAttribute("readonly", "true");
        }
      });

      // Check if we're here to print a record or generate a new form
      const printSrNo = localStorage.getItem("printSystemAllocationSrNo");
      const storedItem = localStorage.getItem("systemAllocationItem");
      let isPrinting = false;
      let srNo = null;
      let machineAssetTag = null;
      let monitorAssetTag = null;

      if (printSrNo) {
        // Handle printing scenario
        const srNoNum = Number(printSrNo);
        console.log(
          "Found printSystemAllocationSrNo in localStorage:",
          srNoNum
        );

        // Find the record in the records array
        const record = records.find((r) => r.srNo === srNoNum);
        if (record) {
          console.log("Record found for printing:", record);
          // Populate issuing form with mapped fields
          document.getElementById("username").value = record.username || "";
          document.getElementById("deptName").value = record.deptName || "";
          document.getElementById("dateOfIssue").value =
            record.dateOfIssue || "";
          document.getElementById("laptop").value = record.laptop || "";
          document.getElementById("serialNo").value = record.serialNo || "";
          document.getElementById("configuration").value =
            record.configuration || "";
          document.getElementById("accessories").value =
            record.accessories || "";
          document.getElementById("assetTag").value = record.assetTag || "";
          document.getElementById("issuedPerson").value =
            record.issuedPerson || "";

          // Populate checklist form
          document.getElementById("systemName").value =
            record.checklist.systemName || "";
          for (let i = 1; i <= 32; i++) {
            const statusElement = document.querySelector(
              `select[name="status${i}"]`
            );
            if (statusElement) {
              statusElement.value =
                record.checklist.statuses[`status${i}`] || "N/A";
            }
          }
          syncChecklistFields();

          // Show both forms for printing
          issuingContainer.classList.add("active");
          checklistContainer.classList.add("active");
          checklistContainer.style.display = "block";
          nextBtn.style.display = "none";
          saveBtn.style.display = "none";
          printBtn.style.display = "none";
          backBtn.style.display = "none";

          // Hide other buttons to prevent interaction during printing
          document
            .querySelectorAll("button:not(#submitBtn)")
            .forEach((btn) => (btn.style.display = "none"));

          // Trigger print after a short delay to ensure DOM updates
          setTimeout(() => {
            window.print();
            // Restore visibility after printing
            document
              .querySelectorAll("button")
              .forEach((btn) => (btn.style.display = "inline-block"));
            checklistContainer.style.display = "none";
            nextBtn.style.display = "block";
            saveBtn.style.display = "none";
            printBtn.style.display = "none";
            backBtn.style.display = "none";
          }, 500);

          isPrinting = true;
        } else {
          console.error(
            `No record found for srNo: ${srNoNum} in records array:`,
            records
          );
        }

        // Clean up: Remove the printSrNo from localStorage
        localStorage.removeItem("printSystemAllocationSrNo");
        console.log("Cleared printSystemAllocationSrNo from localStorage");
      } else if (storedItem) {
        // Handle form generation scenario
        try {
          const item = JSON.parse(storedItem);
          console.log(
            "Retrieved item from localStorage for form generation:",
            item
          );

          // Store keys for updating the record
          srNo = item.sr_no || null;
          machineAssetTag = item.machine_asset_tag || null;
          monitorAssetTag = item.monitor_asset_tag || null;

          // Map the fields as specified
          document.getElementById("username").value = item.user_name || "";
          document.getElementById("deptName").value = item.department || "";
          document.getElementById("dateOfIssue").value =
            item.date_of_issue || "";
          document.getElementById("laptop").value = `${item.make || ""} ${
            item.model || ""
          }`.trim();
          document.getElementById("serialNo").value = item.serial_number || "";
          document.getElementById("configuration").value = `${
            item.processor || ""
          } ${item.ram || ""} ${item.hard_disk || ""}`.trim();
          document.getElementById("accessories").value = item.accessories || "";
          document.getElementById("assetTag").value =
            item.machine_asset_tag || "";
          document.getElementById("issuedPerson").value = item.issued_by || "";

          // Populate checklist form
          document.getElementById("systemName").value = item.system_name || "";
          syncChecklistFields();

          // Show the issuing form
          issuingContainer.classList.add("active");
          checklistContainer.classList.remove("active");
          checklistContainer.style.display = "none";
          nextBtn.style.display = "block";
          saveBtn.style.display = "none";
          printBtn.style.display = "none";
          backBtn.style.display = "none";

          // Clean up: Remove the item from localStorage after use
          localStorage.removeItem("systemAllocationItem");
          console.log("Cleared systemAllocationItem from localStorage");
        } catch (error) {
          console.error(
            "Error retrieving or parsing item from localStorage:",
            error
          );
          issuingContainer.classList.add("active");
          checklistContainer.classList.remove("active");
          checklistContainer.style.display = "none";
          nextBtn.style.display = "block";
          saveBtn.style.display = "none";
          printBtn.style.display = "none";
          backBtn.style.display = "none";
        }
      } else {
        // Default: Show empty form
        console.warn(
          "No system allocation item or print request found in localStorage, showing empty form."
        );
        issuingContainer.classList.add("active");
        checklistContainer.classList.remove("active");
        checklistContainer.style.display = "none";
        nextBtn.style.display = "block";
        saveBtn.style.display = "none";
        printBtn.style.display = "none";
        backBtn.style.display = "none";
      }

      // Add asterisk to systemName label to indicate it's mandatory
      const systemNameLabel = checklistForm.querySelector(
        'label[for="systemName"]'
      );
      if (systemNameLabel) {
        systemNameLabel.innerHTML =
          'System Name <span style="color: red;">*</span>';
      }
      const systemNameInput = document.getElementById("systemName");
      if (systemNameInput) {
        systemNameInput.setAttribute("required", "true");
      }

      // Next button handler - only transitions to checklist form
      nextBtn.addEventListener("click", function () {
        if (issuingForm.checkValidity()) {
          syncChecklistFields();
          issuingContainer.classList.remove("active");
          checklistContainer.classList.add("active");
          checklistContainer.style.display = "block";
          nextBtn.style.display = "none";
          saveBtn.style.display = "inline-block";
          printBtn.style.display = "inline-block";
          backBtn.style.display = "inline-block";
        } else {
          issuingForm.reportValidity();
        }
      });

      // Save button handler - updates the database and retains form state
      saveBtn.addEventListener("click", async function (e) {
        e.preventDefault();

        // Validate systemName field
        const systemName = document.getElementById("systemName")?.value.trim();
        if (!systemName) {
          showErrorMessage(
            "System Name is mandatory. Please fill in this field.",
            checklistContainer
          );
          alert("System Name is mandatory. Please fill in this field.");
          return;
        }

        // Collect form data
        const issuingData = {
          srNo: srNo || srNoCounter++,
          username: document.getElementById("username")?.value || "",
          deptName: document.getElementById("deptName")?.value || "",
          dateOfIssue: document.getElementById("dateOfIssue")?.value || "",
          laptop: document.getElementById("laptop")?.value || "",
          serialNo: document.getElementById("serialNo")?.value || "",
          configuration: document.getElementById("configuration")?.value || "",
          accessories: document.getElementById("accessories")?.value || "",
          assetTag: document.getElementById("assetTag")?.value || "",
          issuedPerson: document.getElementById("issuedPerson")?.value || "",
        };

        const checklistData = {
          systemName: systemName,
          statuses: {},
        };
        for (let i = 1; i <= 32; i++) {
          const statusElement = document.querySelector(
            `select[name="status${i}"]`
          );
          checklistData.statuses[`status${i}`] = statusElement
            ? statusElement.value
            : "N/A";
        }

        const combinedData = { ...issuingData, checklist: checklistData };

        // Update records array
        const recordIndex = records.findIndex(
          (r) => r.srNo === combinedData.srNo
        );
        if (recordIndex !== -1) {
          records[recordIndex] = combinedData;
          console.log("Record updated:", records[recordIndex]);
        } else {
          records.push(combinedData);
          console.log("Record added:", combinedData);
        }
        console.log("Current records array:", records);

        // Save records to localStorage
        try {
          localStorage.setItem(
            "systemAllocationRecords",
            JSON.stringify(records)
          );
          console.log("Updated records in localStorage:", records);
        } catch (error) {
          console.error("Error saving records to localStorage:", error);
        }

        // Update the asset in the database if srNo and asset tags are available
        if (srNo && machineAssetTag && monitorAssetTag) {
          const updates = {
            user_name: issuingData.username,
            department: issuingData.deptName,
            date_of_issue: issuingData.dateOfIssue || null,
            accessories: issuingData.accessories,
          };

          try {
            const response = await fetch(`${BACKEND_URL}/assets/updateByKey`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                tableType: "systems",
                key: {
                  sr_no: srNo,
                  machine_asset_tag: machineAssetTag,
                  monitor_asset_tag: monitorAssetTag,
                },
                updates: updates,
              }),
              credentials: "include",
            });

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(
                `Failed to update asset: ${response.status} - ${errorText}`
              );
            }

            console.log("Asset updated successfully in the database!");
          } catch (error) {
            console.error("Error updating asset in database:", error);
            alert("Failed to update asset in the database. Please try again.");
          }
        }

        // Keep the form state and show checklist section with buttons
        syncChecklistFields();
        issuingContainer.classList.remove("active");
        checklistContainer.classList.add("active");
        checklistContainer.style.display = "block";
        nextBtn.style.display = "none";
        saveBtn.style.display = "inline-block";
        printBtn.style.display = "inline-block";
        backBtn.style.display = "inline-block";

        renderSystemAllocationDashboard();
      });

      printBtn.addEventListener("click", function (e) {
        e.preventDefault();

        // Validate systemName field
        const systemName = document.getElementById("systemName")?.value.trim();
        if (!systemName) {
          showErrorMessage(
            "System Name is mandatory. Please fill in this field.",
            checklistContainer
          );
          alert("System Name is mandatory. Please fill in this field.");
          return;
        }

        // Temporarily hide buttons to avoid printing them
        document
          .querySelectorAll("button:not(#submitBtn)")
          .forEach((btn) => (btn.style.display = "none"));

        // Trigger print
        window.print();

        // Restore visibility after printing
        document
          .querySelectorAll("button")
          .forEach((btn) => (btn.style.display = "inline-block"));
        checklistContainer.style.display = "none";
        nextBtn.style.display = "block";
        saveBtn.style.display = "none";
        printBtn.style.display = "none";
        backBtn.style.display = "none";

        issuingForm.reset();
        checklistForm.reset();
        document.getElementById("checklistUsername").textContent = "";
        document.getElementById("checklistSerialNo").textContent = "";
        document.getElementById("checklistAssetTag").textContent = "";
        issuingContainer.classList.add("active");
        checklistContainer.classList.remove("active");
      });

      // Remove the old submit button's functionality as it's replaced by Save and Print
      submitBtn.style.display = "none";
    }
  }
});