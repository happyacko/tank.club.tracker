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
function renderSelectedUnitCard(unit) {
    const li = document.createElement('li');
    li.id = `selected-unit-${unit.InstanceID}`;
    li.className = 'p-4 border rounded shadow-md bg-gray-50 dark:bg-gray-700 flex flex-col space-y-2';
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
    targetElement.innerHTML = '';
    units.forEach(unit => {
        targetElement.appendChild(renderer(unit));
    });
}

// Function to populate nation filter
function populateNationFilter() {
    const nations = [...new Set(allUnits.map(unit => unit.Nation))].sort();
    nationFilterSelect.innerHTML = '<option value="">All</option>';
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
    unit.CurrentSpecial = unit.Special;
    unit.CustomName = '';
    return unit;
}

// Add unit to army
function addToArmy(originalUnitID) {
    const unitTemplate = allUnits.find(u => u.InstanceID === originalUnitID);
    if (!unitTemplate) {
        console.error("Original unit not found:", originalUnitID);
        return;
    }

    const newUnitInstance = JSON.parse(JSON.stringify(unitTemplate));
    newUnitInstance.InstanceID = 'army-unit-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

    initializeCurrentStats(newUnitInstance);

    if ((totalPoints + newUnitInstance.Points) <= (parseInt(pointLimitInput.value) || 0)) {
        selectedUnits.push(newUnitInstance);
        updateTotals();
    } else {
        alert(`Adding ${newUnitInstance.Name} would exceed the current point limit of ${pointLimitInput.value} pts.`);
    }
}

// Remove unit from army
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
        if (['CurrentMove', 'CurrentAim', 'CurrentShoot', 'CurrentSpeed', 'CurrentFront', 'CurrentSide', 'CurrentRear'].includes(statName)) {
            unit[statName] = parseFloat(newValue) || 0;
        } else {
            unit[statName] = newValue;
        }
        displayUnits(selectedUnits, selectedUnitsElement, renderSelectedUnitCard);
    }
}

// Save army to local storage (used by both index.html and army.html)
function saveArmy() {
    localStorage.setItem('tankClubArmy', JSON.stringify(selectedUnits));
    alert('Army saved successfully!');
}

// NEW: Save army and redirect to army.html
function saveAndGoToArmyPage() {
    saveArmy(); // Save the current state of the army
    window.location.href = 'army.html'; // Redirect to the new page
}

