-- RPC function to retrieve Serper API credentials from Vault
-- Used by compare-price Edge Function for non-Korean locale Google Shopping search
CREATE OR REPLACE FUNCTION public.get_serper_credentials()
RETURNS TABLE (api_key TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT ds.decrypted_secret AS api_key
  FROM vault.decrypted_secrets ds
  WHERE ds.name = 'SERPER_API_KEY'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke direct access, only service_role can call this
REVOKE ALL ON FUNCTION public.get_serper_credentials() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_serper_credentials() FROM anon;
REVOKE ALL ON FUNCTION public.get_serper_credentials() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_serper_credentials() TO service_role;
