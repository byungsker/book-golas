class TestFlightBuildVerifier
  class VerificationError < StandardError
  end

  TERMINAL_FAILURE_STATES = %w[FAILED INVALID].freeze
  SUCCESS_STATE = "VALID"
  PROCESSING_STATE = "PROCESSING"

  def initialize(
    fetch_builds:,
    expected_version:,
    expected_build_number:,
    timeout_seconds:,
    poll_interval_seconds:,
    clock: -> { Process.clock_gettime(Process::CLOCK_MONOTONIC) },
    sleeper: ->(seconds) { sleep(seconds) },
    output: ->(message) { puts(message) }
  )
    @fetch_builds = fetch_builds
    @expected_version = expected_version.to_s
    @expected_build_number = expected_build_number.to_s
    @timeout_seconds = Integer(timeout_seconds)
    @poll_interval_seconds = Integer(poll_interval_seconds)
    @clock = clock
    @sleeper = sleeper
    @output = output

    validate_inputs!
  end

  def wait!
    deadline = @clock.call + @timeout_seconds

    loop do
      build = matching_build(Array(@fetch_builds.call))

      if build
        state = build.processing_state.to_s.upcase
        @output.call(
          "App Store Connect build #{@expected_version} " \
          "(#{@expected_build_number}): #{state}"
        )

        return build if state == SUCCESS_STATE

        if TERMINAL_FAILURE_STATES.include?(state)
          raise VerificationError,
                "App Store Connect processing ended with #{state} for " \
                "#{@expected_version} (#{@expected_build_number})"
        end

        unless state == PROCESSING_STATE
          raise VerificationError,
                "Unknown App Store Connect processing state #{state.inspect}"
        end
      else
        @output.call(
          "App Store Connect build #{@expected_version} " \
          "(#{@expected_build_number}): NOT_FOUND"
        )
      end

      remaining = deadline - @clock.call
      if remaining <= 0
        raise VerificationError,
              "Timed out waiting for App Store Connect build " \
              "#{@expected_version} (#{@expected_build_number})"
      end

      @sleeper.call([@poll_interval_seconds, remaining].min)
    end
  end

  private

  def matching_build(builds)
    builds.find do |build|
      build.version.to_s == @expected_build_number &&
        build.app_version.to_s == @expected_version &&
        build.platform.to_s.upcase == "IOS"
    end
  end

  def validate_inputs!
    unless @expected_version.match?(/\A\d+\.\d+\.\d+\z/)
      raise ArgumentError, "Expected version must be a semantic version"
    end

    unless @expected_build_number.match?(/\A\d+\z/)
      raise ArgumentError, "Expected build number must contain only digits"
    end

    raise ArgumentError, "Timeout must be positive" unless @timeout_seconds.positive?
    unless @poll_interval_seconds.positive?
      raise ArgumentError, "Poll interval must be positive"
    end
  end
end
