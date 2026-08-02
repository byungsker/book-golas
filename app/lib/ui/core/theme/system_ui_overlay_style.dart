import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

SystemUiOverlayStyle systemUiOverlayStyleForBrightness(Brightness brightness) {
  final isDark = brightness == Brightness.dark;

  return SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: isDark ? Brightness.light : Brightness.dark,
    statusBarBrightness: isDark ? Brightness.dark : Brightness.light,
  );
}

class ThemeAwareSystemUiOverlay extends StatefulWidget {
  final Brightness brightness;
  final Widget child;

  const ThemeAwareSystemUiOverlay({
    super.key,
    required this.brightness,
    required this.child,
  });

  @override
  State<ThemeAwareSystemUiOverlay> createState() =>
      _ThemeAwareSystemUiOverlayState();
}

class _ThemeAwareSystemUiOverlayState extends State<ThemeAwareSystemUiOverlay> {
  static const _platformChannel = MethodChannel('com.bookgolas.app/system_ui');

  SystemUiOverlayStyle get _overlayStyle =>
      systemUiOverlayStyleForBrightness(widget.brightness);

  void _applyOverlayStyle() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        SystemChrome.setSystemUIOverlayStyle(_overlayStyle);
        _platformChannel.invokeMethod<void>(
          'setStatusBarBrightness',
          widget.brightness == Brightness.dark,
        );
      }
    });
  }

  @override
  void initState() {
    super.initState();
    _applyOverlayStyle();
  }

  @override
  void didUpdateWidget(ThemeAwareSystemUiOverlay oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.brightness != widget.brightness) {
      _applyOverlayStyle();
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: _overlayStyle,
      child: widget.child,
    );
  }
}
