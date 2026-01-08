-- Fix missing user roles for platform owner and new school admin

-- Platform owner roles for demo school
INSERT INTO user_roles (user_id, school_id, role, is_active)
VALUES 
  ('cc64577a-ea0d-40a7-83a8-41a08a18caca', '5e508bfd-bd20-4461-8687-450a450111b8', 'platform_admin', true),
  ('cc64577a-ea0d-40a7-83a8-41a08a18caca', '5e508bfd-bd20-4461-8687-450a450111b8', 'school_admin', true),
  ('cc64577a-ea0d-40a7-83a8-41a08a18caca', '5e508bfd-bd20-4461-8687-450a450111b8', 'teacher', true),
  ('cc64577a-ea0d-40a7-83a8-41a08a18caca', '5e508bfd-bd20-4461-8687-450a450111b8', 'parent', true),
  -- Platform owner roles for "Art of Brands Primary" school
  ('cc64577a-ea0d-40a7-83a8-41a08a18caca', '90dd04d3-cbe9-436c-8ee7-cf0837bf64cf', 'platform_admin', true),
  ('cc64577a-ea0d-40a7-83a8-41a08a18caca', '90dd04d3-cbe9-436c-8ee7-cf0837bf64cf', 'school_admin', true),
  -- artofbrands25@gmail.com as school_admin for "Art of Brands Primary"
  ('77c03406-33d9-4019-8e4f-e92162d24b21', '90dd04d3-cbe9-436c-8ee7-cf0837bf64cf', 'school_admin', true)
ON CONFLICT (user_id, role, school_id) DO UPDATE SET is_active = true;

-- Create profile for artofbrands25@gmail.com if missing
INSERT INTO profiles (id, email, full_name)
VALUES ('77c03406-33d9-4019-8e4f-e92162d24b21', 'artofbrands25@gmail.com', 'Art of Brands Admin')
ON CONFLICT (id) DO NOTHING;