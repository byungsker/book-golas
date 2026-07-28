require "spaceship"

require_relative "../lib/testflight_build_verifier"

def required_environment(name)
  value = ENV[name]
  raise ArgumentError, "Missing required environment variable #{name}" if value.nil? || value.empty?

  value
end

key_id = required_environment("APP_STORE_CONNECT_API_KEY_ID")
issuer_id = required_environment("APP_STORE_CONNECT_ISSUER_ID")
key_content = required_environment("APP_STORE_CONNECT_API_KEY_CONTENT")
app_identifier = required_environment("TESTFLIGHT_APP_IDENTIFIER")
marketing_version = required_environment("TESTFLIGHT_MARKETING_VERSION")
build_number = required_environment("TESTFLIGHT_BUILD_NUMBER")
timeout_seconds = ENV.fetch("TESTFLIGHT_PROCESSING_TIMEOUT_SECONDS", "1800")
poll_interval_seconds = ENV.fetch("TESTFLIGHT_PROCESSING_POLL_SECONDS", "30")

token = Spaceship::ConnectAPI::Token.create(
  key_id: key_id,
  issuer_id: issuer_id,
  key: key_content,
  is_key_content_base64: true
)
Spaceship::ConnectAPI.token = token

app = Spaceship::ConnectAPI::App.find(app_identifier)
raise "App Store Connect app not found for #{app_identifier}" unless app

fetch_builds = lambda do
  Spaceship::ConnectAPI::Build.all(
    app_id: app.id,
    version: marketing_version,
    build_number: build_number,
    platform: "IOS"
  )
end

verifier = TestFlightBuildVerifier.new(
  fetch_builds: fetch_builds,
  expected_version: marketing_version,
  expected_build_number: build_number,
  timeout_seconds: timeout_seconds,
  poll_interval_seconds: poll_interval_seconds
)

verifier.wait!
puts "Verified TestFlight build #{marketing_version} (#{build_number}) is VALID"
