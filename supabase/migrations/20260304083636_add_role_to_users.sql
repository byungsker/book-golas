ALTER TABLE public.users
ADD COLUMN role TEXT NOT NULL DEFAULT 'user'
CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));

UPDATE public.users SET role = 'admin' WHERE email = 'admin@bookgolas.com';
UPDATE public.users SET role = 'admin' WHERE email = 'extreme0728@gmail.com';
