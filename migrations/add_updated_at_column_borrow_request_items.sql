-- Add updated_at column to borrow_request_items if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'borrow_request_items' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE borrow_request_items ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Add trigger function
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
