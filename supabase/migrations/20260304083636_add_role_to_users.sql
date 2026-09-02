ALTER TABLE public.users
ADD COLUMN role TEXT NOT NULL DEFAULT 'user'
CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));
