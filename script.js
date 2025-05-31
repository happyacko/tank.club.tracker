let allUnits = [];
let filteredUnits = [];
let selectedUnits = []; // This will now store copies with editable stats
let totalPoints = 0;

const unitListElement = document.getElementById('unitList');
const selectedUnitsElement = document.getElementById('selectedUnits');
const totalPointsElement = document.getElementById('totalPoints');
const pointLimitInput = document.getElementById('pointLimit');
const nationFilterSelect = document.getElementById('nationFilter');

// Function to toggle dark mode
function toggleDarkMode() {
    document.documentElement.classList.toggle("dark");
}

// Function to parse CSV data
async function fetchAndParseCSV(url) {
    const response = await fetch(url);
    const text = await response.text();
    const lines = text.split('\n').filter(line => line.trim() !== ''); // Filter out empty lines
    const headers = lines[0].split(',').map(header => header.trim());
    const data = lines.slice(1).map(line => {
        const values = line.split(',').map(value => value.trim());
        let unit = {};
        headers.forEach((header, i) => {
            // Convert numeric values to numbers
            if (['Points', 'Move', 'Aim', 'Shoot', 'Speed', 'Front', 'Side', 'Rear'].includes(header)) {
                unit[header] = parseFloat(values[i]) || 0; // Use parseFloat for potential decimals, default to 0
            } else {
                unit[header] = values[i];
            }
        });
        // Add a unique ID for each unit instance for easier tracking
        // This ID will be unique PER INSTANCE added to the army
        unit.InstanceID = 'unit-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        return unit;
    });
    return data;
}

// Function to render a single unit card for available units
function renderUnitCard(unit) {
    const li = document.createElement('li');
    li.className = 'p-4 border rounded shadow-md bg-gray-50 dark:bg-gray-700'; // Tailwind classes
    li.innerHTML = `
        <h3 class="text-lg font-bold">${unit.Name}</h3>
        <p><strong>Nation:</strong> ${unit.Nation}</p>
        <p><strong>Points:</strong> ${unit.Points} pts</p>
        <p><strong>Move:</strong> ${unit.Move}, <strong>Aim:</strong> ${unit.Aim}, <strong>Shoot:</strong> ${unit.Shoot}, <strong>Speed:</strong> ${unit.Speed}</p>
        <p><strong>Armour — Front:</strong> ${unit.Front}, <strong>Side:</strong> ${unit.Side}, <strong>Rear:</strong> ${unit.Rear}</p>
        <p><strong>Special:</strong> ${unit.Special}</p>
        <button onclick="addToArmy('${unit.InstanceID}')" class="add-button mt-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded">➕ Add</button>
    `;
    return li;
}

// Function to render a single unit card for selected units (in Your Army section)
// Now includes editable stats and a custom name field
function renderSelectedUnitCard(unit) {
    const li = document.createElement('li');
    li.id = `selected-unit-${unit.InstanceID}`; // Use InstanceID for unique element ID
    li.className = 'p-4 border rounded shadow-md bg-gray-50 dark:bg-gray-700 flex flex-col space-y-2'; // Tailwind classes
    li.innerHTML = `
        <div class="flex justify-between items-center">
            <h3 class="text-lg font-bold">${unit.Name}</h3>
            <button onclick="removeFromArmy('${unit.InstanceID}')" class="remove-button bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded">➖ Remove</button>
        </div>
        <p><strong>Points:</strong> ${unit.Points} pts</p>

        <label class="block">Custom Name:
            <input type="text" value="${unit.CustomName || ''}" onchange="updateUnitStat('${unit.InstanceID}', 'CustomName', this.value)"
                   class="w-full p-1 border rounded dark:text-black">
        </label>

        <div class="grid grid-cols-2 gap-2 text-sm">
            <div>
                <label>Move: <input type="number" value="${unit.CurrentMove || unit.Move}" onchange="updateUnitStat('${unit.InstanceID}', 'CurrentMove', this.value)" class="w-16 p-1 border rounded dark:text-black"></label>
            </div>
            <div>
                <label>Aim: <input type="number" value="${unit.CurrentAim || unit.Aim}" onchange="updateUnitStat('${unit.InstanceID}', 'CurrentAim', this.value)" class="w-16 p-1 border rounded dark:text-black"></label>
            </div>
            <div>
                <label>Shoot: <input type="number" value="${unit.CurrentShoot || unit.Shoot}" onchange="updateUnitStat('${unit.InstanceID}', 'CurrentShoot', this.value)" class="w-16 p-1 border rounded dark:text-black"></label>
            </div>
            <div>
                <label>Speed: <input type="number" value="${unit.CurrentSpeed || unit.Speed}" onchange="updateUnitStat('${unit.InstanceID}', 'CurrentSpeed', this.value)" class="w-16 p-1 border rounded dark:text-black"></label>
            </div>
            <div>
                <label>Front Armor: <input type="number" value="${unit.CurrentFront || unit.Front}" onchange="updateUnitStat('${unit.InstanceID}', 'CurrentFront', this.value)" class="w-16 p-1 border rounded dark:text-black"></label>
            </div>
            <div>
                <label>Side Armor: <input type="number" value="${unit.CurrentSide || unit.Side}" onchange="updateUnitStat('${unit.InstanceID}', 'CurrentSide', this.value)" class="w-16 p-1 border rounded dark:text-black"></label>
            </div>
            <div>
                <label>Rear Armor: <input type="number" value="${unit.CurrentRear || unit.Rear}" onchange="updateUnitStat('${unit.InstanceID}', 'CurrentRear', this.value)" class="w-16 p-1 border rounded dark:text-black"></label>
            </div>
            <div>
                <label>Custom Text: <input type="text" value="${unit.CurrentSpecial || ''}" onchange="updateUnitStat('${unit.InstanceID}', 'CurrentSpecial', this.value)" class="w-24 p-1 border rounded dark:text-black"></label>
            </div>
        </div>
    `;
    return li;
}

