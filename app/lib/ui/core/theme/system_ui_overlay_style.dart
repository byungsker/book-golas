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
