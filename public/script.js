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
  systems: ["remarks", "date_of_issue"],
  servers: ["remarks"],
  switch: ["remarks"],
  firewall: ["remarks"],
  printers_and_scanners: ["remarks"],
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
  if (!dateValue) return "";
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

// Helper function to format dates for display
function formatDateForDisplay(dateValue) {
  return normalizeDateAsUTC(dateValue);
}

// Helper function to normalize dates for comparison
function normalizeDateForComparison(dateValue) {
  return normalizeDateAsUTC(dateValue);
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
      const formButtonContainer = document.getElementById(
        "formButtonContainer"
      );
      if (!tableType) {
        formContainer.innerHTML = "";
        formButtonContainer.style.display = "none";
        return;
      }

      try {
        const response = await fetch(
          `${BACKEND_URL}/fetchColumns/${tableType}`,
          { credentials: "include" }
        );
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to fetch columns: ${response.status} - ${errorText}`
          );
        }
        const { columns } = await response.json();
        const excludedFields = [
          "create_user",
          "create_time",
          "create_date",
          "change_user",
          "change_time",
          "change_date",
        ];
        const displayColumns = columns.filter(
          (col) => !excludedFields.includes(col)
        );

        formContainer.innerHTML = "";
        const nonRequiredFields = nonRequiredFieldsMap[tableType] || [];
        const lastSrNo = await fetchLastSrNo(tableType);
        const nextSrNo = lastSrNo + 1;

        displayColumns.forEach((column) => {
          const div = document.createElement("div");
          div.className = "form-group";

          const label = document.createElement("label");
          label.htmlFor = `${column}Input`;
          label.textContent = formatColumnName(column);

          let input;
          if (column === "invoice_file") {
            input = document.createElement("input");
            input.type = "file";
            input.id = `${column}Input`;
            input.name = column;
            input.accept = "application/pdf";
            if (!nonRequiredFields.includes(column)) {
              input.required = true;
            }
          } else if (column === "sr_no") {
            input = document.createElement("input");
            input.type = "number";
            input.id = `${column}Input`;
            input.name = column;
            input.value = nextSrNo;
            input.readOnly = true;
            if (!nonRequiredFields.includes(column)) {
              input.required = true;
            }
          } else {
            input = document.createElement("input");
            input.type = column.includes("date") ? "date" : "text";
            input.id = `${column}Input`;
            input.name = column;
            if (!nonRequiredFields.includes(column)) {
              input.required = true;
            }
          }
          formButtonContainer.style.display = "block";

          div.appendChild(label);
          div.appendChild(input);
          formContainer.appendChild(div);
        });
      } catch (error) {
        console.error(
          `Error fetching columns for ${tableType}:`,
          error.message
        );
        showErrorMessage(
          "Failed to load form fields. Please try again.",
          messageContainer
        );
        formButtonContainer.style.display = "none";
      }
    }

    tableTypeFilter.value = "systems";
    fetchColumnsForTableType("systems");

    tableTypeFilter.addEventListener("change", async function () {
      const tableType = this.value;
      await fetchColumnsForTableType(tableType);
    });

    assetForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const tableType = tableTypeFilter.value;
      if (!tableType) {
        showErrorMessage("Please select an asset type.", messageContainer);
        return;
      }

      const formData = new FormData(this);
      formData.append("tableType", tableType);

      try {
        const response = await fetch(`${BACKEND_URL}/assets`, {
          method: "POST",
          body: formData,
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

    const excludedFields = [
      "create_user",
      "create_time",
      "create_date",
      "change_user",
      "change_time",
      "change_date",
    ];

    if (modal && modalContent) {
      modalContent.innerHTML = "";
      const originalValues = { ...item };

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
        const modalActions = modal.querySelector(".modal-actions");
        if (modalActions) {
          // Remove any existing "Generate Form" button to prevent duplicates
          const existingGenerateFormBtn =
            modalActions.querySelector("#generateFormBtn");
          if (existingGenerateFormBtn) {
            existingGenerateFormBtn.remove();
          }

          // Create new "Generate Form" button
          const generateFormBtn = document.createElement("button");
          generateFormBtn.className = "action-btn generate-form";
          generateFormBtn.id = "generateFormBtn";
          generateFormBtn.textContent = "Generate Form";
          generateFormBtn.addEventListener("click", () => {
            generateSystemAllocationForm(item);
          });

          // Insert "Generate Form" button after the edit button
          const editBtn = modalActions.querySelector("#editAssetBtn");
          if (editBtn) {
            editBtn.insertAdjacentElement("afterend", generateFormBtn);
          } else {
            modalActions.appendChild(generateFormBtn);
          }
        }
      }

      modal.dataset.item = JSON.stringify(item);
      modal.style.display = "block";

      const closeBtn = modal.querySelector(".close-btn");
      if (closeBtn) {
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        newCloseBtn.addEventListener("click", () => {
          modal.style.display = "none";
          const editBtn = document.getElementById("editAssetBtn");
          const saveBtn = document.getElementById("saveAssetBtn");
          if (editBtn && saveBtn) {
            editBtn.style.display = "inline-block";
            saveBtn.style.display = "none";
          }
        });
      }

      const existingWindowListener = (e) => {
        if (e.target === modal) {
          modal.style.display = "none";
          const editBtn = document.getElementById("editAssetBtn");
          const saveBtn = document.getElementById("saveAssetBtn");
          if (editBtn && saveBtn) {
            editBtn.style.display = "inline-block";
            saveBtn.style.display = "none";
          }
        }
      };
      window.removeEventListener("click", existingWindowListener);
      window.addEventListener("click", existingWindowListener);

      const editBtn = document.getElementById("editAssetBtn");
      const saveBtn = document.getElementById("saveAssetBtn");
      if (editBtn && saveBtn) {
        editBtn.style.display = "inline-block";
        saveBtn.style.display = "none";

        const newEditBtn = editBtn.cloneNode(true);
        const newSaveBtn = saveBtn.cloneNode(true);
        editBtn.parentNode.replaceChild(newEditBtn, editBtn);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

        const updatedEditBtn = document.getElementById("editAssetBtn");
        const updatedSaveBtn = document.getElementById("saveAssetBtn");

        updatedEditBtn.addEventListener("click", () => {
          const editableFields =
            modalContent.querySelectorAll(".editable-field");
          const primaryKeyFields =
            primaryKeyFieldsMap[currentTableType.toLowerCase()] || [];

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
        });

        updatedSaveBtn.addEventListener("click", async () => {
          const updatedItem = JSON.parse(modal.dataset.item);
          const inputs = modalContent.querySelectorAll(".edit-input");
          const updates = {};
          let hasChanges = false;

          inputs.forEach((input) => {
            const fieldName = input.dataset.field;
            let newValue = input.value;
            const originalValue = (originalValues[fieldName] || "").toString();

            if (fieldName.toLowerCase().includes("date")) {
              if (newValue) {
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
            fieldSpan.textContent = newValue;
            fieldSpan.style.display = "inline";
            input.remove();

            if (normalizedNewValue !== normalizedOriginalValue) {
              updates[fieldName] = newValue;
              hasChanges = true;
            }
          });

          if (!hasChanges) {
            updatedEditBtn.style.display = "inline-block";
            updatedSaveBtn.style.display = "none";
            return;
          }

          Object.assign(updatedItem, updates);

          try {
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

            if (!response.ok) throw new Error("Failed to update asset");

            showSuccessMessage("Asset updated successfully!", modalContent);

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
            }

            const filteredData = applyFiltersAndSearch(allAssets);
            renderTable(filteredData);

            updatedEditBtn.style.display = "inline-block";
            updatedSaveBtn.style.display = "none";
          } catch (error) {
            console.error("Error updating asset:", error);
            showErrorMessage(
              "Failed to update asset. Please try again.",
              modalContent
            );
          }
        });
      }
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

  if (issuingForm && checklistForm && nextBtn && submitBtn && issuingContainer && checklistContainer)
  {
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
      console.log("Found printSystemAllocationSrNo in localStorage:", srNoNum);

      // Find the record in the records array
      const record = records.find((r) => r.srNo === srNoNum);
      if (record) {
        console.log("Record found for printing:", record);
        // Populate issuing form with mapped fields
        document.getElementById("username").value = record.username || "";
        document.getElementById("deptName").value = record.deptName || "";
        document.getElementById("dateOfIssue").value = record.dateOfIssue || "";
        document.getElementById("laptop").value = record.laptop || "";
        document.getElementById("serialNo").value = record.serialNo || "";
        document.getElementById("configuration").value = record.configuration || "";
        document.getElementById("accessories").value = record.accessories || "";
        document.getElementById("assetTag").value = record.assetTag || "";
        document.getElementById("issuedPerson").value = record.issuedPerson || "";

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
        document.getElementById("dateOfIssue").value = item.date_of_issue || "";
        document.getElementById("laptop").value = `${item.make || ""} ${item.model || ""}`.trim();
        document.getElementById("serialNo").value = item.serial_number || "";
        document.getElementById("configuration").value = `${item.processor || ""} ${item.ram || ""} ${item.hard_disk || ""}`.trim();
        document.getElementById("accessories").value = item.accessories || "";
        document.getElementById("assetTag").value = item.machine_asset_tag || "";
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
        console.error("Error retrieving or parsing item from localStorage:", error);
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
        showErrorMessage("System Name is mandatory. Please fill in this field.", checklistContainer);
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
      const recordIndex = records.findIndex((r) => r.srNo === combinedData.srNo);
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
        localStorage.setItem("systemAllocationRecords", JSON.stringify(records));
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
          accessories: issuingData.accessories
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
                monitor_asset_tag: monitorAssetTag
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
        showErrorMessage("System Name is mandatory. Please fill in this field.", checklistContainer);
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
