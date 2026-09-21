-- ============================================================
-- Event Management System - Seed Data
-- Run this AFTER schema.sql
--
-- Default login credentials (created below):
--   Admin      : admin@events.com     / Admin@123
--   Organizer  : organizer@events.com / Organizer@123
--   Student    : student@events.com   / Student@123
--
-- Passwords below are bcrypt hashes of the passwords shown above.
-- ============================================================

USE event_management_db;

INSERT INTO users (name, email, password_hash, role) VALUES
('System Admin', 'admin@events.com', '$2b$12$asIc7Mvb.9MimVJmKvW4OuZSMlNHMBJXwcsmpDCEZOs1gFRElzzKG', 'admin'),
('Alice Organizer', 'organizer@events.com', '$2b$12$ZZ7irgKgAzqMGhj.j/18kudpg9t7YPvsJt6.FwJ3NDiu/4xtsziou', 'organizer'),
('Bob Student', 'student@events.com', '$2b$12$FYqQzrR0IaGOHLkZ8sbl3.p10naWlBkAb5aYHywojfimC9lNbpsjm', 'student');

INSERT INTO events (title, description, venue, date, time, category, max_participants, organizer_id, status, approval_status) VALUES
('Annual Tech Symposium', 'A full-day symposium featuring talks on AI, cloud computing, and cybersecurity from industry experts.', 'Main Auditorium', '2026-08-15', '09:00:00', 'Technology', 150, 2, 'upcoming', 'approved'),
('Inter-College Cultural Fest', 'A vibrant celebration of music, dance, and drama with performances from colleges across the region.', 'Open Air Theatre', '2026-08-22', '17:00:00', 'Cultural', 300, 2, 'upcoming', 'approved'),
('Web Development Workshop', 'Hands-on workshop covering HTML, CSS, JavaScript and Flask fundamentals for beginners.', 'Computer Lab 3', '2026-07-30', '10:00:00', 'Workshop', 40, 2, 'upcoming', 'approved'),
('Inter-Departmental Basketball Tournament', 'Knockout basketball tournament between department teams.', 'Sports Complex', '2026-07-25', '15:30:00', 'Sports', 80, 2, 'upcoming', 'approved'),
('Research Paper Presentation Day', 'Students present ongoing research papers to a panel of faculty judges.', 'Seminar Hall B', '2026-09-05', '11:00:00', 'Academic', 60, 2, 'upcoming', 'approved');
