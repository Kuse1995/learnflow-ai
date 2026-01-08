-- Add terminology column to schools table
ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS class_level_terminology TEXT DEFAULT 'grade';

-- Add comment for documentation
COMMENT ON COLUMN schools.class_level_terminology IS 
  'Terminology for class levels: grade, form, year, standard, or class';

-- Update existing schools based on country (form-using countries)
UPDATE schools SET class_level_terminology = 'form' 
WHERE country IN ('Zimbabwe', 'Tanzania', 'Kenya', 'Malawi', 'Uganda') 
  AND (class_level_terminology IS NULL OR class_level_terminology = 'grade');