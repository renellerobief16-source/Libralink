-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;

END;
$$ LANGUAGE plpgsql;

-- Add trigger to borrow_request_items table
DROP TRIGGER IF EXISTS update_borrow_request_items_updated_at ON borrow_request_items;
CREATE TRIGGER update_borrow_request_items_updated_at
    BEFORE UPDATE ON borrow_request_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to borrow_requests table if not exists
DROP TRIGGER IF EXISTS update_borrow_requests_updated_at ON borrow_requests;
CREATE TRIGGER update_borrow_requests_updated_at
    BEFORE UPDATE ON borrow_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
