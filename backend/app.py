from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector
from datetime import date
import os

app = Flask(__name__)
CORS(app)

# Database configuration
db_config = {
    'host': 'maglev.proxy.rlwy.net',
    'user': 'root',
    'password': 'IeOYttKlkONJpfuPBNMLOAhEBbJYOWIY',
    'port': 27763,
    'database': 'stud_man_sys'
}

table_map = {
    'departments': {'name': 'Dept', 'pk': 'dept_id', 'order': 'dept_name'},
    'instructors': {'name': 'Instructor', 'pk': 'instructor_id', 'order': 'instructor_name'},
    'hostels': {'name': 'Hostel', 'pk': 'hostel_id', 'order': 'hostel_name'},
    'courses': {'name': 'Course', 'pk': 'course_id', 'order': 'course_name'},
    'students': {'name': 'Student', 'pk': 'student_id', 'order': 'student_name'},
    'enrollments': {'name': 'Enrolls', 'pk': None, 'order': 'enrollment_date DESC'}
}

def get_db_connection():
    try:
        return mysql.connector.connect(**db_config)
    except mysql.connector.Error as err:
        print(f"Database connection error: {err}")
        return None

# Generic GET All Endpoint
@app.route('/api/<string:tableName>', methods=['GET'])
def get_all(tableName):
    if tableName not in table_map:
        return jsonify({'error': 'Invalid endpoint'}), 404
    
    table_info = table_map[tableName]
    query = ""

    # Use JOINs for more descriptive data on specific tables
    if tableName == 'hostels':
        query = "SELECT h.*, i.instructor_name as warden_name FROM Hostel h LEFT JOIN Instructor i ON h.warden_id = i.instructor_id ORDER BY h.hostel_name"
    elif tableName == 'courses':
        query = "SELECT c.*, d.dept_name, i.instructor_name FROM Course c LEFT JOIN Dept d ON c.dept_id = d.dept_id LEFT JOIN Instructor i ON c.instructor_id = i.instructor_id ORDER BY c.course_name"
    elif tableName == 'instructors':
        query = "SELECT * FROM Instructor ORDER BY instructor_name"
    elif tableName == 'students':
        query = "SELECT s.student_id, s.student_name, s.DOB, s.email, s.gender, s.phone, s.hostel_id, h.hostel_name FROM Student s LEFT JOIN Hostel h ON s.hostel_id = h.hostel_id ORDER BY s.student_name"
    elif tableName == 'enrollments':
        query = "SELECT e.*, s.student_name, c.course_name FROM Enrolls e JOIN Student s ON e.student_id = s.student_id JOIN Course c ON e.course_id = c.course_id ORDER BY e.enrollment_date DESC"
    else:
        query = f"SELECT * FROM {table_info['name']} ORDER BY {table_info['order']}"

    conn = get_db_connection()
    if not conn: return jsonify({'error': 'Database connection failed'}), 500
    
    cursor = conn.cursor(dictionary=True)
    cursor.execute(query)
    rows = cursor.fetchall()
    
    # Format date objects to strings for JSON serialization
    for row in rows:
        for key, value in row.items():
            if isinstance(value, date):
                row[key] = value.isoformat()
    
    conn.close()
    return jsonify(rows)

