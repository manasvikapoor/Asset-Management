console.log("laptop-checklist.js loaded successfully");

const BACKEND_URL = "http://localhost:3000"; // Update if your server runs on a different port

// Cookie helper functions
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Strict";
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

// Function for deep comparison of two objects
function deepEqual(obj1, obj2) {
    if (obj1 === obj2) return true;
    if (typeof obj1 !== "object" || typeof obj2 !== "object" || obj1 === null || obj2 === null) return false;

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
        if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) return false;
    }
    return true;
}

// Function to display messages (success, error, or neutral) in the UI
function showMessage(message, container, type = "success") {
    console.log("Attempting to show message:", message);

    // Remove any existing message elements and overlays to avoid overlap
    const existingMessages = document.querySelectorAll(".message");
    const existingOverlays = document.querySelectorAll(".message-overlay");
    existingMessages.forEach(msg => msg.remove());
    existingOverlays.forEach(overlay => overlay.remove());
    console.log("Removed existing messages:", existingMessages.length);
    console.log("Removed existing overlays:", existingOverlays.length);

    // Create the overlay
    const overlay = document.createElement("div");
    overlay.classList.add("message-overlay");

    // Create the message element
    const messageElement = document.createElement("div");
    messageElement.classList.add("message");
    messageElement.classList.add(`message--${type}`);
    messageElement.textContent = message;

    // Append the overlay and message to the body
    document.body.appendChild(overlay);
    document.body.appendChild(messageElement);
    console.log("Overlay element after appending:", overlay);
    console.log("Message element after appending:", messageElement);

    // Remove the message and overlay after 2.1 seconds to match the 2-second animation duration
    setTimeout(() => {
        messageElement.remove();
        overlay.remove();
        console.log("Message and overlay removed after 2.1 seconds");
    }, 2100);
}

// Function to sync checklist fields with issuing form data
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

// Function to prepare the page for printing and restore it afterward
function printContent() {
    // Validate systemName field
    const systemName = document.getElementById("systemName")?.value.trim();
    if (!systemName) {
        showMessage("System Name is mandatory. Please fill in this field.", document.querySelector(".checklist-container"), "error");
        alert("System Name is mandatory. Please fill in this field.");
        return;
    }

    // Ensure both forms are visible
    const issuingContainer = document.querySelector(".issuing-container");
    const checklistContainer = document.querySelector(".checklist-container");
    issuingContainer.classList.add("active");
    checklistContainer.classList.add("active");
    checklistContainer.style.display = "block";

    // Sync checklist fields to ensure data is populated
    syncChecklistFields();

    // Format the current date and time
    const now = new Date();
    const month = (now.getMonth() + 1).toString(); // Month is 0-based, so add 1
    const day = now.getDate().toString();
    const year = now.getFullYear().toString().slice(-2); // Last two digits of the year
    const hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12; // Convert to 12-hour format
    const formattedDateTime = `${month}/${day}/${year} ${hours12}:${minutes} ${ampm}`;
    // Set the CSS custom property for the date and time
    document.documentElement.style.setProperty('--print-date-time', `"${formattedDateTime}"`);

    // Store original form elements to restore after printing
    const elementsToReplace = [];
    const inputs = document.querySelectorAll("input, textarea, select");
    inputs.forEach(input => {
        const parent = input.parentElement;
        const value = input.value || "";
        const textNode = document.createElement("span");
        textNode.textContent = value;
        textNode.className = "print-value"; // For styling if needed
        textNode.style.display = "inline-block";
        textNode.style.width = "100%";
        textNode.style.textAlign = input.tagName === "TEXTAREA" ? "left" : "center";
        elementsToReplace.push({ parent, input, textNode });
        parent.replaceChild(textNode, input);
    });

    // Temporarily disable responsive styles by adding a class to the body
    document.body.classList.add("disable-responsive");

    // Trigger print
    window.print();

    // Restore original elements and styles after printing
    elementsToReplace.forEach(({ parent, input, textNode }) => {
        parent.replaceChild(input, textNode);
    });
    document.body.classList.remove("disable-responsive");

    // Restore visibility of buttons (if needed)
    const buttonContainer = document.querySelector(".form-buttons");
    if (buttonContainer) {
        buttonContainer.style.display = "flex";
        document.getElementById("saveBtn").style.display = "inline-block";
        document.getElementById("printBtn").style.display = "inline-block";
        document.getElementById("backBtn").style.display = "inline-block";
    }
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
        const maxSrNo = records.length > 0 ? Math.max(...records.map(r => r.srNo)) : 0;
        srNoCounter = maxSrNo + 1;
    }
} catch (error) {
    console.error("Error loading records from localStorage:", error);
}

