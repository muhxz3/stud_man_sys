const ENTITY_URL = `${API_URL}/enrollments`;

async function renderEnrollments(isSearch = false) {
    const list = document.getElementById('data-list');
    list.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';

    try {
        const response = await fetch(ENTITY_URL);
        const enrollments = await response.json();
        
        let filtered = enrollments;
        const filterAttribute = document.getElementById('filter-attribute').value;
        const filterValue = document.getElementById('filter-input').value.toLowerCase();
        const filterOperator = document.getElementById('filter-operator').value;

        if (isSearch && filterValue) {
            filtered = enrollments.filter(e => {
                if (filterAttribute === 'all') {
                    // Search across all relevant string-convertible attributes
                    return Object.values(e).some(val => String(val || '').toLowerCase().includes(filterValue));
                }

                const itemValue = e[filterAttribute];

                // Handle numeric and date filters
                const numericOrDateAttrs = ['student_id', 'course_id', 'enrollment_date'];
                if (numericOrDateAttrs.includes(filterAttribute)) {
                    // For dates, string comparison works with YYYY-MM-DD format
                    const comparableItemValue = itemValue;
                    const comparableFilterValue = filterValue;

                    if (!comparableItemValue) return false;

                    if (filterOperator === 'equals') return comparableItemValue == comparableFilterValue;
                    if (filterOperator === 'greater_than') return comparableItemValue > comparableFilterValue;
                    if (filterOperator === 'less_than') return comparableItemValue < comparableFilterValue;
                }

                // Handle string filters (default behavior)
                return String(itemValue || '').toLowerCase().includes(filterValue);
            });
        }

        list.innerHTML = '';
        if (filtered.length === 0) {
            list.innerHTML = `<tr><td colspan="4">${isSearch ? 'No results found.' : 'No enrollments found.'}</td></tr>`;
            return;
        }

        filtered.forEach(item => {
            const tr = document.createElement('tr');
            // Since there are no actions, we don't need the actions cell
            tr.innerHTML = `
                <td>${item.student_name}</td>
                <td>${item.course_name}</td>
                <td>${item.enrollment_date}</td>
                <td>${item.academic_year}</td>
            `;
            list.appendChild(tr);
        });
    } catch (error) {
        console.error('Failed to fetch enrollments:', error);
        list.innerHTML = '<tr><td colspan="4">Error loading data. Is the backend running?</td></tr>';
    }
}

// Since enrollments are read-only from this view, we don't need:
// - handleFormSubmit
// - openFormForAdd
// - openFormForEdit
// - deleteItem
// - populateDropdowns

document.addEventListener('DOMContentLoaded', () => {
    renderEnrollments();
});