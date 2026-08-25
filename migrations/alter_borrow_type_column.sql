-- Increase borrow_type column size to accommodate longer values
-- INTER_SCHOOL_LIBRARY_USE is 26 characters, current limit is 20

ALTER TABLE borrow_request_items 
ALTER COLUMN borrow_type TYPE VARCHAR(50);
