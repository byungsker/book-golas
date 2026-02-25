import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:book_golas/domain/models/note_structure_models.dart';

class NoteStructureService {
  static final NoteStructureService _instance =
      NoteStructureService._internal();

  factory NoteStructureService({SupabaseClient? supabaseClient}) {
    if (supabaseClient != null) {
      _instance._supabase = supabaseClient;
    }
    return _instance;
  }

  NoteStructureService._internal();

  late SupabaseClient _supabase = Supabase.instance.client;

  /// Call Edge Function to generate note structure
  /// Returns null on error or timeout
  Future<NoteStructure?> structureNotes(String bookId) async {
    try {
      debugPrint('🧠 Structuring notes for book: $bookId');

      // Debug: Check user session and JWT token
      final user = Supabase.instance.client.auth.currentUser;
      final session = Supabase.instance.client.auth.currentSession;
      debugPrint('👤 Current user: ${user?.id}');
      debugPrint('🔑 Session exists: ${session != null}');
      if (session?.accessToken != null && session!.accessToken.length >= 20) {
        debugPrint(
            '🎫 JWT token (first 20): ${session.accessToken.substring(0, 20)}');
      } else {
        debugPrint('🎫 JWT token: NOT AVAILABLE');
      }

      final response = await _supabase.functions.invoke(
        'structure-notes',
        body: {'bookId': bookId},
      ).timeout(const Duration(seconds: 60));

      debugPrint('🧠 Structure response status: ${response.status}');

      if (response.status != 200) {
        debugPrint(
            '🔴 Structure failed: ${response.status} - ${response.data}');
        return null;
      }

      final data = response.data as Map<String, dynamic>;
      return NoteStructure.fromJson(data);
    } on TimeoutException catch (e) {
      debugPrint('🔴 Structure timeout: $e');
      return null;
    } catch (e, stackTrace) {
      debugPrint('🔴 Structure error: $e');
      debugPrint('🔴 Stack trace: $stackTrace');
      return null;
    }
  }

  /// Query saved structure from database
  /// Returns null if not found or on error
  Future<NoteStructure?> getStructure(String bookId) async {
    try {
      debugPrint('📖 Fetching structure for book: $bookId');

      final response = await _supabase
          .from('note_structures')
          .select()
          .eq('book_id', bookId)
          .maybeSingle();

      if (response == null) {
        debugPrint('📖 No structure found for book: $bookId');
        return null;
      }

      final structureJson = response['structure_json'] as Map<String, dynamic>;
      return NoteStructure.fromJson(structureJson);
    } catch (e, stackTrace) {
      debugPrint('🔴 Failed to get structure: $e');
      debugPrint('🔴 Stack trace: $stackTrace');
      return null;
    }
  }
}