// Function to display units
function displayUnits(units, targetElement, renderer) {
    targetElement.innerHTML = ''; // Clear previous units
    units.forEach(unit => {
        targetElement.appendChild(renderer(unit));
    });
}

// Function to populate nation filter
function populateNationFilter() {
    const nations = [...new Set(allUnits.map(unit => unit.Nation))].sort(); // Get unique nations and sort them
    nationFilterSelect.innerHTML = '<option value="">All</option>'; // Reset
    nations.forEach(nation => {
        const option = document.createElement('option');
        option.value = nation;
        option.textContent = nation;
        nationFilterSelect.appendChild(option);
    });
}

// Function to apply filters
function applyFilters() {
    const pointLimit = parseInt(pointLimitInput.value) || 0;
    const selectedNation = nationFilterSelect.value;

    filteredUnits = allUnits.filter(unit => {
        const meetsPointLimit = unit.Points <= pointLimit;
        const meetsNation = selectedNation === '' || unit.Nation === selectedNation;
        return meetsPointLimit && meetsNation;
    });
    displayUnits(filteredUnits, unitListElement, renderUnitCard);
}

// Function to update total points
function updateTotals() {
    totalPoints = selectedUnits.reduce((sum, unit) => sum + unit.Points, 0);
    totalPointsElement.textContent = totalPoints;
    displayUnits(selectedUnits, selectedUnitsElement, renderSelectedUnitCard);
}

// Function to initialize default current stats and custom name for new units
function initializeCurrentStats(unit) {
    unit.CurrentMove = unit.Move;
    unit.CurrentAim = unit.Aim;
    unit.CurrentShoot = unit.Shoot;
    unit.CurrentSpeed = unit.Speed;
    unit.CurrentFront = unit.Front;
    unit.CurrentSide = unit.Side;
    unit.CurrentRear = unit.Rear;
    unit.CurrentSpecial = unit.Special; // Initialize with original special rule
    unit.CustomName = ''; // Initialize custom name as empty string
    return unit;
}

// Add unit to army (Revised for InstanceID and editable stats)
function addToArmy(originalUnitID) {
    // Find the original unit template
    const unitTemplate = allUnits.find(u => u.InstanceID === originalUnitID);
    if (!unitTemplate) {
        console.error("Original unit not found:", originalUnitID);
        return;
    }

    // Create a deep copy for the selected unit to allow independent stat changes
    // Assign a new, unique InstanceID for *this specific instance* in the army
    const newUnitInstance = JSON.parse(JSON.stringify(unitTemplate));
    newUnitInstance.InstanceID = 'army-unit-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

    // Initialize current stats with their original values and an empty custom name
    initializeCurrentStats(newUnitInstance);

    if ((totalPoints + newUnitInstance.Points) <= (parseInt(pointLimitInput.value) || 0)) {
        selectedUnits.push(newUnitInstance);
        updateTotals();
    } else {
        alert(`Adding ${newUnitInstance.Name} would exceed the current point limit of ${pointLimitInput.value} pts.`);
    }
}


// Remove unit from army (uses InstanceID)
function removeFromArmy(unitInstanceID) {
    const index = selectedUnits.findIndex(unit => unit.InstanceID === unitInstanceID);
    if (index !== -1) {
        selectedUnits.splice(index, 1);
        updateTotals();
    }
}

