-- Insert test books for other schools (not Santa Rita College)
-- This will allow testing the auto-suggest feature when searching from Santa Rita College

-- Add Harry Potter books to Guagua National College (school_id 2)
INSERT INTO books (title, isbn, school_id, category_id, copyright_year, general_note, created_at)
VALUES
  ('Harry Potter and the Sorcerer''s Stone', '9780590353427', 2, NULL, 1997, 'The first book in the Harry Potter series', NOW()),
  ('Harry Potter and the Chamber of Secrets', '9780590353434', 2, NULL, 1998, 'The second book in the Harry Potter series', NOW()),
  ('Harry Potter and the Prisoner of Azkaban', '9780590353434', 2, NULL, 1999, 'The third book in the Harry Potter series', NOW());

-- Add some other popular books to Pampanga State University (school_id 9)
INSERT INTO books (title, isbn, school_id, category_id, copyright_year, general_note, created_at)
VALUES
  ('The Great Gatsby', '9780743273565', 9, NULL, 1925, 'A classic American novel', NOW()),
  ('To Kill a Mockingbird', '9780061120084', 9, NULL, 1960, 'A classic of modern American literature', NOW()),
  ('1984', '9780451524935', 9, NULL, 1949, 'A dystopian social science fiction novel', NOW());

-- Add some books to Avengers school (school_id 17)
INSERT INTO books (title, isbn, school_id, category_id, copyright_year, general_note, created_at)
VALUES
  ('The Hobbit', '9780547928227', 17, NULL, 1937, 'A fantasy novel', NOW()),
  ('Lord of the Rings', '9780544003415', 17, NULL, 1954, 'An epic high-fantasy novel', NOW());

-- Add some books to Chelle State University (school_id 14)
INSERT INTO books (title, isbn, school_id, category_id, copyright_year, general_note, created_at)
VALUES
  ('Pride and Prejudice', '9780141439518', 14, NULL, 1813, 'A romantic novel', NOW()),
  ('Jane Eyre', '9780141441146', 14, NULL, 1847, 'A novel by Charlotte Brontë', NOW());