// Wait for DOM to be fully loaded
document.addEventListener("DOMContentLoaded", function () {
    console.log("DOMContentLoaded event fired for laptop-checklist.html");

    const issuingContainer = document.querySelector(".issuing-container");
    const checklistContainer = document.querySelector(".checklist-container");
    const nextBtn = document.getElementById("nextBtn");
    const submitBtn = document.getElementById("submitBtn");
    const issuingForm = document.getElementById("issuingForm");
    const checklistForm = document.getElementById("checklistForm");

    // Create Save, Print, and Back to List buttons dynamically with styling
    const saveBtn = document.createElement("button");
    saveBtn.id = "saveBtn";
    saveBtn.textContent = "Save";
    saveBtn.style.display = "none";
    saveBtn.className = "action-btn submit-btn";
    saveBtn.style.backgroundColor = "#4CAF50";
    saveBtn.style.color = "white";
    saveBtn.style.padding = "10px 20px";
    saveBtn.style.border = "none";
    saveBtn.style.borderRadius = "5px";
    saveBtn.style.fontSize = "16px";
    saveBtn.style.cursor = "pointer";
    saveBtn.style.margin = "0 10px";

    const printBtn = document.createElement("button");
    printBtn.id = "printBtn";
    printBtn.textContent = "Print";
    printBtn.style.display = "none";
    printBtn.className = "action-btn print-btn";
    printBtn.style.backgroundColor = "#008CBA";
    printBtn.style.color = "white";
    printBtn.style.padding = "10px 20px";
    printBtn.style.border = "none";
    printBtn.style.borderRadius = "5px";
    printBtn.style.fontSize = "16px";
    printBtn.style.cursor = "pointer";
    printBtn.style.margin = "0 10px";

    const backBtn = document.createElement("button");
    backBtn.id = "backBtn";
    backBtn.textContent = "Back to List";
    backBtn.style.display = "none";
    backBtn.className = "action-btn back-btn";
    backBtn.style.backgroundColor = "#f44336";
    backBtn.style.color = "white";
    backBtn.style.padding = "10px 20px";
    backBtn.style.border = "none";
    backBtn.style.borderRadius = "5px";
    backBtn.style.fontSize = "16px";
    backBtn.style.cursor = "pointer";
    backBtn.style.margin = "0 10px";
    backBtn.addEventListener("click", () => {
        if (window.opener) {
            console.log("Opener window detected, attempting to redirect opener to asset-tracking.html");
            try {
                window.opener.location.href = "asset-tracking.html";
                window.opener.focus();
            } catch (error) {
                console.error("Error redirecting opener window:", error);
                window.location.href = "asset-tracking.html";
            }
            console.log("Attempting to close the current window");
            window.close();
        } else {
            console.log("No opener window detected, redirecting current window to asset-tracking.html");
            window.location.href = "asset-tracking.html";
        }
    });

    // Append Save, Print, and Back to List buttons to the checklist form
    let buttonContainer = null;
    if (checklistForm) {
        buttonContainer = checklistForm.querySelector(".form-buttons") || document.createElement("div");
        buttonContainer.className = "form-buttons";
        buttonContainer.style.display = "none";
        buttonContainer.style.justifyContent = "center";
        buttonContainer.style.gap = "10px";
        buttonContainer.style.marginTop = "20px";
        buttonContainer.appendChild(saveBtn);
        buttonContainer.appendChild(printBtn);
        buttonContainer.appendChild(backBtn);
        checklistForm.appendChild(buttonContainer);
    }

    // Format and set current date for "Issued By / Date" field
    const currentDate = new Date();
    const day = currentDate.getDate();
    const month = currentDate.toLocaleString("default", { month: "short" }).toUpperCase();
    const year = currentDate.getFullYear();
    const formattedDate = `${day}-${month}-${year}`;
    const currentDateElement = document.getElementById("currentDate");
    if (currentDateElement) {
        currentDateElement.textContent = formattedDate;
    }

    if (issuingForm && checklistForm && nextBtn && submitBtn && issuingContainer && checklistContainer) {
        console.log("System allocation elements found, initializing");

        // Make specified fields editable, others read-only
        const editableFields = ["username", "deptName", "dateOfIssue", "accessories"];
        const allInputs = issuingForm.querySelectorAll("input");
        allInputs.forEach(input => {
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

            const record = records.find(r => r.srNo === srNoNum);
            if (record) {
                console.log("Record found for printing:", record);
                document.getElementById("username").value = record.username || "";
                document.getElementById("deptName").value = record.deptName || "";
                document.getElementById("dateOfIssue").value = record.dateOfIssue || "";
                document.getElementById("laptop").value = record.laptop || "";
                document.getElementById("serialNo").value = record.serialNo || "";
                document.getElementById("configuration").value = record.configuration || "";
                document.getElementById("accessories").value = record.accessories || "";
                document.getElementById("assetTag").value = record.assetTag || "";
                document.getElementById("issuedPerson").value = record.issuedPerson || "";

                document.getElementById("systemName").value = record.checklist.systemName || "";
                for (let i = 1; i <= 32; i++) {
                    const statusElement = document.querySelector(`select[name="status${i}"]`);
                    if (statusElement) {
                        statusElement.value = record.checklist.statuses[`status${i}`] || "N/A";
                    }
                }
                syncChecklistFields();

                // Show both forms for printing
                issuingContainer.classList.add("active");
                checklistContainer.classList.add("active");
                checklistContainer.style.display = "block";
                nextBtn.style.display = "none";
                submitBtn.style.display = "none";
                saveBtn.style.display = "none";
                printBtn.style.display = "none";
                backBtn.style.display = "none";
                if (buttonContainer) buttonContainer.style.display = "none";

                // Use the new print function
                setTimeout(() => {
                    printContent();
                    // Restore visibility after printing
                    checklistContainer.style.display = "none";
                    nextBtn.style.display = "block";
                    submitBtn.style.display = "none";
                    saveBtn.style.display = "none";
                    printBtn.style.display = "none";
                    backBtn.style.display = "none";
                    if (buttonContainer) buttonContainer.style.display = "none";
                }, 500);

                isPrinting = true;
            } else {
                console.error(`No record found for srNo: ${srNoNum} in records array:`, records);
            }

            localStorage.removeItem("printSystemAllocationSrNo");
            console.log("Cleared printSystemAllocationSrNo from localStorage");
        } else if (storedItem) {
            try {
                const item = JSON.parse(storedItem);
                console.log("Retrieved item from localStorage for form generation:", item);

                srNo = item.sr_no || null;
                machineAssetTag = item.machine_asset_tag || null;
                monitorAssetTag = item.monitor_asset_tag || null;

                document.getElementById("username").value = item.user_name || "";
                document.getElementById("deptName").value = item.department || "";
                document.getElementById("dateOfIssue").value = item.date_of_issue || "";
                document.getElementById("laptop").value = `${item.make || ""} ${item.model || ""}`.trim();
                document.getElementById("serialNo").value = item.serial_number || "";
                document.getElementById("configuration").value = `${item.processor || ""} ${item.ram || ""} ${item.hard_disk || ""}`.trim();
                document.getElementById("accessories").value = item.accessories || "";
                document.getElementById("assetTag").value = item.machine_asset_tag || "";
                document.getElementById("issuedPerson").value = item.issued_by || "";

                document.getElementById("systemName").value = item.system_name || "";
                syncChecklistFields();

                issuingContainer.classList.add("active");
                checklistContainer.classList.remove("active");
                checklistContainer.style.display = "none";
                nextBtn.style.display = "block";
                submitBtn.style.display = "none";
                saveBtn.style.display = "none";
                printBtn.style.display = "none";
                backBtn.style.display = "none";
                if (buttonContainer) buttonContainer.style.display = "none";

                localStorage.removeItem("systemAllocationItem");
                console.log("Cleared systemAllocationItem from localStorage");
            } catch (error) {
                console.error("Error retrieving or parsing item from localStorage:", error);
                issuingContainer.classList.add("active");
                checklistContainer.classList.remove("active");
                checklistContainer.style.display = "none";
                nextBtn.style.display = "block";
                submitBtn.style.display = "none";
                saveBtn.style.display = "none";
                printBtn.style.display = "none";
                backBtn.style.display = "none";
                if (buttonContainer) buttonContainer.style.display = "none";
            }
        } else {
            console.warn("No system allocation item or print request found in localStorage, showing empty form.");
            issuingContainer.classList.add("active");
            checklistContainer.classList.remove("active");
            checklistContainer.style.display = "none";
            nextBtn.style.display = "block";
            submitBtn.style.display = "none";
            saveBtn.style.display = "none";
            printBtn.style.display = "none";
            backBtn.style.display = "none";
            if (buttonContainer) buttonContainer.style.display = "none";
        }

        // Add asterisk to systemName label to indicate it's mandatory
        const systemNameLabel = checklistForm.querySelector('label[for="systemName"]');
        if (systemNameLabel) {
            systemNameLabel.innerHTML = 'System Name <span style="color: red;">*</span>';
        }
        const systemNameInput = document.getElementById("systemName");
        if (systemNameInput) {
            systemNameInput.setAttribute("required", "true");
        }

        // Next button handler
        nextBtn.addEventListener("click", function () {
            if (issuingForm.checkValidity()) {
                syncChecklistFields();
                issuingContainer.classList.add("active");
                checklistContainer.classList.add("active");
                checklistContainer.style.display = "block";
                nextBtn.style.display = "none";
                submitBtn.style.display = "none";
                if (buttonContainer) {
                    buttonContainer.style.display = "flex";
                    saveBtn.style.display = "inline-block";
                    printBtn.style.display = "inline-block";
                    backBtn.style.display = "inline-block";
                }
            } else {
                issuingForm.reportValidity();
            }
        });

        // Save button handler
        saveBtn.addEventListener("click", async function (e) {
            e.preventDefault();

            const systemName = document.getElementById("systemName")?.value.trim();
            if (!systemName) {
                showMessage("System Name is mandatory. Please fill in this field.", checklistContainer, "error");
                alert("System Name is mandatory. Please fill in this field.");
                return;
            }

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
                const statusElement = document.querySelector(`select[name="status${i}"]`);
                checklistData.statuses[`status${i}`] = statusElement ? statusElement.value : "N/A";
            }

            const combinedData = { ...issuingData, checklist: checklistData };

            const recordIndex = records.findIndex(r => r.srNo === combinedData.srNo);
            let hasChanges = true;
            if (recordIndex !== -1) {
                hasChanges = !deepEqual(records[recordIndex], combinedData);
                if (!hasChanges) {
                    showMessage("No changes detected, saving the form as it is", checklistContainer, "neutral");
                }
            }

            if (recordIndex !== -1) {
                records[recordIndex] = combinedData;
                console.log("Record updated:", records[recordIndex]);
            } else {
                records.push(combinedData);
                console.log("Record added:", combinedData);
            }
            console.log("Current records array:", records);

            try {
                localStorage.setItem("systemAllocationRecords", JSON.stringify(records));
                console.log("Updated records in localStorage:", records);
            } catch (error) {
                console.error("Error saving records to localStorage:", error);
                showMessage("Error saving to localStorage", checklistContainer, "error");
            }

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
                        throw new Error(`Failed to update asset: ${response.status} - ${errorText}`);
                    }

                    console.log("Asset updated successfully in the database!");
                    showMessage("Data updated successfully", checklistContainer);
                } catch (error) {
                    console.error("Error updating asset in database:", error);
                    showMessage("Error updating data", checklistContainer, "error");
                }
            } else if (hasChanges) {
                showMessage("Data saved successfully", checklistContainer);
            }

            syncChecklistFields();
            issuingContainer.classList.add("active");
            checklistContainer.classList.add("active");
            checklistContainer.style.display = "block";
            nextBtn.style.display = "none";
            submitBtn.style.display = "none";
            if (buttonContainer) {
                buttonContainer.style.display = "flex";
                saveBtn.style.display = "inline-block";
                printBtn.style.display = "inline-block";
                backBtn.style.display = "inline-block";
            }
        });

        // Print button handler
        printBtn.addEventListener("click", function (e) {
            e.preventDefault();
            printContent();
        });

        submitBtn.style.display = "none";
    }
});