// Update a specific stat or custom name for a specific unit instance
function updateUnitStat(unitInstanceID, statName, newValue) {
    const unit = selectedUnits.find(u => u.InstanceID === unitInstanceID);
    if (unit) {
        // Convert to number if it's a numeric stat, otherwise keep as string
        if (['CurrentMove', 'CurrentAim', 'CurrentShoot', 'CurrentSpeed', 'CurrentFront', 'CurrentSide', 'CurrentRear'].includes(statName)) {
            unit[statName] = parseFloat(newValue) || 0;
        } else {
            unit[statName] = newValue; // For CustomName and CurrentSpecial
        }
        // You might want to re-render just that unit's card or the whole list if many changes
        // For simplicity, we'll re-render the whole selected units list
        displayUnits(selectedUnits, selectedUnitsElement, renderSelectedUnitCard);
    }
}

// Save army to local storage
function saveArmy() {
    localStorage.setItem('tankClubArmy', JSON.stringify(selectedUnits));
    alert('Army saved successfully!');
}

// Load army from local storage
function loadArmy() {
    const savedArmy = localStorage.getItem('tankClubArmy');
    if (savedArmy) {
        selectedUnits = JSON.parse(savedArmy);
        // Ensure loaded units have all 'Current' stats and 'CustomName' initialized
        selectedUnits = selectedUnits.map(unit => {
            if (!unit.CurrentMove) { // Check for one of the new current stats
                return initializeCurrentStats(unit);
            }
            if (unit.CustomName === undefined) { // Initialize CustomName if it's missing from old saves
                unit.CustomName = '';
            }
            return unit;
        });
        updateTotals();
        alert('Army loaded successfully!');
    } else {
        alert('No saved army found.');
    }
}

// Download army as PDF
async function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let yOffset = 10;
    const lineHeight = 7;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 10;

    doc.setFontSize(20);
    doc.text('Tank Club Army List', 105, yOffset, null, null, 'center');
    yOffset += 15;

    doc.setFontSize(12);
    doc.text(`Total Points: ${totalPoints} pts`, 10, yOffset);
    yOffset += 10;

    if (selectedUnits.length === 0) {
        doc.text('No units in your army.', 10, yOffset);
    } else {
        selectedUnits.forEach((unit, index) => {
            if (yOffset + (lineHeight * 10) > pageHeight - margin) { // Adjusted for more lines per unit
                doc.addPage();
                yOffset = margin;
            }

            doc.setFontSize(14);
            // Display custom name if available, otherwise original name
            doc.text(`${unit.CustomName || unit.Name} (${unit.Points} pts)`, 10, yOffset);
            yOffset += lineHeight;
            doc.setFontSize(10);
            doc.text(`Original: ${unit.Name}`, 15, yOffset); // Show original name too
            yOffset += lineHeight;
            doc.text(`Nation: ${unit.Nation}`, 15, yOffset);
            yOffset += lineHeight;
            doc.text(`Original Move: ${unit.Move}, Aim: ${unit.Aim}, Shoot: ${unit.Shoot}, Speed: ${unit.Speed}`, 15, yOffset);
            yOffset += lineHeight;
            doc.text(`Original Armour — Front: ${unit.Front}, Side: ${unit.Side}, Rear: ${unit.Rear}`, 15, yOffset);
            yOffset += lineHeight;
            doc.text(`Original Special: ${unit.Special}`, 15, yOffset);
            yOffset += lineHeight;
            doc.text(`--- Current Stats ---`, 15, yOffset);
            yOffset += lineHeight;
            doc.text(`Move: ${unit.CurrentMove}, Aim: ${unit.CurrentAim}, Shoot: ${unit.CurrentShoot}, Speed: ${unit.CurrentSpeed}`, 15, yOffset);
            yOffset += lineHeight;
            doc.text(`Armour — Front: ${unit.CurrentFront}, Side: ${unit.CurrentSide}, Rear: ${unit.CurrentRear}`, 15, yOffset);
            yOffset += lineHeight;
            doc.text(`Special: ${unit.CurrentSpecial}`, 15, yOffset);
            yOffset += lineHeight * 2; // Add some space between units
        });
    }

    doc.save('tank_club_army_with_tracker.pdf');
}

// Initialize the application
async function initApp() {
    try {
        allUnits = await fetchAndParseCSV('units.csv.csv');
        // Give original units an InstanceID for consistent finding in `addToArmy`
        allUnits = allUnits.map(unit => {
            unit.InstanceID = 'original-' + Math.random().toString(36).substr(2, 9);
            return unit;
        });

        populateNationFilter();
        applyFilters(); // Initial display of units
        updateTotals(); // Initial update of total points (will be 0)
    } catch (error) {
        console.error('Error loading units:', error);
        unitListElement.innerHTML = '<p class="text-red-500">Error loading units. Please check console for details.</p>';
    }

    // Event listeners for filters
    pointLimitInput.addEventListener('input', applyFilters);
    nationFilterSelect.addEventListener('change', applyFilters);
}

// Check for dark mode preference on load
if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark');
}