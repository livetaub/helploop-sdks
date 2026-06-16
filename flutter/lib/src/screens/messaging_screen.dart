import 'dart:async';
import 'dart:typed_data';

import 'package:flutter/material.dart';

import '../api/api_client.dart';
import '../models/conversation.dart';
import '../models/message.dart';
import '../models/project_settings.dart';
import '../supporthub.dart';
import '../theme/sdk_theme.dart';
import '../widgets/date_separator.dart';
import '../widgets/message_bubble.dart';
import '../widgets/reply_input.dart';
import 'conversation_list_screen.dart';

/// The primary messaging screen shown when the user opens SupportHub.
///
/// Displays the most recent conversation's messages, or a welcome
/// message if no conversations exist. Polls for new messages and
/// supports pagination via pull-to-refresh.
class MessagingScreen extends StatefulWidget {
  /// An optional conversation ID to open directly.
  final String? conversationId;

  /// Creates a [MessagingScreen].
  const MessagingScreen({super.key, this.conversationId});

  @override
  State<MessagingScreen> createState() => _MessagingScreenState();
}

class _MessagingScreenState extends State<MessagingScreen>
    with TickerProviderStateMixin {
  late final SupportHub _hub;
  late final ApiClient _api;

  SdkTheme _theme = SdkTheme.defaultTheme();
  ProjectSettings _settings = const ProjectSettings();

  List<SdkMessage> _messages = [];
  SdkConversation? _conversation;
  List<SdkConversation> _allConversations = [];

  bool _loading = true;
  bool _loadingMore = false;
  bool _hasMore = true;
  int _page = 1;

  Timer? _pollTimer;
  final ScrollController _scrollController = ScrollController();

  // Animation for new messages
  final GlobalKey<AnimatedListState> _listKey = GlobalKey<AnimatedListState>();
  bool _useAnimatedList = false;

  @override
  void initState() {
    super.initState();
    _hub = SupportHub.instance;
    _api = _hub.apiClient;
    _initScreen();
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _scrollController.dispose();
    super.dispose();
  }

  // ── Initialisation ────────────────────────────────────────────────

  Future<void> _initScreen() async {
    // Load settings and theme
    _settings = await SupportHub.loadSettings();
    final brightness = WidgetsBinding.instance.platformDispatcher.platformBrightness;
    _theme = SdkTheme.fromSettings(_settings, brightness: brightness);

    // Load conversations
    final userId = SupportHub.currentUser?.externalId;
    if (userId == null) {
      setState(() => _loading = false);
      return;
    }

    try {
      final convos = await _api.listConversations(userId);
      _allConversations = convos
          .map((c) => SdkConversation.fromJson(c as Map<String, dynamic>))
          .toList();

      // Sort by most recent
      _allConversations.sort((a, b) {
        final aDate = a.lastMessageAt ?? DateTime(2000);
        final bDate = b.lastMessageAt ?? DateTime(2000);
        return bDate.compareTo(aDate);
      });

      // Determine which conversation to open
      if (widget.conversationId != null) {
        _conversation = _allConversations.firstWhere(
          (c) => c.id == widget.conversationId,
          orElse: () => _allConversations.first,
        );
      } else if (_allConversations.isNotEmpty) {
        _conversation = _allConversations.first;
      }

      if (_conversation != null) {
        await _loadMessages();
        _markRead();
      }
    } catch (_) {
      // No conversations yet — show welcome.
    }

    setState(() {
      _loading = false;
      _useAnimatedList = true;
    });
    _startPolling();
  }

  // ── Messages ──────────────────────────────────────────────────────

  Future<void> _loadMessages() async {
    if (_conversation == null) return;

    try {
      final data = await _api.listMessages(
        _conversation!.id,
        page: 1,
        limit: 50,
      );

      _messages = data
          .map((m) => SdkMessage.fromJson(m as Map<String, dynamic>))
          .toList();

      // Sort oldest first (bottom = newest in reversed ListView)
      _messages.sort((a, b) => a.createdAt.compareTo(b.createdAt));
      _page = 1;
      _hasMore = data.length >= 50;
    } catch (_) {
      // Keep existing messages on error.
    }
  }

  Future<void> _loadOlderMessages() async {
    if (_conversation == null || _loadingMore || !_hasMore) return;

    setState(() => _loadingMore = true);

    try {
      final data = await _api.listMessages(
        _conversation!.id,
        page: _page + 1,
        limit: 50,
      );

      final older = data
          .map((m) => SdkMessage.fromJson(m as Map<String, dynamic>))
          .toList();

      if (older.isEmpty) {
        _hasMore = false;
      } else {
        _page++;
        final ids = _messages.map((m) => m.id).toSet();
        final newOnes = older.where((m) => !ids.contains(m.id)).toList();
        _messages.insertAll(0, newOnes);
        _messages.sort((a, b) => a.createdAt.compareTo(b.createdAt));
      }
    } catch (_) {
      // Silently handle.
    }

    setState(() => _loadingMore = false);
  }

  Future<void> _pollMessages() async {
    if (_conversation == null) return;

    try {
      final data = await _api.listMessages(
        _conversation!.id,
        page: 1,
        limit: 50,
      );

      final fetched = data
          .map((m) => SdkMessage.fromJson(m as Map<String, dynamic>))
          .toList();

      final existingIds = _messages.map((m) => m.id).toSet();
      final newMessages =
          fetched.where((m) => !existingIds.contains(m.id)).toList();

      if (newMessages.isNotEmpty) {
        setState(() {
          _messages.addAll(newMessages);
          _messages.sort((a, b) => a.createdAt.compareTo(b.createdAt));
        });
        _scrollToBottom();
        _markRead();
      }
    } catch (_) {
      // Ignore polling errors.
    }
  }

  void _markRead() {
    final userId = SupportHub.currentUser?.externalId;
    if (userId == null || _conversation == null) return;
    _api.markAsRead(_conversation!.id, userId).catchError((_) {});
  }

  // ── Sending ───────────────────────────────────────────────────────

  Future<void> _onSend(
    String text,
    Uint8List? imageBytes,
    String? imageName,
  ) async {
    final userId = SupportHub.currentUser?.externalId;
    if (userId == null) return;

    // Handle image upload first
    String? imageUrl;
    if (imageBytes != null) {
      try {
        final result = await _api.uploadAttachment(
          imageBytes,
          imageName ?? 'image.jpg',
          'image/jpeg',
        );
        imageUrl = result['url'] as String?;
      } catch (_) {
        // Failed to upload — send text only.
      }
    }

    // Build content
    final content = imageUrl != null && text.isEmpty
        ? imageUrl
        : text.isNotEmpty
            ? text
            : '';

    if (content.isEmpty && imageUrl == null) return;

    // Create conversation if first message
    if (_conversation == null) {
      try {
        final result = await _api.createConversation(userId, content);
        _conversation = SdkConversation.fromJson(result);
        await _loadMessages();
        setState(() {});
        _scrollToBottom();
        return;
      } catch (_) {
        return;
      }
    }

    // Send into existing conversation
    try {
      final result = await _api.sendMessage(
        _conversation!.id,
        userId,
        content,
        contentType: imageUrl != null ? 'image' : 'text',
      );

      final msg = SdkMessage.fromJson(result);
      setState(() => _messages.add(msg));
      _scrollToBottom();
    } catch (_) {
      // Show optimistic message
      final optimistic = SdkMessage(
        id: 'temp_${DateTime.now().millisecondsSinceEpoch}',
        content: content,
        senderType: 'user',
        senderId: userId,
        status: 'sent',
        createdAt: DateTime.now(),
      );
      setState(() => _messages.add(optimistic));
      _scrollToBottom();
    }
  }

  // ── Polling ───────────────────────────────────────────────────────

  void _startPolling() {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(_hub.config.pollInterval, (_) {
      _pollMessages();
    });
  }

  // ── Scroll ────────────────────────────────────────────────────────

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOutCubic,
        );
      }
    });
  }

  // ── Navigation ────────────────────────────────────────────────────

  void _openConversationList() {
    Navigator.of(context).push(
      MaterialPageRoute<String>(
        builder: (_) => ConversationListScreen(
          conversations: _allConversations,
          theme: _theme,
          settings: _settings,
        ),
      ),
    ).then((selectedId) {
      if (selectedId != null && selectedId != _conversation?.id) {
        setState(() {
          _conversation = _allConversations.firstWhere(
            (c) => c.id == selectedId,
          );
          _messages = [];
          _loading = true;
        });
        _loadMessages().then((_) {
          setState(() => _loading = false);
          _scrollToBottom();
          _markRead();
        });
      }
    });
  }

  // ── Build ─────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: _theme.toThemeData(),
      child: Scaffold(
        backgroundColor: _theme.backgroundColor,
        appBar: _buildAppBar(),
        body: _loading ? _buildLoading() : _buildBody(),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      title: Text(
        _settings.widgetTitle,
        style: const TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w600,
        ),
      ),
      centerTitle: false,
      actions: [
        if (_allConversations.length > 1)
          IconButton(
            icon: const Icon(Icons.list_rounded),
            tooltip: 'All conversations',
            onPressed: _openConversationList,
          ),
      ],
    );
  }

  Widget _buildLoading() {
    return Center(
      child: CircularProgressIndicator(
        color: _theme.primaryColor,
        strokeWidth: 2.5,
      ),
    );
  }

  Widget _buildBody() {
    return Column(
      children: [
        // Messages
        Expanded(
          child: _messages.isEmpty && _conversation == null
              ? _buildWelcome()
              : _buildMessageList(),
        ),

        // Reply input
        ReplyInput(
          theme: _theme,
          onSend: _onSend,
          disabled: _conversation != null && !_conversation!.isOpen,
        ),
      ],
    );
  }

  // ── Welcome ───────────────────────────────────────────────────────

  Widget _buildWelcome() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const SizedBox(height: 48),
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: _theme.primaryColor.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.support_agent_rounded,
              size: 40,
              color: _theme.primaryColor,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            _settings.widgetTitle,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w700,
              color: _theme.textColor,
            ),
          ),
          if (_settings.welcomeMessage != null) ...[
            const SizedBox(height: 12),
            Text(
              _settings.welcomeMessage!,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                color: _theme.mutedTextColor,
                height: 1.5,
              ),
            ),
          ],
          const SizedBox(height: 32),
          Text(
            'Send us a message below to get started.',
            style: TextStyle(
              fontSize: 14,
              color: _theme.mutedTextColor.withValues(alpha: 0.7),
            ),
          ),
        ],
      ),
    );
  }

  // ── Message List ──────────────────────────────────────────────────

  Widget _buildMessageList() {
    // Build items with date separators interleaved
    final items = _buildItemList();

    return RefreshIndicator(
      onRefresh: _loadOlderMessages,
      color: _theme.primaryColor,
      child: ListView.builder(
        controller: _scrollController,
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: items.length,
        itemBuilder: (context, index) {
          final item = items[index];
          if (item is DateTime) {
            return DateSeparator(date: item, theme: _theme);
          }

          final message = item as SdkMessage;
          return _MessageEntry(
            key: ValueKey(message.id),
            child: MessageBubble(
              message: message,
              theme: _theme,
              showReadIndicators: _settings.showReadIndicators,
            ),
          );
        },
      ),
    );
  }

  /// Interleaves messages with [DateTime] objects for date separators.
  List<Object> _buildItemList() {
    final items = <Object>[];

    DateTime? lastDate;
    for (final msg in _messages) {
      final msgDate = DateTime(
        msg.createdAt.year,
        msg.createdAt.month,
        msg.createdAt.day,
      );

      if (lastDate == null || msgDate != lastDate) {
        items.add(msgDate);
        lastDate = msgDate;
      }
      items.add(msg);
    }
    return items;
  }
}

/// Wraps each message in a subtle slide-up animation on first build.
class _MessageEntry extends StatefulWidget {
  final Widget child;

  const _MessageEntry({super.key, required this.child});

  @override
  State<_MessageEntry> createState() => _MessageEntryState();
}

class _MessageEntryState extends State<_MessageEntry>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<Offset> _slideAnimation;
  late final Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.15),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutCubic,
    ));
    _fadeAnimation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeIn,
    );
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SlideTransition(
      position: _slideAnimation,
      child: FadeTransition(
        opacity: _fadeAnimation,
        child: widget.child,
      ),
    );
  }
}
