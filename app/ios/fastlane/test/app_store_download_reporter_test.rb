require "minitest/autorun"

require_relative "../lib/app_store_download_reporter"

class AppStoreDownloadReporterTest < Minitest::Test
  class FakeApiClient
    attr_reader :posted

    def initialize(responses)
      @responses = responses
      @posted = []
    end

    def get_all(path)
      response = @responses.find { |pattern, _| path.start_with?(pattern) }
      raise "Unexpected API path #{path}" unless response

      response.fetch(1)
    end

    def post_json(path, payload)
      @posted << [path, payload]
      {
        "data" => {
          "type" => "analyticsReportRequests",
          "id" => "created-request"
        }
      }
    end
  end

  class FakeSegmentReader
    def initialize(contents)
      @contents = contents
    end

    def read(segment)
      @contents.fetch(segment.fetch("id"))
    end
  end

  def test_latest_processing_date_replaces_earlier_partition
    header = [
      "Date",
      "App Name",
      "App Apple Identifier",
      "Download Type",
      "Counts"
    ].join("\t")
    earlier = [
      header,
      "2026-07-24\tBookgolas\t6757021809\tFirst-time Download\t1",
      "2026-07-25\tBookgolas\t6757021809\tRedownload\t2"
    ].join("\n")
    later = [
      header,
      "2026-07-24\tBookgolas\t6757021809\tFirst-time Download\t3",
      "2026-07-24\tBookgolas\t6757021809\tManual update\t4"
    ].join("\n")

    result = AppStoreDownloadReporter::Aggregator.new("6757021809").aggregate(
      [
        {
          processing_date: Date.new(2026, 7, 25),
          contents: [earlier]
        },
        {
          processing_date: Date.new(2026, 7, 26),
          contents: [later]
        }
      ]
    )

    assert_equal 3, result.dig("by_type", "first_time_downloads")
    assert_equal 2, result.dig("by_type", "redownloads")
    assert_equal 4, result.dig("by_type", "updates")
    assert_equal 9, result.dig("by_type", "total_download_events")
    assert_equal 2, result.fetch("partitions")
  end

  def test_ignores_other_apps_and_unknown_download_types
    content = <<~TSV
      Date\tApp Name\tApp Apple Identifier\tDownload Type\tCounts
      2026-07-24\tBookgolas\t6757021809\tFirst-time Download\t1
      2026-07-24\tOther\t1234567890\tFirst-time Download\t8
      2026-07-24\tBookgolas\t6757021809\tUnknown\t4
    TSV

    result = AppStoreDownloadReporter::Aggregator.new("6757021809").aggregate(
      [
        {
          processing_date: Date.new(2026, 7, 26),
          contents: [content]
        }
      ]
    )

    assert_equal 1, result.dig("by_type", "first_time_downloads")
    assert_equal 1, result.dig("by_type", "total_download_events")
  end

  def test_runner_creates_snapshot_when_no_request_exists
    client = FakeApiClient.new(
      "/v1/apps?" => [{ "id" => "app-id" }],
      "/v1/apps/app-id/analyticsReportRequests" => []
    )

    result = AppStoreDownloadReporter::Runner.new(
      api_client: client,
      segment_reader: FakeSegmentReader.new({}),
      create_if_missing: true
    ).call

    assert_equal "pending", result.fetch("status")
    assert_equal "report_request_created", result.fetch("reason")
    assert_equal "created-request", result.fetch("report_request_id")
    assert_equal 1, client.posted.length
    assert_equal "ONE_TIME_SNAPSHOT",
                 client.posted.dig(0, 1, "data", "attributes", "accessType")
  end

  def test_runner_reports_first_time_downloads
    content = <<~TSV
      Date\tApp Name\tApp Apple Identifier\tDownload Type\tCounts
      2026-07-24\tBookgolas\t6757021809\tFirst-time Download\t2
      2026-07-24\tBookgolas\t6757021809\tRedownload\t1
    TSV
    client = FakeApiClient.new(
      "/v1/apps?" => [{ "id" => "app-id" }],
      "/v1/apps/app-id/analyticsReportRequests" => [
        {
          "id" => "request-id",
          "attributes" => {
            "accessType" => "ONGOING",
            "stoppedDueToInactivity" => false
          }
        }
      ],
      "/v1/analyticsReportRequests/request-id/reports" => [
        {
          "id" => "report-id",
          "attributes" => {
            "name" => "App Store Downloads Standard",
            "category" => "COMMERCE"
          }
        }
      ],
      "/v1/analyticsReports/report-id/instances" => [
        {
          "id" => "instance-id",
          "attributes" => {
            "granularity" => "DAILY",
            "processingDate" => "2026-07-28"
          }
        }
      ],
      "/v1/analyticsReportInstances/instance-id/segments" => [
        {
          "id" => "segment-id",
          "attributes" => {}
        }
      ]
    )

    result = AppStoreDownloadReporter::Runner.new(
      api_client: client,
      segment_reader: FakeSegmentReader.new("segment-id" => content),
      create_if_missing: true
    ).call

    assert_equal "ready", result.fetch("status")
    assert_equal 2, result.dig("by_type", "first_time_downloads")
    assert_equal 1, result.dig("by_type", "redownloads")
    assert_equal "2026-07-26", result.fetch("complete_through")
  end
end
