-- Remove the original signup trigger function after replacing it with
-- sync_auth_user_profile(), which also keeps profile email in sync.
drop function if exists private.handle_new_user();
