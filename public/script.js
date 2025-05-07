const BACKEND_URL = 'http://localhost:3000'; // Update if your server runs on a different port

console.log("script.js loaded successfully");

// Variables for filtering, searching, sorting, and table type
let allAssets = []; // Store all fetched data
let sortColumn = null; // Default to null to disable initial sorting
let sortDirection = "asc"; // Default sort direction
let currentTableType = ""; // Store the selected table type
const cube = document.getElementById('cube');
const video = document.getElementById('background-video');


// Cube rotation functions
function rotateToLogin() {
  cube.style.transform = 'translateZ(-200px) rotateY(0deg)';
}

function rotateToRegister() {
  cube.style.transform = 'translateZ(-200px) rotateY(-120deg)';
}

function rotateToReset() {
  cube.style.transform = 'translateZ(-200px) rotateY(-240deg)';
}

// Password show/hide toggle
document.querySelectorAll('.toggle-password').forEach(toggle => {
  toggle.addEventListener('click', () => {
      const targetId = toggle.getAttribute('data-target');
      const passwordInput = document.getElementById(targetId);
      
      if (passwordInput.type === 'password') {
          passwordInput.type = 'text';
          toggle.classList.add('active');
      } else {
          passwordInput.type = 'password';
          toggle.classList.remove('active');
      }
  });
});

// Ensure the video plays on page load
window.addEventListener('load', () => {
  video.play().catch(error => {
      console.log("Autoplay blocked by browser:", error);
  });
});

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
    "status"
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
  printers_and_scanners: ["sr_no", "asset_tag"]
};

