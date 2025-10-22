const ENTITY_URL = `${API_URL}/instructors`;

async function renderInstructors(isSearch = false) {
    const list = document.getElementById('data-list');
    // Adjusted colspan from 8 to 6 (ID, Name, Email, Phone, Specialization, Actions)
    list.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';

    try {
        const response = await fetch(ENTITY_URL);
        const instructors = await response.json();
        
        let filtered = instructors;
        const filterAttribute = document.getElementById('filter-attribute').value;
        const filterValue = document.getElementById('filter-input').value.toLowerCase();
        const filterOperator = document.getElementById('filter-operator').value;

        if (isSearch && filterValue) {
            filtered = instructors.filter(i => {
                if (filterAttribute === 'all') {
                    // Search across all relevant string-convertible attributes
                    return String(i.instructor_id).toLowerCase().includes(filterValue) ||
                           String(i.instructor_name).toLowerCase().includes(filterValue) ||
                           String(i.email).toLowerCase().includes(filterValue) ||
                           String(i.phone || '').toLowerCase().includes(filterValue) ||
                           String(i.specialization || '').toLowerCase().includes(filterValue);
                }

                const itemValue = i[filterAttribute];

                // Handle numeric filters
                // Only instructor_id is numeric now
                if (filterAttribute === 'instructor_id') {
                    const numericFilterValue = parseFloat(filterValue);
                    if (isNaN(numericFilterValue)) return false; // If filter value is not a number, no match
                    const numericItemValue = parseFloat(itemValue);
                    if (isNaN(numericItemValue)) return false; // If item value is not a number, no match

                    if (filterOperator === 'equals') return numericItemValue === numericFilterValue;
                    if (filterOperator === 'greater_than') return numericItemValue > numericFilterValue;
                    if (filterOperator === 'less_than') return numericItemValue < numericFilterValue;
                }
                // Handle string filters (default behavior)
                return String(itemValue || '').toLowerCase().includes(filterValue);
            });
        }

        list.innerHTML = '';
        if (filtered.length === 0) {
            list.innerHTML = `<tr><td colspan="6">${isSearch ? 'No results found.' : 'No instructors found. Add one!'}</td></tr>`;
            return;
        }

        filtered.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.instructor_id}</td>
                <td>${item.instructor_name}</td>
                <td>${item.email}</td>
                <td>${item.phone || 'N/A'}</td>
                <td>${item.specialization || 'N/A'}</td>
                <td class="actions">
                    <button class="btn btn-edit" onclick='openFormForEdit(${JSON.stringify(item)})'><i class="fa-solid fa-pencil"></i></button>
                    <button class="btn btn-danger" onclick="deleteItem(${item.instructor_id})"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            list.appendChild(tr);
        });
    } catch (error) {
        console.error('Failed to fetch instructors:', error);
        list.innerHTML = '<tr><td colspan="6">Error loading data. Is the backend running?</td></tr>';
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('instructor-id').value;
    const data = {
        instructor_name: document.getElementById('instructor-name').value,
        email: document.getElementById('instructor-email').value,
        phone: document.getElementById('instructor-phone').value,
        specialization: document.getElementById('instructor-specialization').value
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${ENTITY_URL}/${id}` : ENTITY_URL;

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to save instructor');
        
        closeModal();
        renderInstructors();
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

function openFormForAdd() {
    document.getElementById('data-form').reset();
    document.getElementById('instructor-id').value = '';
    document.getElementById('modal-title').textContent = 'Add New Instructor';
    openModal();
}

function openFormForEdit(item) {
    document.getElementById('data-form').reset();
    document.getElementById('instructor-id').value = item.instructor_id;
    document.getElementById('instructor-name').value = item.instructor_name;
    document.getElementById('instructor-email').value = item.email;
    document.getElementById('instructor-phone').value = item.phone;
    document.getElementById('instructor-specialization').value = item.specialization || ''; // Ensure it's not null
    document.getElementById('modal-title').textContent = 'Edit Instructor';
    openModal();
}

async function deleteItem(id) {
    if (confirm('Are you sure you want to delete this instructor? This could affect courses and hostels.')) {
        try {
            const response = await fetch(`${ENTITY_URL}/${id}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to delete instructor');
            
            renderInstructors();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    }
}