# Generic POST Endpoint
@app.route('/api/<string:tableName>', methods=['POST'])
def create_item(tableName):
    if tableName not in table_map:
        return jsonify({'error': 'Invalid endpoint'}), 404

    data = request.get_json()
    conn = get_db_connection()
    if not conn: return jsonify({'error': 'Database connection failed'}), 500
    
    cursor = conn.cursor(dictionary=True)

    try:
        # Special logic for creating a student (with enrollment)
        if tableName == 'students':
            hostel_id = None
            conn.start_transaction()

            # Hostel assignment logic
            if data.get('student_type') == 'Hosteler' and data.get('hostel_id') is not None:
                hostel_id = data['hostel_id']
                if not hostel_id: # Check for empty string
                    raise Exception("A hostel must be selected for a hosteler.")
                # Decrement the capacity of the assigned hostel
                update_hostel_query = "UPDATE Hostel SET capacity = capacity - 1 WHERE hostel_id = %s AND capacity > 0"
                cursor.execute(update_hostel_query, (hostel_id,))
                if cursor.rowcount == 0:
                    raise Exception("Selected hostel has no available capacity.")

            student_sql = "INSERT INTO Student (student_name, DOB, email, gender, phone, hostel_id) VALUES (%s, %s, %s, %s, %s, %s)"
            cursor.execute(student_sql, (data['student_name'], data['DOB'], data['email'], data['gender'], data.get('phone'), hostel_id))
            student_id = cursor.lastrowid

            # Single-course enrollment logic
            if data.get('course_id'):
                enroll_sql = "INSERT INTO Enrolls (student_id, course_id, enrollment_date, academic_year) VALUES (%s, %s, %s, %s)"
                enrollment_date = date.today().isoformat()
                academic_year = str(date.today().year)
                cursor.execute(enroll_sql, (student_id, data['course_id'], enrollment_date, academic_year))
            
            # Fetch the hostel name to return to the frontend
            hostel_name = None
            if hostel_id:
                cursor.execute("SELECT hostel_name FROM Hostel WHERE hostel_id = %s", (hostel_id,))
                result = cursor.fetchone()
                if result:
                    hostel_name = result['hostel_name']

            conn.commit()
            response_data = {**data, 'student_id': student_id, 'hostel_id': hostel_id, 'hostel_name': hostel_name}

            return jsonify(response_data), 201
        else:
            # Generic POST for other tables
            table_info = table_map[tableName]
            columns = ', '.join(data.keys())
            placeholders = ', '.join(['%s'] * len(data))
            query = f"INSERT INTO {table_info['name']} ({columns}) VALUES ({placeholders})"
            cursor.execute(query, list(data.values()))
            new_id = cursor.lastrowid
            conn.commit()
            return jsonify({'id': new_id, **data}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

# Generic PUT (Update) Endpoint
@app.route('/api/<string:tableName>/<int:id>', methods=['PUT'])
def update_item(tableName, id):
    if tableName not in table_map or not table_map[tableName]['pk']:
        return jsonify({'error': 'Invalid endpoint or not updatable'}), 404

    table_info = table_map[tableName]
    data = request.get_json()
    
    conn = get_db_connection()
    if not conn: return jsonify({'error': 'Database connection failed'}), 500
    
    cursor = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()

        # Special logic for student hostel updates
        if tableName == 'students':
            # Get the student's current hostel
            cursor.execute("SELECT hostel_id FROM Student WHERE student_id = %s FOR UPDATE", (id,))
            current_hostel_result = cursor.fetchone()
            current_hostel_id = current_hostel_result['hostel_id'] if current_hostel_result else None
            
            # Ensure new_hostel_id is an integer for correct comparison
            new_hostel_id_str = data.get('hostel_id')
            new_hostel_id = int(new_hostel_id_str) if new_hostel_id_str else None

            # If the hostel has changed, update capacities
            if new_hostel_id != current_hostel_id:
                # Increment capacity of the old hostel if there was one
                if current_hostel_id is not None:
                    cursor.execute("UPDATE Hostel SET capacity = capacity + 1 WHERE hostel_id = %s", (current_hostel_id,))
                # Decrement capacity of the new hostel if one is being assigned
                if new_hostel_id is not None:
                    # Check for capacity before decrementing
                    cursor.execute("UPDATE Hostel SET capacity = capacity - 1 WHERE hostel_id = %s AND capacity > 0", (new_hostel_id,))
                    # Check if the update was successful
                    if cursor.rowcount == 0: # This means capacity was 0 or hostel didn't exist
                        conn.rollback()
                        raise Exception("Selected new hostel has no available capacity.")
            
            # Ensure the hostel_id in the data to be updated is an integer
            data['hostel_id'] = new_hostel_id

        # Re-create the query and values list AFTER data has been potentially modified
        set_clause = ', '.join([f"`{key}` = %s" for key in data.keys()])
        query = f"UPDATE `{table_info['name']}` SET {set_clause} WHERE `{table_info['pk']}` = %s"
        final_values = list(data.values())

        cursor.execute(query, final_values + [id]) # Execute the newly constructed query
        if cursor.rowcount == 0:
            conn.rollback()
            return jsonify({'error': 'Item not found'}), 404
        conn.commit()
        return jsonify({'message': 'Item updated successfully'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

# Generic DELETE Endpoint
@app.route('/api/<string:tableName>/<int:id>', methods=['DELETE'])
def delete_item(tableName, id):
    if tableName not in table_map or not table_map[tableName]['pk']:
        return jsonify({'error': 'Invalid endpoint or not deletable'}), 404

    table_info = table_map[tableName]
    query = f"DELETE FROM {table_info['name']} WHERE {table_info['pk']} = %s"

    conn = get_db_connection()
    if not conn: return jsonify({'error': 'Database connection failed'}), 500
    
    cursor = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()

        # If deleting a hostel, check if it has students
        if tableName == 'hostels':
            cursor.execute("SELECT COUNT(*) as student_count FROM Student WHERE hostel_id = %s", (id,))
            result = cursor.fetchone()
            if result and result['student_count'] > 0:
                raise Exception(f"Cannot delete hostel. {result['student_count']} student(s) are still assigned to it.")

        # If deleting a student, first handle their hostel capacity
        if tableName == 'students':
            # Find the student's hostel_id before deleting them
            cursor.execute("SELECT hostel_id FROM Student WHERE student_id = %s FOR UPDATE", (id,))
            result = cursor.fetchone()
            if result and result['hostel_id'] is not None:
                hostel_id = result['hostel_id']
                # Increment the capacity of the old hostel
                cursor.execute("UPDATE Hostel SET capacity = capacity + 1 WHERE hostel_id = %s", (hostel_id,))

        cursor.execute(query, (id,))
        if cursor.rowcount == 0:
            conn.rollback()
            return jsonify({'error': 'Item not found'}), 404
        conn.commit()
        return jsonify({'message': 'Item deleted successfully'}), 200
    except mysql.connector.Error as err:
        conn.rollback()
        if err.errno == 1451: # Foreign Key constraint fails
            return jsonify({'error': 'Cannot delete this item because it is referenced by other records.'}), 400
        return jsonify({'error': str(err)}), 500
    except Exception as e:
        conn.rollback()
        # Catch any other unexpected errors during the transaction
        return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500
    finally:
        conn.close()

if __name__ == '__main__':
    app.run(debug=True, port=3001)