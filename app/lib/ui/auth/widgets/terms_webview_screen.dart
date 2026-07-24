import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import 'package:book_golas/l10n/app_localizations.dart';
import 'package:book_golas/ui/core/theme/design_system.dart';

class TermsWebViewScreen extends StatefulWidget {
  final String title;
  final String? url;
  final String? htmlContent;

  const TermsWebViewScreen({
    super.key,
    required this.title,
    this.url,
    this.htmlContent,
  }) : assert(url != null || htmlContent != null,
            'Either url or htmlContent must be provided');

  @override
  State<TermsWebViewScreen> createState() => _TermsWebViewScreenState();
}

class _TermsWebViewScreenState extends State<TermsWebViewScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) {
            if (mounted) {
              setState(() {
                _isLoading = true;
                _hasError = false;
              });
            }
          },
          onPageFinished: (_) {
            if (mounted) {
              setState(() => _isLoading = false);
            }
          },
          onWebResourceError: (_) {
            if (mounted) {
              setState(() {
                _isLoading = false;
                _hasError = true;
              });
            }
          },
        ),
      );

    if (widget.htmlContent != null) {
      _controller.loadHtmlString(widget.htmlContent!);
    } else if (widget.url != null) {
      _controller.loadRequest(Uri.parse(widget.url!));
    } else {
      _isLoading = false;
      _hasError = true;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: isDark ? Colors.white : Colors.black,
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
      ),
      body: Column(
        children: [
          if (_isLoading)
            LinearProgressIndicator(
              color: BLabColors.primary,
              backgroundColor: isDark
                  ? Colors.white.withValues(alpha: 0.1)
                  : Colors.black.withValues(alpha: 0.05),
            ),
          Expanded(
            child: _hasError
                ? Center(
                    child: Text(
                      AppLocalizations.of(context).webviewLoadError,
                      style: TextStyle(
                        fontSize: 16,
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.5)
                            : Colors.black.withValues(alpha: 0.5),
                      ),
                    ),
                  )
                : WebViewWidget(controller: _controller),
          ),
        ],
      ),
    );
  }
}