// Define non-required fields for each table type (fields that should NOT have an asterisk or be required)
const nonRequiredFieldsMap = {
  systems: ["remarks"],
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

// Helper function to calculate the width of text (for dynamic column sizing)
function getTextWidth(text, font = "16px Arial") {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  context.font = font;
  const metrics = context.measureText(text);
  return metrics.width + 20; // Add padding
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
  // Collapse all other cards
  document.querySelectorAll('.history-asset-card').forEach(c => {
    if (c !== card) {
      c.classList.remove('expanded');
    }
  });
  // Toggle the clicked card
  card.classList.toggle('expanded');
}

// Function to show asset history in the Asset History Log tab
async function showAssetHistory() {
  console.log("Entering showAssetHistory");

  // Reference existing elements from asset-history.html
  const historyTableTypeFilter = document.getElementById("historyTableTypeFilter");
  const historySearchInput = document.getElementById("historySearchInput");
  const historyResetSearchBtn = document.getElementById("historyResetSearchBtn");
  const historyMessageContainer = document.getElementById("historyMessageContainer");
  const historyAssetGrid = document.getElementById("historyAssetGrid");

  console.log("Checking required DOM elements for Asset History page");
  if (!historyTableTypeFilter || !historySearchInput || !historyResetSearchBtn || 
      !historyMessageContainer || !historyAssetGrid) {
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

  // Store fetched assets and their change history
  let historyAssets = [];
  let filteredAssets = [];
  let assetChangeHistoryMap = new Map(); // Map to store change history for each asset
  console.log("Initialized historyAssets, filteredAssets, and assetChangeHistoryMap");

  // Helper function to fetch change history for an asset
  async function fetchChangeHistory(asset, tableType) {
    console.log(`Entering fetchChangeHistory for asset ${asset.sr_no}, tableType: ${tableType}`);
    const body = { tableType };
    if (tableType.toLowerCase() === "systems") {
      body.sr_no = asset.sr_no;
      body.machine_asset_tag = asset.machine_asset_tag;
      body.monitor_asset_tag = asset.monitor_asset_tag;
      console.log("Body for systems:", body);
    } else {
      body.sr_no = asset.sr_no;
      body.asset_tag = asset.asset_tag;
      console.log("Body for non-systems:", body);
    }

    try {
      console.log("Making fetch request to /assetHistory");
      const response = await fetch(`${BACKEND_URL}/assetHistory`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      console.log(`Fetch response status: ${response.status}`);
      if (!response.ok) {
        console.error(`Fetch response not ok: ${response.status} ${response.statusText}`);
        throw new Error("Failed to fetch asset history");
      }

      const data = await response.json();
      console.log(`Fetched change history for asset ${asset.sr_no}:`, data.history || []);
      console.log(`Exiting fetchChangeHistory for asset ${asset.sr_no}`);
      return data.history || [];
    } catch (error) {
      console.error(`Error fetching asset history for asset ${asset.sr_no}:`, error.message);
      console.log(`Exiting fetchChangeHistory for asset ${asset.sr_no} with error`);
      return [];
    }
  }

  // Function to render assets as cards, showing details from the main table
  async function renderAssets(assets) {
    console.log("Entering renderAssets");
    console.log(`Rendering assets, total assets: ${assets.length}`);
    console.log("Assets:", assets);
    historyAssetGrid.innerHTML = ""; // Clear the grid
    console.log("Cleared historyAssetGrid");

    if (assets.length === 0) {
      console.log("No assets available to render");
      historyAssetGrid.innerHTML = '<p class="empty-message">No assets with changes available.</p>';
      console.log("Set historyAssetGrid to 'No assets with changes available'");
      console.log("Exiting renderAssets");
      return;
    }

    const tableType = historyTableTypeFilter.value;
    console.log(`Current tableType: ${tableType}`);
    const allColumns = assets.length > 0 ? Object.keys(assets[0]) : [];
    console.log(`All columns available: ${allColumns.join(", ")}`);

    let hasRenderedCards = false; // Track if any cards are rendered
    console.log("Initialized hasRenderedCards to false");

    // Get visible columns for the current table type
    const visibleColumns = visibleColumnsMap[tableType.toLowerCase()] || allColumns;
    console.log(`Visible columns for ${tableType}:`, visibleColumns);

    // Create a card for each asset
    console.log("Starting to render cards for assets");
    assets.forEach((asset, index) => {
      console.log(`Rendering card for asset ${index + 1}, sr_no: ${asset.sr_no}`);
      const { history } = assetChangeHistoryMap.get(JSON.stringify(asset)) || { history: [] };
      console.log(`Change history entries for asset ${asset.sr_no}:`, history);

      // If no changes exist for this asset, skip rendering it
      if (history.length === 0) {
        console.log(`Asset ${asset.sr_no} has no changes, skipping card`);
        return;
      }

      console.log(`Asset ${asset.sr_no} has changes, rendering card`);
      const card = document.createElement("div");
      card.classList.add("history-asset-card");
      card.setAttribute("onclick", "toggleCard(this)");
      card.dataset.asset = JSON.stringify(asset);

      // Build the card content, showing details from the main table using visibleColumns
      let cardContent = '<div class="card-content">';
      visibleColumns.forEach(column => {
        if (allColumns.includes(column)) {
          const formattedColumn = formatColumnName(column);
          const value = asset[column] || "";
          cardContent += `
            <p><strong>${formattedColumn}:</strong> ${value}</p>
          `;
          console.log(`Added field to card: ${formattedColumn}: ${value}`);
        }
      });
      cardContent += '</div>';

      // Add the history details section (hidden by default)
      let historyContent = '<div class="history-details">';
      if (history.length === 0) {
        historyContent += '<p>No changes available for this asset.</p>';
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
                <th>Change Time</th>
              </tr>
            </thead>
            <tbody>
        `;
        history.forEach(entry => {
          historyContent += `
            <tr>
              <td>${formatColumnName(entry.field_name)}</td>
              <td>${entry.old_value || ""}</td>
              <td>${entry.new_value || ""}</td>
              <td>${entry.changed_by}</td>
              <td>${entry.change_date}</td>
              <td>${entry.change_time}</td>
            </tr>
          `;
        });
        historyContent += `
            </tbody>
          </table>
        `;
      }
      historyContent += '</div>';

      card.innerHTML = cardContent + historyContent;
      historyAssetGrid.appendChild(card);
      hasRenderedCards = true; // Mark that a card was rendered
      console.log(`Appended card for asset ${asset.sr_no} to historyAssetGrid`);
      console.log(`Set hasRenderedCards to true`);
    });

    // If no cards were rendered, display the message
    console.log(`Checking if any cards were rendered: hasRenderedCards = ${hasRenderedCards}`);
    if (!hasRenderedCards) {
      console.log("No assets with change history found, displaying message");
      historyAssetGrid.innerHTML = '<p class="empty-message">No assets with changes available.</p>';
      console.log("Set historyAssetGrid to 'No assets with changes available'");
    } else {
      console.log("Cards rendered successfully");
    }

    console.log("Exiting renderAssets");
  }

  // Function to fetch assets and filter only those with changes
  async function fetchAssets(tableType) {
    console.log("Entering fetchAssets");
    console.log(`Fetching assets for tableType: ${tableType}`);
    if (!tableType) {
      console.log("No tableType provided, clearing historyAssetGrid");
      historyAssetGrid.innerHTML = "";
      console.log("Exiting fetchAssets");
      return;
    }

    try {
      console.log(`Making fetch request to ${BACKEND_URL}/fetchData/${tableType}`);
      const response = await fetch(`${BACKEND_URL}/fetchData/${tableType}`);
      console.log(`Fetch response status: ${response.status}`);
      if (!response.ok) {
        console.error(`Fetch response not ok: ${response.status} ${response.statusText}`);
        throw new Error("Failed to fetch assets");
      }
      const allFetchedAssets = await response.json();
      console.log("Fetched assets:", allFetchedAssets);
      console.log(`Number of assets fetched: ${allFetchedAssets.length}`);

      // Filter assets to only include those with changes
      historyAssets = [];
      assetChangeHistoryMap.clear();
      console.log("Cleared assetChangeHistoryMap");
      for (const asset of allFetchedAssets) {
        console.log(`Checking asset ${asset.sr_no} for changes`);
        const history = await fetchChangeHistory(asset, tableType);
        if (history.length > 0) {
          console.log(`Asset ${asset.sr_no} has changes, including in historyAssets`);
          historyAssets.push(asset);
          assetChangeHistoryMap.set(JSON.stringify(asset), { history });
        } else {
          console.log(`Asset ${asset.sr_no} has no changes, excluding from historyAssets`);
        }
      }

      console.log(`Number of assets with changes: ${historyAssets.length}`);
      filteredAssets = [...historyAssets];
      console.log("Copied historyAssets to filteredAssets");
      console.log("Calling renderAssets with filteredAssets");
      await renderAssets(filteredAssets);
      console.log("Finished rendering assets");
    } catch (error) {
      console.error("Error fetching assets for history:", error.message);
      showErrorMessage("Failed to load assets. Please try again.", historyMessageContainer);
      historyAssetGrid.innerHTML = '<p class="empty-message">Error loading assets.</p>';
      console.log("Set historyAssetGrid to 'Error loading assets'");
    }
    console.log("Exiting fetchAssets");
  }

  // Function to apply search filter across visible columns
  async function applySearchFilter() {
    console.log("Entering applySearchFilter");
    const searchValue = historySearchInput.value.toLowerCase().trim();
    const tableType = historyTableTypeFilter.value;

    console.log(`Applying search filter - Value: ${searchValue}, TableType: ${tableType}`);

    const visibleColumns = visibleColumnsMap[tableType.toLowerCase()] || [];
    console.log(`Visible columns for search: ${visibleColumns.join(", ")}`);

    filteredAssets = historyAssets.filter(asset => {
      const { history } = assetChangeHistoryMap.get(JSON.stringify(asset)) || { history: [] };
      console.log(`Filtering asset ${asset.sr_no}, History length: ${history.length}`);
      // Only include assets with change history
      if (history.length === 0) {
        console.log(`Asset ${asset.sr_no} has no changes, excluding from search`);
        return false;
      }
      const matches = visibleColumns.some(column => {
        const fieldValue = (asset[column] || "").toString().toLowerCase();
        console.log(`Checking column ${column}: ${fieldValue} against search value ${searchValue}`);
        return fieldValue.includes(searchValue);
      });
      console.log(`Asset ${asset.sr_no} matches search: ${matches}`);
      return matches;
    });

    console.log(`Filtered assets after search: ${filteredAssets.length}`);
    console.log("Calling renderAssets with filteredAssets");
    await renderAssets(filteredAssets);
    console.log("Exiting applySearchFilter");
  }

  // Set default value to "systems" and fetch data immediately
  console.log("Setting default table type to 'systems'");
  historyTableTypeFilter.value = "systems";
  console.log("Default table type set to: systems for Asset History Log");
  console.log("Calling fetchAssets with 'systems'");
  fetchAssets("systems");

  // Add change event listener for table type selection
  historyTableTypeFilter.addEventListener("change", async () => {
    const tableType = historyTableTypeFilter.value;
    console.log(`Table type changed to: ${tableType}`);
    historySearchInput.value = ""; // Reset search input on table type change
    console.log("Reset search input");
    assetChangeHistoryMap.clear(); // Clear the history map when changing table type
    console.log("Cleared assetChangeHistoryMap");
    console.log("Calling fetchAssets with new tableType");
    await fetchAssets(tableType);
    console.log("Finished handling table type change");
  });

  // Add input event listener for real-time search
  historySearchInput.addEventListener("input", () => {
    console.log("History search input changed");
    console.log("Calling applySearchFilter");
    applySearchFilter();
  });

  // Optional: Keep Enter key functionality as a fallback
  historySearchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      console.log("Enter key pressed in history search");
      console.log("Calling applySearchFilter");
      applySearchFilter();
    }
  });

  // Add reset button event listener
  historyResetSearchBtn.addEventListener("click", () => {
    console.log("History reset search button clicked");
    historySearchInput.value = "";
    console.log("Cleared search input");
    filteredAssets = [...historyAssets];
    console.log("Reset filteredAssets to historyAssets");
    console.log("Calling renderAssets with reset filteredAssets");
    renderAssets(filteredAssets);
  });

  console.log("Exiting showAssetHistory");
}

// Log to confirm showAssetHistory is defined
console.log("showAssetHistory defined:", typeof showAssetHistory === "function");

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
        const href = this.getAttribute("onclick").match(/'([^']+)'/)[1];
        if (dashboard) {
          console.log("Initiating fade-out transition for logout");
          dashboard.classList.remove("loaded");
          dashboard.classList.add("fade-out");
        }
        setTimeout(() => {
          console.log(`Navigating to ${href} for logout`);
          window.location.href = href;
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

    // Function to fetch and display columns for a given table type
    async function fetchColumnsForTableType(tableType) {
      const formButtonContainer = document.getElementById(
        "formButtonContainer"
      );
      if (!tableType) {
        console.log("No table type selected, clearing form");
        formContainer.innerHTML = "";
        formButtonContainer.style.display = "none";
        return;
      }

      try {
        console.log(`Fetching columns for ${tableType}`);
        const response = await fetch(
          `${BACKEND_URL}/fetchColumns/${tableType}`
        );
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to fetch columns: ${response.status} - ${errorText}`
          );
        }
        const { columns } = await response.json();
        console.log(`Columns fetched for ${tableType}:`, columns);

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
        displayColumns.forEach((column) => {
          const div = document.createElement("div");
          div.className = "form-group";

          const label = document.createElement("label");
          label.htmlFor = `${column}Input`;
          label.textContent = formatColumnName(column);

          let input;
          if (column === "invoice_file") {
            // Special handling for invoice_file field
            input = document.createElement("input");
            input.type = "file";
            input.id = `${column}Input`;
            input.name = column;
            input.accept = "application/pdf"; // Restrict to PDF files
            if (!nonRequiredFields.includes(column)) {
              input.required = true;
            }
          } else {
            input = document.createElement("input");
            input.type = column.includes("date") ? "date" : "text";
            input.id = `${column}Input`;
            input.name = column;
            if (["sr_no"].includes(column)) input.type = "number";
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

    // Set default value to "systems" and fetch columns immediately
    tableTypeFilter.value = "systems";
    console.log("Default table type set to: systems");
    fetchColumnsForTableType("systems"); // Fetch columns for "systems" on page load

    // Add change event listener for subsequent selections
    tableTypeFilter.addEventListener("change", async function () {
      const tableType = this.value;
      console.log(`Table type selected: ${tableType}`);
      await fetchColumnsForTableType(tableType);
    });

    // Form submission logic (updated to handle file upload)
    assetForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const tableType = tableTypeFilter.value;
      if (!tableType) {
        showErrorMessage("Please select an asset type.", messageContainer);
        return;
      }

      const formData = new FormData(this);
      formData.append("tableType", tableType); // Add tableType to FormData

      try {
        console.log("Submitting new asset with FormData");
        const response = await fetch(`${BACKEND_URL}/assets`, {
          method: "POST",
          body: formData, // Send FormData to handle file upload
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to add asset: ${response.status} - ${errorText}`
          );
        }

        const result = await response.json();
        console.log("Asset added successfully:", result);
        showSuccessMessage("Asset added successfully!", messageContainer);
        assetForm.reset();
        tableTypeFilter.value = "";
        formContainer.innerHTML = "";
      } catch (error) {
        console.error("Error adding asset:", error.message);
        showErrorMessage(
          "Failed to add asset. Please try again.",
          messageContainer
        );
      }
    });
  }

  // Existing logic for asset-tracking.html
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
    console.log(`Filter fields for ${tableType}:`, filterFields);

    filterFields.forEach((filter) => {
      const { field, label } = filter;

      const hasField = data.some(
        (item) => getColumnValue(item, field) !== undefined
      );
      if (!hasField) {
        console.log(
          `Field ${field} does not exist in data for ${tableType}, skipping filter`
        );
        return;
      }

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
        console.log(`${label} filter changed to: ${select.value}`);
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
      console.log("Reset Filters button clicked");
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
      console.log(
        "No applicable filters for this table type, hiding filter group"
      );
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
      console.log(`Filtering data with search term: ${searchInput}`);
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
          console.log(`Filtering data by ${field}: ${filterValue}`);
          filteredData = filteredData.filter(
            (item) => (getColumnValue(item, field) || "") === filterValue
          );
        }
      }
    });

    if (sortColumn) {
      console.log(
        `Sorting data by column ${sortColumn} in ${sortDirection} order`
      );
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
    } else {
      console.log("No sort column specified, preserving API order");
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
      console.log("No data to display in the table");
      tbody.innerHTML =
        '<tr><td colspan="100" class="empty-message">No data available</td></tr>';
      return;
    }

    const allColumns = Object.keys(data[0]);
    const visibleColumns =
      visibleColumnsMap[currentTableType.toLowerCase()] || allColumns;
    console.log(`Visible columns for ${currentTableType}:`, visibleColumns);

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
          td.textContent = item[column] || "";
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
      console.log("Adding event listener for Select All checkbox");
      selectAllCheckbox.addEventListener("change", function () {
        console.log("Select All checkbox changed, updating row checkboxes");
        rowCheckboxes.forEach((checkbox) => {
          checkbox.checked = this.checked;
        });
      });
    } else {
      console.error("Select All checkbox not found in the DOM");
    }

    console.log(`Found ${rowCheckboxes.length} row checkboxes`);
    rowCheckboxes.forEach((checkbox, index) => {
      checkbox.addEventListener("change", function () {
        console.log(`Row checkbox ${index + 1} changed`);
        const allChecked = Array.from(rowCheckboxes).every((cb) => cb.checked);
        const someChecked = Array.from(rowCheckboxes).some((cb) => cb.checked);
        selectAllCheckbox.checked = allChecked;
        selectAllCheckbox.indeterminate = someChecked && !allChecked;
      });
    });

    console.log(`Adding click event listeners to ${rows.length} table rows`);
    rows.forEach((row, index) => {
      row.addEventListener("click", function (e) {
        if (e.target.type === "checkbox") return;
        console.log(`Row ${index + 1} clicked, showing item details`);
        const itemData = JSON.parse(this.dataset.item);
        showItemDetails(itemData);
      });
    });

    const sortableHeaders = document.querySelectorAll(".sortable");
    console.log(`Found ${sortableHeaders.length} sortable headers`);
    sortableHeaders.forEach((header) => {
      header.addEventListener("click", () => {
        const column = header.dataset.sort;
        const sortIcon = header.querySelector(".sort-icon");
        console.log(`Sorting by column: ${column}`);

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
      console.log(`Fetching data for table type: ${tableType}`);
      const response = await fetch(
        `${BACKEND_URL}/fetchData/${tableType}`
      );
      if (!response.ok)
        throw new Error(`Network response was not ok: ${response.statusText}`);
      const data = await response.json();
      console.log(`Data fetched for ${tableType}:`, data);
      allAssets = data;

      populateFilters(data, tableType);

      const filteredData = applyFiltersAndSearch(data);
      renderTable(filteredData);

      console.log("Showing table, search bar, filters, and export button");
      const searchBar = document.querySelector(".search-bar");
      const filterGroup = document.querySelector(
        ".filter-group:not(:first-child)"
      );
      const downloadBtnContainer = document.querySelector(
        ".download-btn-container"
      );
      const tableWrapper = document.querySelector(".table-wrapper");

      if (searchBar) searchBar.classList.remove("hidden");
      else console.error("Search bar element not found");
      if (filterGroup) filterGroup.classList.remove("hidden");
      else console.error("Filter group not found");
      if (downloadBtnContainer) downloadBtnContainer.classList.remove("hidden");
      else console.error("Download button container not found");
      if (tableWrapper) tableWrapper.classList.remove("hidden");
      else console.error("Table wrapper not found");
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
      } else {
        console.error("Asset table body not found in the DOM");
      }
    }
  }

  const tableTypeFilterTracking = document.getElementById("tableTypeFilter");
  if (tableTypeFilterTracking) {
    console.log("Table type filter found, adding event listener");

    // Set the default value to "systems"
    tableTypeFilterTracking.value = "systems";
    currentTableType = "systems";
    console.log("Default table type set to: systems");
    // Fetch data for "systems" immediately on page load
    fetchData("systems");

    tableTypeFilterTracking.addEventListener("change", function () {
      currentTableType = this.value;
      console.log(`Table type selected: ${currentTableType}`);
      if (currentTableType) {
        fetchData(currentTableType);
      } else {
        console.log(
          "No table type selected, hiding table and related elements"
        );
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
  } else {
    console.error("Table type filter not found in the DOM");
  }

  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    console.log("Search input found, adding event listener");
    searchInput.addEventListener("input", () => {
      console.log("Search input changed, re-rendering table");
      const filteredData = applyFiltersAndSearch(allAssets);
      renderTable(filteredData);
    });
  } else {
    console.error("Search input not found in the DOM");
  }

  // Function to show item details in a modal (dynamically generate fields, excluding metadata)
  function showItemDetails(item) {
    console.log("Showing item details in modal:", item);
    const modal = document.getElementById("assetDetailModal");
    const modalContent = document.getElementById("assetDetailContent");

    // Fields to exclude from display
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

      const existingInputs = modalContent.querySelectorAll(".edit-input");
      existingInputs.forEach((input) => input.remove());
      const errorMessage = modalContent.querySelector(".error-message");
      if (errorMessage) errorMessage.style.display = "none";
      const successMessage = modalContent.querySelector(".success-message");
      if (successMessage) successMessage.style.display = "none";

      // Store the original values for comparison later
      const originalValues = { ...item };

      for (const [key, value] of Object.entries(item)) {
        if (!excludedFields.includes(key)) {
          // Skip excluded fields
          const formattedKey = formatColumnName(key);
          const p = document.createElement("p");

          if (key === "invoice_file" && value) {
            // Special handling for invoice_file: display a clickable link
            const link = document.createElement("a");
            link.href = `${BACKEND_URL}/${value}`; // e.g., /uploads/17436555411468-94322662-Creaa Designs_AMC.pdf
            link.textContent = "View Invoice";
            link.target = "_blank"; // Open in a new tab
            link.style.color = "#00ffcc"; // Optional: style the link
            link.style.textDecoration = "underline";
            p.innerHTML = `<strong>${formattedKey}:</strong> `;
            p.appendChild(link);
          } else {
            // Default handling for other fields
            p.innerHTML = `<strong>${formattedKey}:</strong> <span class="editable-field" data-field="${key}">${
              value || ""
            }</span>`;
          }
          modalContent.appendChild(p);
        }
      }

      modal.dataset.item = JSON.stringify(item);
      modal.style.display = "block";
      console.log("Modal displayed");

      const closeBtn = modal.querySelector(".close-btn");
      if (closeBtn) {
        // Remove existing listeners to prevent duplicates
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        newCloseBtn.addEventListener("click", () => {
          console.log("Close button clicked, hiding modal");
          modal.style.display = "none";
          const editBtn = document.getElementById("editAssetBtn");
          const saveBtn = document.getElementById("saveAssetBtn");
          if (editBtn && saveBtn) {
            editBtn.style.display = "inline-block";
            saveBtn.style.display = "none";
          }
        });
      }

      // Remove existing window click listener to prevent duplicates
      const existingWindowListener = (e) => {
        if (e.target === modal) {
          console.log("Clicked outside modal, hiding modal");
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
          console.log("Edit button clicked, making fields editable");
          const editableFields =
            modalContent.querySelectorAll(".editable-field");
          const primaryKeyFields = primaryKeyFieldsMap[currentTableType.toLowerCase()] || [];

          editableFields.forEach((field) => {
            const fieldName = field.dataset.field;
            if (!excludedFields.includes(fieldName) && !primaryKeyFields.includes(fieldName)) {
              const input = document.createElement("input");
              // Set input type based on field name
              input.type = fieldName.includes("date") || fieldName.includes("Date") ? "date" :
                           fieldName.includes("price") || fieldName.includes("cost") ? "number" :
                           "text";
              input.className = "edit-input";
              input.value = field.textContent;
              input.dataset.field = fieldName;
              field.style.display = "none";
              field.parentElement.appendChild(input);
            }
          });
          updatedEditBtn.style.display = "none";
          updatedSaveBtn.style.display = "inline-block";
        });

        updatedSaveBtn.addEventListener("click", async () => {
          console.log("Save button clicked, checking for updates");
          const updatedItem = JSON.parse(modal.dataset.item);
          const inputs = modalContent.querySelectorAll(".edit-input");
          const updates = {};
          let hasChanges = false;

          // Collect updates, but only include fields that have actually changed
          inputs.forEach((input) => {
            const fieldName = input.dataset.field;
            const newValue = input.value;
            const originalValue = (originalValues[fieldName] || "").toString();

            // Update the field display regardless of change
            const fieldSpan = modalContent.querySelector(
              `.editable-field[data-field="${fieldName}"]`
            );
            fieldSpan.textContent = newValue;
            fieldSpan.style.display = "inline";
            input.remove();

            // Only add to updates if the value has changed
            if (newValue !== originalValue) {
              updates[fieldName] = newValue;
              hasChanges = true;
              console.log(`Field ${fieldName} changed from "${originalValue}" to "${newValue}"`);
            } else {
              console.log(`Field ${fieldName} unchanged, skipping: "${originalValue}"`);
            }
          });

          if (!hasChanges) {
            console.log("No changes detected. Switching back to view mode without closing modal.");
            updatedEditBtn.style.display = "inline-block";
            updatedSaveBtn.style.display = "none";
            return;
          }

          // Proceed with update if there are changes
          Object.assign(updatedItem, updates);

          try {
            console.log("Sending update request with changed fields:", updates);
            const response = await fetch(
              `${BACKEND_URL}/assets/updateByKey`,
              {
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
                  updates: updates, // Only includes changed fields
                }),
              }
            );

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
              console.log("Local data updated");
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
      } else {
        console.error("Edit or Save button not found in the modal");
      }
    } else {
      console.error("Modal or modal content not found in the DOM");
    }
  }

  const exportExcelBtn = document.getElementById("export-excel-btn");
  if (exportExcelBtn) {
    console.log("Export Excel button found, adding event listener");
    exportExcelBtn.addEventListener("click", async function () {
      console.log("Export Excel button clicked");
      const selectedRows = getSelectedRows();
      if (selectedRows.length > 0) {
        try {
          const response = await fetch(`${BACKEND_URL}/export-excel`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ data: selectedRows }),
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
            response.headers.get("Content-Disposition")?.split("filename=")[1] ||
            "IT_Inventory_Management.xlsx";
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        } catch (error) {
          console.error("Error exporting to Excel:", error);
          const errorContainer = document.querySelector(".download-btn-container") || document.body;
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
        console.log("No rows selected for export");
        const errorContainer = document.querySelector(".download-btn-container") || document.body;
        showErrorMessage(
          "Please select at least one row to export.",
          errorContainer
        );
      }
    });
  } else {
    console.error("Export Excel button not found in the DOM");
  }

  function getSelectedRows() {
    console.log("Getting selected rows for export");
    const selectedRows = [];
    const rowCheckboxes = document.querySelectorAll(".row-checkbox:checked");

    rowCheckboxes.forEach((checkbox) => {
      const row = checkbox.closest("tr");
      const itemData = JSON.parse(row.dataset.item);
      selectedRows.push(itemData);
    });

    console.log(`Selected ${selectedRows.length} rows for export`);
    return selectedRows;
  }
});