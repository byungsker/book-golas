# Remote fixture reset transcript

transport=Tailscale SSH
target=isolated Supabase project on a remote Docker Desktop host
tested_commit=0460df44e964b83e6c1d284669c5a55d73b78922
fixture_source_files_clean=true
remote_clone_unrelated_changes_preserved=true
supabase_cli=2.109.1
docker_server=29.7.2 docker_ostype=linux docker_arch=aarch64
seed_sha256=5d80e1ae55e18d37a223c4b2b72895eb8d6b565b94b003316b056c36e84c9513
fixture_contract_script_sha256=73a8c47a71411e00d72334df6d248b7acf34af88c9567268fd15bf229a154a38
reset_script_sha256=3cdcab85f1bdabcdcb4124fff55ff995323e7f03be109eecd63507a48bb66ed9
runtime_script_sha256=bfc040d9b3cbd7ee5910f4f03caebf2661cfcb8e82cb304524f8e0a69a4b5fad

$ npm run test:fixtures
fixture contract passed: 2 isolated users, 2 books, 2 images, local-only credentials and reset seed

$ npm run test:fixtures:runtime
reset_exit=0
Finished supabase db reset on branch HEAD.
local Supabase fixtures reset and uploaded: 2 users, 2 books, 2 images
fixture runtime contract passed: verified_objects=user-a/book-a.png,user-b/book-b.png bytes=68

storage_api_verification=list_and_download_each_expected_object_and_compare_to_cover.png
browser_e2e=15_passed_across_chromium_firefox_webkit
cleanup=isolated Supabase project stopped after verification; unrelated projects preserved
