
// dashboard.js
const video = document.getElementById('background-video');
const assetForm = document.querySelector('.asset-form');
const assetTableBody = document.getElementById('asset-table-body');

// Ensure the video plays on page load
window.addEventListener('load', () => {
    if (video) {
        video.play().catch(error => {
            console.log("Autoplay blocked by browser:", error);
        });
    }
});

// Load assets from localStorage
function loadAssets() {
    return JSON.parse(localStorage.getItem('assets')) || [];
}

// Save assets to localStorage
function saveAssets(assets) {
    localStorage.setItem('assets', JSON.stringify(assets));
}

// Generate a unique ID for assets
function generateId() {
    return 'asset-' + Math.random().toString(36).substr(2, 9);
}

// Handle asset form submission
if (assetForm) {
    assetForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(assetForm);
        const data = Object.fromEntries(formData);
        
        // Add metadata
        const now = new Date().toISOString();
        data.id = generateId();
        data.createdAt = now;
        data.lastUpdated = now;
        
        // Load existing assets, add new one, and save
        const assets = loadAssets();
        assets.push(data);
        saveAssets(assets);
        
        alert('Asset added successfully!');
        assetForm.reset();
        updateAssetList();
    });
}

// Update asset status
function updateAssetStatus(assetId, newStatus) {
    const assets = loadAssets();
    const assetIndex = assets.findIndex(asset => asset.id === assetId);
    if (assetIndex !== -1) {
        assets[assetIndex].status = newStatus;
        assets[assetIndex].lastUpdated = new Date().toISOString();
        saveAssets(assets);
        updateAssetList();
    }
}

// Delete an asset
function deleteAsset(assetId) {
    if (confirm('Are you sure you want to delete this asset?')) {
        const assets = loadAssets();
        const updatedAssets = assets.filter(asset => asset.id !== assetId);
        saveAssets(updatedAssets);
        updateAssetList();
    }
}

// Update the updateAssetList function in dashboard.js
function updateAssetList() {
    const assets = loadAssets();
    assetTableBody.innerHTML = '';

    if (assets.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="7" class="empty-message">No assets found. Add a new asset to get started!</td>';
        assetTableBody.appendChild(row);
        return;
    }

    assets.forEach(asset => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${asset.assetName}</td>
            <td>${asset.assetType}</td>
            <td>${asset.serialNumber}</td>
            <td>${asset.assignedUser || 'Unassigned'}</td>
            <td>
                <span class="status-badge ${asset.status}">${asset.status.replace('-', ' ')}</span>
                <select onchange="updateAssetStatus('${asset.id}', this.value)" style="margin-left: 10px;">
                    <option value="in-use" ${asset.status === 'in-use' ? 'selected' : ''}>In Use</option>
                    <option value="in-storage" ${asset.status === 'in-storage' ? 'selected' : ''}>In Storage</option>
                    <option value="under-repair" ${asset.status === 'under-repair' ? 'selected' : ''}>Under Repair</option>
                    <option value="retired" ${asset.status === 'retired' ? 'selected' : ''}>Retired</option>
                </select>
            </td>
            <td>${new Date(asset.lastUpdated).toLocaleString()}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit" onclick="editAsset('${asset.id}')" data-tooltip="Edit Asset">Edit</button>
                    <button class="action-btn delete" onclick="deleteAsset('${asset.id}')" data-tooltip="Delete Asset">Delete</button>
                </div>
            </td>
        `;
        assetTableBody.appendChild(row);
    });
}

// Placeholder for editAsset function (you can implement this later)
function editAsset(assetId) {
    alert(`Editing asset with ID: ${assetId}. This is a placeholder function.`);
    // You can implement a modal or form to edit the asset details here
}
// Initial load
document.addEventListener('DOMContentLoaded', updateAssetList);