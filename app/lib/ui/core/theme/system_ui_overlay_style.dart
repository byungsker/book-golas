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

class ThemeAwareSystemUiOverlay extends StatelessWidget {
  final Brightness brightness;
  final Widget child;

  const ThemeAwareSystemUiOverlay({
    super.key,
    required this.brightness,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: systemUiOverlayStyleForBrightness(brightness),
      child: child,
    );
  }
}
