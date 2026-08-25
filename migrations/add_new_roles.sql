-- Add new library roles
INSERT INTO roles (role_name) VALUES
('Assistant Librarian'),
('Library Technician')
ON CONFLICT (role_name) DO NOTHING;
