const ENTITY_URL = `${API_URL}/hostels`;

async function populateWardenDropdown() {
    try {
        const response = await fetch(`${API_URL}/instructors`);
        const instructors = await response.json();
        const select = document.getElementById('hostel-warden');
        select.innerHTML = '<option value="" disabled selected>Select Warden</option>';
        instructors.forEach(i => {
            select.innerHTML += `<option value="${i.instructor_id}">${i.instructor_name}</option>`;
        });
    } catch (error) {
        console.error('Failed to populate warden dropdown:', error);
    }
}

async function renderHostels(isSearch = false) {
    const list = document.getElementById('data-list');
    list.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';

    try {
        const response = await fetch(ENTITY_URL);
        const hostels = await response.json();
        
        let filtered = hostels;
        const filterAttribute = document.getElementById('filter-attribute').value;
        const filterValue = document.getElementById('filter-input').value.toLowerCase();
        const filterOperator = document.getElementById('filter-operator').value;

        if (isSearch && filterValue) {
            filtered = hostels.filter(h => {
                if (filterAttribute === 'all') {
                    // Search across all relevant string-convertible attributes
                    return String(h.hostel_id).toLowerCase().includes(filterValue) ||
                           String(h.hostel_name).toLowerCase().includes(filterValue) ||
                           String(h.capacity).toLowerCase().includes(filterValue) ||
                           String(h.warden_name || '').toLowerCase().includes(filterValue);
                }

                const itemValue = h[filterAttribute];

                // Handle numeric filters
                if (filterAttribute === 'hostel_id' || filterAttribute === 'capacity') {
                    const numericFilterValue = parseFloat(filterValue);
                    if (isNaN(numericFilterValue)) return false; // If filter value is not a number, no match
                    const numericItemValue = parseFloat(itemValue);
                    if (isNaN(numericItemValue)) return false; // If item value is not a number, no match

                    if (filterOperator === 'equals') return numericItemValue === numericFilterValue;
                    if (filterOperator === 'greater_than') return numericItemValue > numericFilterValue;
                    if (filterOperator === 'less_than') return numericItemValue < numericFilterValue;
                }
                // Special handling for warden_name which might be null
                if (filterAttribute === 'warden_name') {
                    return String(itemValue || 'N/A').toLowerCase().includes(filterValue);
                }
                // Search by specific attribute
                return String(h[filterAttribute] || '').toLowerCase().includes(filterValue);
            });
        }

        list.innerHTML = '';
        if (filtered.length === 0) {
            list.innerHTML = `<tr><td colspan="5">${isSearch ? 'No results found.' : 'No hostels found. Add one!'}</td></tr>`;
            return;
        }

        filtered.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.hostel_id}</td>
                <td>${item.hostel_name}</td>
                <td>${item.capacity}</td>
                <td>${item.warden_name || 'N/A'}</td>
                <td class="actions">
                    <button class="btn btn-edit" onclick='openFormForEdit(${JSON.stringify(item)})'><i class="fa-solid fa-pencil"></i></button>
                    <button class="btn btn-danger" onclick="deleteItem(${item.hostel_id})"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            list.appendChild(tr);
        });
    } catch (error) {
        console.error('Failed to fetch hostels:', error);
        list.innerHTML = '<tr><td colspan="5">Error loading data. Is the backend running?</td></tr>';
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('hostel-id').value;
    const data = {
        hostel_name: document.getElementById('hostel-name').value,
        capacity: parseInt(document.getElementById('hostel-capacity').value),
        warden_id: parseInt(document.getElementById('hostel-warden').value),
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${ENTITY_URL}/${id}` : ENTITY_URL;

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to save hostel');
        
        closeModal();
        renderHostels();
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

function openFormForAdd() {
    document.getElementById('data-form').reset();
    document.getElementById('hostel-id').value = '';
    document.getElementById('modal-title').textContent = 'Add New Hostel';
    openModal();
}

function openFormForEdit(item) {
    document.getElementById('data-form').reset();
    document.getElementById('hostel-id').value = item.hostel_id;
    document.getElementById('hostel-name').value = item.hostel_name;
    document.getElementById('hostel-capacity').value = item.capacity;
    document.getElementById('hostel-warden').value = item.warden_id;
    document.getElementById('modal-title').textContent = 'Edit Hostel';
    openModal();
}

async function deleteItem(id) {
    if (confirm('Are you sure you want to delete this hostel? This could affect students.')) {
        try {
            const response = await fetch(`${ENTITY_URL}/${id}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to delete hostel');
            
            renderHostels();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    }
}