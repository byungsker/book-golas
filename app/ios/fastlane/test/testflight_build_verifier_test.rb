require "minitest/autorun"

require_relative "../lib/testflight_build_verifier"

class TestFlightBuildVerifierTest < Minitest::Test
  Build = Struct.new(:version, :app_version, :platform, :processing_state)

  def test_returns_exact_valid_build
    build = build_with("VALID")
    verifier = verifier_for(fetches: [[build]])

    assert_same build, verifier.wait!
  end

  def test_waits_from_processing_to_valid
    processing = build_with("PROCESSING")
    valid = build_with("VALID")
    verifier, sleeps = verifier_for(fetches: [[processing], [valid]], track_sleeps: true)

    assert_same valid, verifier.wait!
    assert_equal [5], sleeps
  end

  def test_rejects_failed_and_invalid_states
    %w[FAILED INVALID].each do |state|
      error = assert_raises(TestFlightBuildVerifier::VerificationError) do
        verifier_for(fetches: [[build_with(state)]]).wait!
      end

      assert_includes error.message, state
    end
  end

  def test_rejects_unknown_state
    error = assert_raises(TestFlightBuildVerifier::VerificationError) do
      verifier_for(fetches: [[build_with("UNKNOWN")]]).wait!
    end

    assert_includes error.message, "Unknown"
  end

  def test_ignores_non_matching_builds_until_exact_build_appears
    wrong_build = Build.new("29500", "1.0.2", "IOS", "VALID")
    valid = build_with("VALID")
    verifier, sleeps = verifier_for(
      fetches: [[wrong_build], [valid]],
      track_sleeps: true
    )

    assert_same valid, verifier.wait!
    assert_equal [5], sleeps
  end

  def test_times_out_when_build_never_appears
    verifier = verifier_for(fetches: [[], [], []], timeout: 10)

    error = assert_raises(TestFlightBuildVerifier::VerificationError) do
      verifier.wait!
    end

    assert_includes error.message, "Timed out"
  end

  def test_validates_inputs
    assert_raises(ArgumentError) do
      verifier_for(fetches: [[]], version: "1.0")
    end
    assert_raises(ArgumentError) do
      verifier_for(fetches: [[]], build_number: "build-1")
    end
    assert_raises(ArgumentError) do
      verifier_for(fetches: [[]], timeout: 0)
    end
  end

  def test_testflight_workflow_targets_dev_app
    repository_root = File.expand_path("../../../..", __dir__)
    workflow = File.read(
      File.join(repository_root, ".github/workflows/ios-testflight.yml")
    )
    identifiers = workflow.scan(
      /TESTFLIGHT_APP_IDENTIFIER:\s+(\S+)/
    ).flatten

    assert_equal %w[com.bookgolas.app.dev com.bookgolas.app.dev], identifiers
  end

  private

  def build_with(state)
    Build.new("29501", "1.0.2", "IOS", state)
  end

  def verifier_for(
    fetches:,
    version: "1.0.2",
    build_number: "29501",
    timeout: 20,
    track_sleeps: false
  )
    queue = fetches.dup
    current = 0
    sleeps = []
    fetcher = -> { queue.length > 1 ? queue.shift : queue.first }
    clock = -> { current }
    sleeper = lambda do |seconds|
      sleeps << seconds if track_sleeps
      current += seconds
    end
    verifier = TestFlightBuildVerifier.new(
      fetch_builds: fetcher,
      expected_version: version,
      expected_build_number: build_number,
      timeout_seconds: timeout,
      poll_interval_seconds: 5,
      clock: clock,
      sleeper: sleeper,
      output: ->(_message) {}
    )

    track_sleeps ? [verifier, sleeps] : verifier
  end
end
