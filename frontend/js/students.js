const ENTITY_URL = `${API_URL}/students`;

async function populateHostelDropdown() {
    try {
        const response = await fetch(`${API_URL}/hostels`);
        const hostels = await response.json();
        const select = document.getElementById('student-hostel');
        select.innerHTML = '<option value="">Select Hostel</option>';
        hostels.filter(h => h.capacity > 0).forEach(h => select.innerHTML += `<option value="${h.hostel_id}">${h.hostel_name} (Capacity: ${h.capacity})</option>`);
    } catch (error) {
        console.error('Failed to populate hostel dropdown:', error);
    }
}

async function populateCourseDropdown() {
    try {
        const response = await fetch(`${API_URL}/courses`);
        const courses = await response.json();
        const select = document.getElementById('student-course');
        select.innerHTML = '<option value="">None</option>';
        courses.forEach(c => select.innerHTML += `<option value="${c.course_id}">${c.course_name}</option>`);
    } catch (error) {
        console.error('Failed to populate course dropdown:', error);
    }
}

async function renderStudents(isSearch = false) {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const list = document.getElementById('data-list');
    list.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';

    try {
        const response = await fetch(ENTITY_URL);
        const students = await response.json();

        let filtered = students;
        if (isSearch) {
            filtered = students.filter(s =>
                s.student_name.toLowerCase().includes(searchTerm) ||
                s.email.toLowerCase().includes(searchTerm) ||
                s.gender.toLowerCase().includes(searchTerm)
            );
        }

        list.innerHTML = '';
        if (filtered.length === 0) {
            list.innerHTML = `<tr><td colspan="6">${isSearch ? 'No results found.' : 'No students found. Add one!'}</td></tr>`;
            return;
        }

        filtered.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.student_id}</td>
                <td>${item.student_name}</td>
                <td>${item.email}</td>
                <td>${item.gender}</td>
                <td>${item.hostel_id || 'NIL'}</td>
                <td class="actions">
                    <button class="btn btn-edit" onclick='openFormForEdit(${JSON.stringify(item)})'><i class="fa-solid fa-pencil"></i></button>
                    <button class="btn btn-danger" onclick="deleteItem(${item.student_id})"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            list.appendChild(tr);
        });
    } catch (error) {
        console.error('Failed to fetch students:', error);
        list.innerHTML = '<tr><td colspan="6">Error loading data. Is the backend running?</td></tr>';
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('student-id').value;
    let data;

    if (id) {
        // Logic for UPDATING an existing student
        data = {
            student_name: document.getElementById('student-name').value,
            DOB: document.getElementById('student-dob').value,
            email: document.getElementById('student-email').value,
            gender: document.getElementById('student-gender').value,
            phone: document.getElementById('student-phone').value,
            hostel_id: document.getElementById('student-hostel').value || null
        };
    } else {
        // Logic for CREATING a new student
        data = {
            student_name: document.getElementById('student-name').value,
            DOB: document.getElementById('student-dob').value,
            email: document.getElementById('student-email').value,
            gender: document.getElementById('student-gender').value,
            phone: document.getElementById('student-phone').value,
            student_type: document.getElementById('student-type').value,
            course_id: document.getElementById('student-course').value || null,
            hostel_id: document.getElementById('student-type').value === 'Hosteler' 
                ? document.getElementById('student-hostel').value 
                : null
        };
    }

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${ENTITY_URL}/${id}` : ENTITY_URL;

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Failed to save student');
        }
        
        closeModal();
        // Instead of re-fetching, we can just re-render which is faster
        // and avoids race conditions. For a more advanced implementation,
        // you could even insert the new row directly without a full re-render.
        // But for simplicity and reliability, this is a great solution.
        renderStudents(); 

    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

function openFormForAdd() {
    document.getElementById('data-form').reset();
    document.getElementById('student-id').value = '';
    document.getElementById('modal-title').textContent = 'Add New Student';
    document.querySelector('label[for="student-type"]').style.display = 'block';
    document.getElementById('student-type').style.display = 'block';
    document.getElementById('hostel-selection-div').style.display = 'none'; // Hide by default
    document.getElementById('student-course-label').style.display = 'block';
    document.getElementById('student-course').style.display = 'block';
    openModal();
}

function openFormForEdit(item) {
    document.getElementById('data-form').reset();
    document.getElementById('student-id').value = item.student_id;
    document.getElementById('student-name').value = item.student_name;
    document.getElementById('student-dob').value = item.DOB;
    document.getElementById('student-email').value = item.email;
    document.getElementById('student-gender').value = item.gender;
    document.getElementById('student-phone').value = item.phone;
    document.getElementById('student-hostel').value = item.hostel_id || "";

    // Hide creation-only fields, show hostel edit
    document.querySelector('label[for="student-type"]').style.display = 'none';
    document.getElementById('student-type').style.display = 'none';
    document.getElementById('student-course-label').style.display = 'none';
    document.getElementById('student-course').style.display = 'none';
    document.getElementById('hostel-selection-div').style.display = 'block';
    document.getElementById('modal-title').textContent = 'Edit Student';
    openModal();
}

async function deleteItem(id) {
    if (confirm('Are you sure you want to delete this student? This will also remove their enrollments.')) {
        try {
            const response = await fetch(`${ENTITY_URL}/${id}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to delete student');
            
            renderStudents();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    }
}