// Load army from local storage (used by both index.html and army.html)
function loadArmy() {
    const savedArmy = localStorage.getItem('tankClubArmy');
    if (savedArmy) {
        selectedUnits = JSON.parse(savedArmy);
        selectedUnits = selectedUnits.map(unit => {
            if (!unit.CurrentMove) {
                return initializeCurrentStats(unit);
            }
            if (unit.CustomName === undefined) {
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

// Download army as PDF (Modified for sepia background and border)
async function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let yOffset = 10;
    const lineHeight = 7;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 10;
    const cardPadding = 5; // Padding inside the card border
    const cardWidth = 190; // Approx A4 width (210) - 2 * margin (20)
    const sepiaColor = '#704214'; // A sepia tone
    const borderColor = '#4A2B0F'; // Darker sepia for border
    const textColor = '#FFFFFF'; // White text for better contrast on sepia

    doc.setFontSize(20);
    doc.text('Tank Club Army List', 105, yOffset, null, null, 'center');
    yOffset += 15;

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0); // Reset text color for general info
    doc.text(`Total Points: ${totalPoints} pts`, 10, yOffset);
    yOffset += 10;

    if (selectedUnits.length === 0) {
        doc.text('No units in your army.', 10, yOffset);
    } else {
        selectedUnits.forEach((unit, index) => {
            const startY = yOffset; // Y position for the start of the current unit card

            // Calculate estimated height for the unit card (10 lines of text + padding)
            // Adjust based on your text content and font sizes
            const estimatedCardHeight = (lineHeight * 10) + (cardPadding * 2) + 5; // Extra 5 for buffer

            if (yOffset + estimatedCardHeight > pageHeight - margin) {
                doc.addPage();
                yOffset = margin; // Reset yOffset for new page
            }

            // Draw sepia background rectangle
            doc.setFillColor(sepiaColor);
            doc.rect(margin, yOffset, cardWidth, estimatedCardHeight, 'F'); // 'F' for fill

            // Draw border
            doc.setDrawColor(borderColor);
            doc.setLineWidth(1); // Border thickness
            doc.rect(margin, yOffset, cardWidth, estimatedCardHeight, 'S'); // 'S' for stroke (border)

            // Adjust yOffset for text inside the card
            yOffset += cardPadding;
            const textX = margin + cardPadding;

            doc.setTextColor(textColor); // Set text color to white for text inside sepia card
            doc.setFontSize(14);
            // Display custom name if available, otherwise original name
            doc.text(`${unit.CustomName || unit.Name} (${unit.Points} pts)`, textX, yOffset);
            yOffset += lineHeight;
            doc.setFontSize(10);
            doc.text(`Original: ${unit.Name}`, textX + 5, yOffset); // Indent slightly
            yOffset += lineHeight;
            doc.text(`Nation: ${unit.Nation}`, textX + 5, yOffset);
            yOffset += lineHeight;
            doc.text(`Original Move: ${unit.Move}, Aim: ${unit.Aim}, Shoot: ${unit.Shoot}, Speed: ${unit.Speed}`, textX + 5, yOffset);
            yOffset += lineHeight;
            doc.text(`Original Armour — Front: ${unit.Front}, Side: ${unit.Side}, Rear: ${unit.Rear}`, textX + 5, yOffset);
            yOffset += lineHeight;
            doc.text(`Original Special: ${unit.Special}`, textX + 5, yOffset);
            yOffset += lineHeight;
            doc.text(`--- Current Stats ---`, textX + 5, yOffset);
            yOffset += lineHeight;
            doc.text(`Move: ${unit.CurrentMove}, Aim: ${unit.CurrentAim}, Shoot: ${unit.CurrentShoot}, Speed: ${unit.CurrentSpeed}`, textX + 5, yOffset);
            yOffset += lineHeight;
            doc.text(`Armour — Front: ${unit.CurrentFront}, Side: ${unit.CurrentSide}, Rear: ${unit.CurrentRear}`, textX + 5, yOffset);
            yOffset += lineHeight;
            doc.text(`Special: ${unit.CurrentSpecial}`, textX + 5, yOffset);
            yOffset += lineHeight + cardPadding; // Space to end of current card, ready for next

            // Ensure next unit starts below the current card's bottom, with some spacing
            yOffset = startY + estimatedCardHeight + margin / 2; // Add half margin for spacing between cards
        });
    }

    doc.save('tank_club_army_display.pdf');
}

// Initialize the application (for index.html)
async function initApp() {
    try {
        // We only need to fetch units and populate filters on the main builder page
        allUnits = await fetchAndParseCSV('units.csv.csv');
        allUnits = allUnits.map(unit => {
            unit.InstanceID = 'original-' + Math.random().toString(36).substr(2, 9);
            return unit;
        });

        populateNationFilter();
        applyFilters();
        loadArmy(); // Load any previously saved army when the builder page loads
    } catch (error) {
        console.error('Error initializing builder app:', error);
        unitListElement.innerHTML = '<p class="text-red-500">Error loading units. Please check console for details.</p>';
    }
}

// Check for dark mode preference on load
if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark');
}

// Make functions globally accessible (for onclick attributes)
// Note: This is less ideal in complex apps, but fine for simple cases.
// Consider using event listeners in script.js for more robust solutions.
window.toggleDarkMode = toggleDarkMode;
window.addToArmy = addToArmy;
window.removeFromArmy = removeFromArmy;
window.updateUnitStat = updateUnitStat;
window.saveArmy = saveArmy; // Still accessible if needed directly
window.loadArmy = loadArmy;
window.downloadPDF = downloadPDF;
window.initApp = initApp;
window.saveAndGoToArmyPage = saveAndGoToArmyPage; // New function
