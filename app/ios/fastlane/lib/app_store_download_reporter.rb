require "base64"
require "csv"
require "date"
require "digest"
require "json"
require "net/http"
require "openssl"
require "stringio"
require "uri"
require "zlib"

require "jwt"

module AppStoreDownloadReporter
  class ApiError < StandardError
    attr_reader :status

    def initialize(status, body)
      @status = status
      super("App Store Connect API returned HTTP #{status}: #{body}")
    end
  end

  class ApiClient
    BASE_URL = "https://api.appstoreconnect.apple.com".freeze

    def initialize(key_id:, issuer_id:, key_content_base64:)
      @key_id = key_id
      @issuer_id = issuer_id
      @private_key = OpenSSL::PKey::EC.new(Base64.decode64(key_content_base64))
    end

    def get_all(path)
      records = []
      next_url = path

      while next_url
        response = get_json(next_url)
        records.concat(response.fetch("data"))
        next_url = response.dig("links", "next")
      end

      records
    end

    def get_json(path)
      JSON.parse(request(:get, path))
    end

    def post_json(path, payload)
      JSON.parse(request(:post, path, body: JSON.generate(payload)))
    end

    def download(url, redirects_remaining: 5)
      uri = URI(url)
      response = perform(Net::HTTP::Get.new(uri), uri)

      if response.is_a?(Net::HTTPRedirection)
        raise ApiError.new(response.code.to_i, "too many redirects") if redirects_remaining.zero?

        return download(
          URI.join(url, response.fetch("location")).to_s,
          redirects_remaining: redirects_remaining - 1
        )
      end

      return response.body if response.is_a?(Net::HTTPSuccess)

      raise ApiError.new(response.code.to_i, response.body.to_s[0, 500])
    end

    private

    def request(method, path, body: nil)
      uri = path.start_with?("http") ? URI(path) : URI.join(BASE_URL, path)
      request = method == :post ? Net::HTTP::Post.new(uri) : Net::HTTP::Get.new(uri)
      request["Authorization"] = "Bearer #{token}"
      request["Content-Type"] = "application/json" if body
      request.body = body if body
      response = perform(request, uri)

      return response.body if response.is_a?(Net::HTTPSuccess)

      raise ApiError.new(response.code.to_i, response.body.to_s[0, 500])
    end

    def perform(request, uri)
      Net::HTTP.start(
        uri.host,
        uri.port,
        use_ssl: uri.scheme == "https",
        open_timeout: 15,
        read_timeout: 60
      ) do |http|
        http.request(request)
      end
    end

    def token
      now = Time.now.to_i
      payload = {
        "iss" => @issuer_id,
        "iat" => now,
        "exp" => now + 900,
        "aud" => "appstoreconnect-v1"
      }
      headers = {
        "kid" => @key_id,
        "typ" => "JWT"
      }
      JWT.encode(payload, @private_key, "ES256", headers)
    end
  end

  class SegmentReader
    def initialize(api_client)
      @api_client = api_client
    end

    def read(segment)
      attributes = segment.fetch("attributes")
      compressed = @api_client.download(attributes.fetch("url"))
      verify_size!(compressed, attributes["sizeInBytes"])
      verify_checksum!(compressed, attributes["checksum"])
      Zlib::GzipReader.new(StringIO.new(compressed)).read
    end

    private

    def verify_size!(content, expected)
      return if expected.nil? || content.bytesize == expected

      raise "Analytics report segment size mismatch"
    end

    def verify_checksum!(content, expected)
      return if expected.nil? || expected.empty?

      actual =
        case expected.length
        when 32
          Digest::MD5.hexdigest(content)
        when 64
          Digest::SHA256.hexdigest(content)
        else
          raise "Unsupported analytics report checksum"
        end
      raise "Analytics report segment checksum mismatch" unless actual.casecmp?(expected)
    end
  end

  class Aggregator
    DOWNLOAD_TYPES = {
      "first-time download" => "first_time_downloads",
      "redownload" => "redownloads",
      "manual update" => "manual_updates",
      "auto-update" => "auto_updates",
      "restore" => "restores"
    }.freeze

    def initialize(app_apple_id)
      @app_apple_id = app_apple_id.to_s
    end

    def aggregate(instance_rows)
      latest_by_date = {}

      instance_rows.sort_by { |item| item.fetch(:processing_date) }.each do |item|
        partitions = parse_partitions(item.fetch(:contents))

        partitions.each do |date, counts|
          existing = latest_by_date[date]
          next if existing && existing.fetch(:processing_date) > item.fetch(:processing_date)

          latest_by_date[date] = {
            processing_date: item.fetch(:processing_date),
            counts: counts
          }
        end
      end

      totals = DOWNLOAD_TYPES.values.to_h { |key| [key, 0] }
      latest_by_date.each_value do |partition|
        partition.fetch(:counts).each do |key, count|
          totals[key] += count
        end
      end

      totals["updates"] = totals.fetch("manual_updates") + totals.fetch("auto_updates")
      totals["total_download_events"] = DOWNLOAD_TYPES.values.sum { |key| totals.fetch(key) }
      {
        "by_type" => totals,
        "first_reported_date" => latest_by_date.keys.min,
        "last_reported_date" => latest_by_date.keys.max,
        "partitions" => latest_by_date.length
      }
    end

    private

    def parse_partitions(contents)
      partitions = Hash.new { |hash, key| hash[key] = Hash.new(0) }

      contents.each do |content|
        CSV.parse(content, headers: true, col_sep: "\t").each do |row|
          next unless row.fetch("App Apple Identifier").to_s == @app_apple_id

          key = DOWNLOAD_TYPES[normalize(row.fetch("Download Type"))]
          next unless key

          partitions[row.fetch("Date")][key] += Integer(row.fetch("Counts"))
        end
      end

      partitions
    end

    def normalize(value)
      value.to_s.strip.downcase.tr("‑–—", "---")
    end
  end

  class Runner
    APP_BUNDLE_ID = "com.bookgolas.app".freeze
    APP_APPLE_ID = "6757021809".freeze

    def initialize(api_client:, segment_reader:, create_if_missing:)
      @api_client = api_client
      @segment_reader = segment_reader
      @create_if_missing = create_if_missing
    end

    def call
      app = find_app
      report_request = find_report_request(app.fetch("id"))

      if report_request.nil?
        return pending("missing_report_request") unless @create_if_missing

        created = create_report_request(app.fetch("id"))
        return pending("report_request_created", request_id: created.fetch("id"))
      end

      reports = @api_client.get_all(
        "/v1/analyticsReportRequests/#{report_request.fetch("id")}/reports?filter[category]=COMMERCE&limit=200"
      )
      report = select_download_report(reports)
      return pending("downloads_report_generating", request_id: report_request.fetch("id")) unless report

      instances = @api_client.get_all(
        "/v1/analyticsReports/#{report.fetch("id")}/instances?filter[granularity]=DAILY&limit=200"
      )
      return pending("downloads_instances_generating", request_id: report_request.fetch("id")) if instances.empty?

      instance_rows = instances.map do |instance|
        segments = @api_client.get_all(
          "/v1/analyticsReportInstances/#{instance.fetch("id")}/segments?limit=200"
        )
        {
          processing_date: Date.iso8601(instance.dig("attributes", "processingDate")),
          contents: segments.map { |segment| @segment_reader.read(segment) }
        }
      end
      result = Aggregator.new(APP_APPLE_ID).aggregate(instance_rows)
      latest_processing_date = instance_rows.map { |item| item.fetch(:processing_date) }.max

      {
        "status" => "ready",
        "app_bundle_id" => APP_BUNDLE_ID,
        "app_apple_id" => APP_APPLE_ID,
        "report_name" => report.dig("attributes", "name"),
        "report_request_id" => report_request.fetch("id"),
        "latest_processing_date" => latest_processing_date.iso8601,
        "complete_through" => (latest_processing_date - 2).iso8601
      }.merge(result)
    end

    private

    def find_app
      apps = @api_client.get_all(
        "/v1/apps?filter[bundleId]=#{URI.encode_www_form_component(APP_BUNDLE_ID)}&limit=2"
      )
      raise "App Store Connect app not found for #{APP_BUNDLE_ID}" unless apps.length == 1

      apps.fetch(0)
    end

    def find_report_request(app_id)
      requests = @api_client.get_all(
        "/v1/apps/#{app_id}/analyticsReportRequests?limit=200"
      )
      active = requests.reject { |request| request.dig("attributes", "stoppedDueToInactivity") }
      active.find { |request| request.dig("attributes", "accessType") == "ONGOING" } ||
        active.max_by { |request| request.fetch("id") }
    end

    def create_report_request(app_id)
      response = @api_client.post_json(
        "/v1/analyticsReportRequests",
        {
          "data" => {
            "type" => "analyticsReportRequests",
            "attributes" => {
              "accessType" => "ONE_TIME_SNAPSHOT"
            },
            "relationships" => {
              "app" => {
                "data" => {
                  "type" => "apps",
                  "id" => app_id
                }
              }
            }
          }
        }
      )
      response.fetch("data")
    end

    def select_download_report(reports)
      candidates = reports.select do |report|
        report.dig("attributes", "name").to_s.downcase.include?("app store downloads")
      end
      candidates.find do |report|
        report.dig("attributes", "name").to_s.downcase.include?("standard")
      end || candidates.first
    end

    def pending(reason, request_id: nil)
      {
        "status" => "pending",
        "reason" => reason,
        "app_bundle_id" => APP_BUNDLE_ID,
        "app_apple_id" => APP_APPLE_ID,
        "report_request_id" => request_id
      }.compact
    end
  end
end
