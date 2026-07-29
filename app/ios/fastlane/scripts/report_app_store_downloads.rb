require "json"

require_relative "../lib/app_store_download_reporter"

def required_environment(name)
  value = ENV[name]
  raise ArgumentError, "Missing required environment variable #{name}" if value.nil? || value.empty?

  value
end

client = AppStoreDownloadReporter::ApiClient.new(
  key_id: required_environment("APP_STORE_CONNECT_API_KEY_ID"),
  issuer_id: required_environment("APP_STORE_CONNECT_ISSUER_ID"),
  key_content_base64: required_environment("APP_STORE_CONNECT_API_KEY_CONTENT")
)
result = AppStoreDownloadReporter::Runner.new(
  api_client: client,
  segment_reader: AppStoreDownloadReporter::SegmentReader.new(client),
  create_if_missing: ARGV.include?("--create-if-missing")
).call
output = JSON.pretty_generate(result)
puts output

summary_path = ENV["GITHUB_STEP_SUMMARY"]
if summary_path && !summary_path.empty?
  lines = ["## Bookgolas App Store downloads", "", "```json", output, "```", ""]
  File.open(summary_path, "a") { |file| file.write(lines.join("\n")) }
end
