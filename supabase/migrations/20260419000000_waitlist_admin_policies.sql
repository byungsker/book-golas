-- BOK-371: Admin SELECT/DELETE policies for waitlist
-- Admins (whitelist by email) can read and remove waitlist entries

CREATE POLICY "waitlist_admin_select"
  ON public.waitlist
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') IN (
      'admin@bookgolas.com',
      'byungsker@naver.com',
      'extreme0728@gmail.com'
    )
  );

CREATE POLICY "waitlist_admin_delete"
  ON public.waitlist
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') IN (
      'admin@bookgolas.com',
      'byungsker@naver.com',
      'extreme0728@gmail.com'
    )
  );
