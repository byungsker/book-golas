# App Store Download Metrics

Bookgolas download counts are retrieved through Apple Analytics Reports rather
than copied from the App Store Connect dashboard.

## Local tools

Apple Reporter 2.2 is installed at:

```text
~/.local/share/apple-reporter/2.2/Reporter.jar
```

The `apple-reporter` command uses:

```text
~/.config/apple-reporter/Reporter.properties
```

The properties file must remain mode `0600`. Its `AccessToken` value is a
credential and must never be added to the repository or command output.

Verify the installation:

```bash
apple-reporter
```

Reporter access tokens expire after 180 days. Generate and store a token only
when the legacy Sales and Trends report path is needed.

## GitHub Actions

Run the `iOS TestFlight Deploy` workflow with:

```text
operation: report-downloads
ref: version/mobile/1.0.2
```

The job reuses these existing GitHub Secrets:

```text
APP_STORE_CONNECT_API_KEY_ID
APP_STORE_CONNECT_ISSUER_ID
APP_STORE_CONNECT_API_KEY_BASE64
```

The key must have an App Store Connect role that can access Analytics Reports.
An Admin key can create the first report request. Sales and Reports or Finance
keys can download reports after an Admin has created the request.

If no request exists, the first run creates a one-time snapshot request. Apple
normally generates the report in 24–48 hours, so run the same operation again
after the report is ready.

The result distinguishes:

- `first_time_downloads`
- `redownloads`
- `manual_updates`
- `auto_updates`
- `restores`
- `total_download_events`

Instances with a later processing date replace earlier data for the same event
date. This prevents corrected partitions from being counted twice. Daily
download data is complete within two days, and the output includes
`complete_through`.

## Rollback

Remove the `report-downloads` operation and the reporter files to disable the
GitHub automation. Remove the local command, configuration, and Reporter JAR to
uninstall the local tool:

```bash
rm ~/.local/bin/apple-reporter
rm ~/.config/apple-reporter/Reporter.properties
rm ~/.local/share/apple-reporter/2.2/Reporter.jar
```
