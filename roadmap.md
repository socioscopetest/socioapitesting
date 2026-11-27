# SocioScope
- [x] Detect outbound IP before SocioAPI requests, expose it in 403 errors and JSON, and run one signed-in search as a temporary test user. ipify returned 34.34.100.172; SocioAPI reported 172.19.0.1, so adding the ipify IP alone is not proven to resolve the whitelist rejection.
- [x] Build dark monitoring dashboard with TikTok and Instagram post/profile searches.
- [x] Implement secure SocioAPI proxy and store private credential.
- [x] Verify null metrics, error handling, empty billing, filter, JSON inspection, and desktop/mobile layout.
- [x] Verify successful live results, billing refresh, and live pagination after whitelist configuration. TikTok post search returned HTTP 200 with 7,292 results across 730 pages; page 2 showed 10 different posts. Actual profile search returned one profile. Empty search handled successfully. Fractional credit_used and latency units matched real responses. Tested as a temporary user.