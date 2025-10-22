const ENTITY_URL = `${API_URL}/courses`;

async function populateDropdowns() {
    try {
        const [instructorsRes, deptsRes] = await Promise.all([
            fetch(`${API_URL}/instructors`),
            fetch(`${API_URL}/departments`)
        ]);
        const instructors = await instructorsRes.json();
        const departments = await deptsRes.json();

        const instructorSelect = document.getElementById('course-instructor');
        const deptSelect = document.getElementById('course-dept');
        instructorSelect.innerHTML = '<option value="" disabled selected>Select Instructor</option>';
        deptSelect.innerHTML = '<option value="" disabled selected>Select Department</option>';
        instructors.forEach(i => instructorSelect.innerHTML += `<option value="${i.instructor_id}">${i.instructor_name}</option>`);
        departments.forEach(d => deptSelect.innerHTML += `<option value="${d.dept_id}">${d.dept_name}</option>`);
    } catch (error) {
        console.error('Failed to populate dropdowns:', error);
    }
}

async function renderCourses(isSearch = false) {
    const list = document.getElementById('data-list');
    list.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';

    try {
        const response = await fetch(ENTITY_URL);
        const courses = await response.json();
        
        let filtered = courses;
        const filterAttribute = document.getElementById('filter-attribute').value;
        const filterValue = document.getElementById('filter-input').value.toLowerCase();
        const filterOperator = document.getElementById('filter-operator').value;

        if (isSearch && filterValue) {
            filtered = courses.filter(c => {
                if (filterAttribute === 'all') {
                    // Search across all relevant string-convertible attributes
                    return Object.values(c).some(val => String(val || '').toLowerCase().includes(filterValue));
                }

                const itemValue = c[filterAttribute];

                // Handle numeric filters
                if (filterAttribute === 'course_id' || filterAttribute === 'credits') {
                    const numericFilterValue = parseFloat(filterValue);
                    if (isNaN(numericFilterValue)) return false;
                    const numericItemValue = parseFloat(itemValue);
                    if (isNaN(numericItemValue)) return false;

                    if (filterOperator === 'equals') return numericItemValue === numericFilterValue;
                    if (filterOperator === 'greater_than') return numericItemValue > numericFilterValue;
                    if (filterOperator === 'less_than') return numericItemValue < numericFilterValue;
                }

                // Search by specific attribute
                return String(c[filterAttribute] || '').toLowerCase().includes(filterValue);
            });
        }

        list.innerHTML = '';
        if (filtered.length === 0) {
            list.innerHTML = `<tr><td colspan="6">${isSearch ? 'No results found.' : 'No courses found. Add one!'}</td></tr>`;
            return;
        }

        filtered.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.course_id}</td>
                <td>${item.course_name}</td>
                <td>${item.dept_name || 'N/A'}</td>
                <td>${item.instructor_name || 'N/A'}</td>
                <td>${item.credits}</td>
                <td class="actions">
                    <button class="btn btn-edit" onclick='openFormForEdit(${JSON.stringify(item)})'><i class="fa-solid fa-pencil"></i></button>
                    <button class="btn btn-danger" onclick="deleteItem(${item.course_id})"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            list.appendChild(tr);
        });
    } catch (error) {
        console.error('Failed to fetch courses:', error);
        list.innerHTML = '<tr><td colspan="6">Error loading data. Is the backend running?</td></tr>';
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('course-id').value;
    const data = {
        course_name: document.getElementById('course-name').value,
        credits: parseInt(document.getElementById('course-credits').value),
        instructor_id: parseInt(document.getElementById('course-instructor').value),
        dept_id: parseInt(document.getElementById('course-dept').value),
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${ENTITY_URL}/${id}` : ENTITY_URL;

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`Failed to save course`);
        
        closeModal();
        renderCourses();
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

function openFormForAdd() {
    document.getElementById('data-form').reset();
    document.getElementById('course-id').value = '';
    document.getElementById('modal-title').textContent = 'Add New Course';
    openModal();
}

function openFormForEdit(item) {
    document.getElementById('data-form').reset();
    document.getElementById('course-id').value = item.course_id;
    document.getElementById('course-name').value = item.course_name;
    document.getElementById('course-credits').value = item.credits;
    document.getElementById('course-instructor').value = item.instructor_id;
    document.getElementById('course-dept').value = item.dept_id;
    document.getElementById('modal-title').textContent = 'Edit Course';
    openModal();
}

async function deleteItem(id) {
    if (confirm('Are you sure you want to delete this course? This could affect student enrollments.')) {
        try {
            const response = await fetch(`${ENTITY_URL}/${id}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to delete course');
            
            renderCourses();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    }
}