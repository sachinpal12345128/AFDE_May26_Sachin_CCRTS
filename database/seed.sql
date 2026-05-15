-- Reference seed data for CCRTS (plain SQL — use seed_db.py for the actual seed,
-- since user passwords need to be bcrypt-hashed by the Python helper).

INSERT INTO roles (role_name) VALUES
  ('Admin'),
  ('Supervisor'),
  ('Agent'),
  ('Customer');

INSERT INTO categories (category_name) VALUES
  ('Billing Issues'),
  ('Service Disruption'),
  ('Product Defects'),
  ('Technical Problems'),
  ('Delivery Delays'),
  ('Account Issues'),
  ('Customer Service Complaints');

-- Users intentionally omitted from this SQL file — see seed_db.py.
-- Adding plaintext passwords to git would defeat the bcrypt step.
