
create table Dept(
	dept_id int primary key auto_increment,
    dept_name varchar(50) NOT NULL UNIQUE
)auto_increment=100;

create table Instructor(
		instructor_id int primary key auto_increment,
        instructor_name varchar(100) NOT NULL,
        phone varchar(15),
        email varchar(255) NOT NULL UNIQUE,
        specialization varchar(50)
)auto_increment=9000;

create table Hostel(
	hostel_id int primary key auto_increment,
    hostel_name varchar(50) NOT NULL UNIQUE,
    capacity int,
    warden_id int,
    foreign key(warden_id) references Instructor(instructor_id) ON DELETE SET NULL ON UPDATE CASCADE
)auto_increment=500;

create table Student(
	student_id int primary key auto_increment,
    student_name varchar(100) NOT NULL,
    DOB date,
    email varchar(255) NOT NULL UNIQUE,
    gender ENUM('Male', 'Female', 'Other'),
    phone varchar(15),
    hostel_id int,
    foreign key(hostel_id) references Hostel(hostel_id) ON DELETE SET NULL ON UPDATE CASCADE
)auto_increment=10000;

create table Course(
	course_id int primary key auto_increment,
    course_name varchar(100) NOT NULL,
    credits int,
    instructor_id int,
    dept_id int,
    foreign key(instructor_id) references Instructor(instructor_id) ON DELETE SET NULL ON UPDATE CASCADE,
    foreign key(dept_id) references Dept(dept_id) ON DELETE CASCADE ON UPDATE CASCADE
)auto_increment=2000;

create table Enrolls(
	student_id int,
    course_id int,
    enrollment_date date,
    academic_year varchar(10),
    primary key(student_id, course_id),
    foreign key(student_id) references Student(student_id) ON DELETE CASCADE ON UPDATE CASCADE,
    foreign key(course_id) references Course(course_id) ON DELETE CASCADE ON UPDATE CASCADE
);


-- mysql -h maglev.proxy.rlwy.net -u root -p --port 27763 --protocol=TCP
-- create database stud_man_sys; 
--  exit;
-- mysql -h maglev.proxy.rlwy.net -u root -p --port 27763 --protocol=TCP stud_man_sys < stud_man_sys.sql
