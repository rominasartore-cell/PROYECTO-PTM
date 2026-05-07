-- Create analysis_requests table
CREATE TABLE IF NOT EXISTS analysis_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  vehicle_plate VARCHAR(50) NOT NULL,
  request_id VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, paid
  fine_count INTEGER DEFAULT 0,
  prescribed_count INTEGER DEFAULT 0,
  total_amount_utm DECIMAL(10, 2) DEFAULT 0,
  utm_value_clp INTEGER DEFAULT 0,
  payment_status VARCHAR(50) DEFAULT NULL, -- pending, approved, failed
  raw_analysis_json JSONB,
  internal_notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_request_id ON analysis_requests(request_id);
CREATE INDEX idx_customer_email ON analysis_requests(customer_email);
CREATE INDEX idx_vehicle_plate ON analysis_requests(vehicle_plate);
CREATE INDEX idx_status ON analysis_requests(status);
CREATE INDEX idx_created_at ON analysis_requests(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE analysis_requests ENABLE ROW LEVEL SECURITY;

-- Create admin_notes table
CREATE TABLE IF NOT EXISTS admin_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id VARCHAR(255) NOT NULL REFERENCES analysis_requests(request_id),
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for admin_notes
CREATE INDEX idx_admin_notes_request_id ON admin_notes(request_id);

-- Enable RLS for admin_notes
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;
