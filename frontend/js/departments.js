const ENTITY_URL = `${API_URL}/departments`;

async function renderDepartments(isSearch = false) {
    const list = document.getElementById('data-list');
    list.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';

    try {
        const response = await fetch(ENTITY_URL);
        const departments = await response.json();
        
        let filtered = departments;
        const filterAttribute = document.getElementById('filter-attribute').value;
        const filterValue = document.getElementById('filter-input').value.toLowerCase();
        const filterOperator = document.getElementById('filter-operator').value;

        if (isSearch && filterValue) {
            filtered = departments.filter(d => {
                if (filterAttribute === 'all') {
                    // Search across all relevant string-convertible attributes
                    return String(d.dept_id).toLowerCase().includes(filterValue) ||
                           String(d.dept_name).toLowerCase().includes(filterValue);
                }

                const itemValue = d[filterAttribute];

                // Handle numeric filters
                if (filterAttribute === 'dept_id') {
                    const numericFilterValue = parseFloat(filterValue);
                    if (isNaN(numericFilterValue)) return false; // If filter value is not a number, no match
                    const numericItemValue = parseFloat(itemValue);
                    if (isNaN(numericItemValue)) return false; // If item value is not a number, no match

                    if (filterOperator === 'equals') return numericItemValue === numericFilterValue;
                    if (filterOperator === 'greater_than') return numericItemValue > numericFilterValue;
                    if (filterOperator === 'less_than') return numericItemValue < numericFilterValue;
                }
                // Search by specific attribute
                return String(d[filterAttribute] || '').toLowerCase().includes(filterValue);
            });
        }

        list.innerHTML = ''; // Clear loading
        if (filtered.length === 0) {
            list.innerHTML = `<tr><td colspan="3">${isSearch ? 'No results found.' : 'No departments found. Add one!'}</td></tr>`;
            return;
        }

        filtered.forEach(dept => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${dept.dept_id}</td>
                <td>${dept.dept_name}</td>
                <td class="actions">
                    <button class="btn btn-edit" onclick="openFormForEdit(${dept.dept_id}, '${dept.dept_name}')"><i class="fa-solid fa-pencil"></i></button>
                    <button class="btn btn-danger" onclick="deleteItem(${dept.dept_id})"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            list.appendChild(tr);
        });
    } catch (error) {
        console.error('Failed to fetch departments:', error);
        list.innerHTML = '<tr><td colspan="3">Error loading data. Is the backend running?</td></tr>';
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const id = document.getElementById('dept-id').value;
    const data = { dept_name: document.getElementById('dept-name').value };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${ENTITY_URL}/${id}` : ENTITY_URL;

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`Failed to ${id ? 'update' : 'create'} department`);
        
        closeModal();
        renderDepartments();
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

function openFormForAdd() {
    document.getElementById('data-form').reset();
    document.getElementById('dept-id').value = '';
    document.getElementById('modal-title').textContent = 'Add New Department';
    openModal();
}

function openFormForEdit(id, name) {
    document.getElementById('data-form').reset();
    document.getElementById('dept-id').value = id;
    document.getElementById('dept-name').value = name;
    document.getElementById('modal-title').textContent = 'Edit Department';
    openModal();
}

async function deleteItem(id) {
    if (confirm('Are you sure you want to delete this department? This could affect courses and instructors.')) {
        try {
            const response = await fetch(`${ENTITY_URL}/${id}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to delete department');
            
            renderDepartments();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    }
}