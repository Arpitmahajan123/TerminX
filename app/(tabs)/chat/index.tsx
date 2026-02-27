import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MessageCircle,
  Send,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Bot,
  Keyboard,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useLanguage } from '@/hooks/useLanguage';
import { useUserLocation } from '@/hooks/useLocation';
import {
  startRecording,
  stopRecording,
  transcribeAudio,
  speakText,
  stopSpeaking,
  generateId,
  ChatMessage,
} from '@/services/chatbotService';
import {
  chatWithGrok,
  gatherAppContext,
  GrokMessage,
  AppContext,
} from '@/services/grokService';

// ─── Voice Pulse Animation ─────────────────────────────
function VoicePulse({ isActive }: { isActive: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (isActive) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(scale, { toValue: 1.6, duration: 800, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 800, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.4, duration: 0, useNativeDriver: true }),
          ]),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      scale.setValue(1);
      opacity.setValue(0);
    }
  }, [isActive]);

  return (
    <Animated.View
      style={[
        styles.pulse,
        { transform: [{ scale }], opacity },
      ]}
    />
  );
}

// ─── Main Chat Screen ──────────────────────────────────
export default function ChatScreen() {
  const { t, language } = useLanguage();
  const isHindi = language === 'hi';
  const { location: userLoc } = useUserLocation();

  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecordingState, setIsRecordingState] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [appContext, setAppContext] = useState<AppContext | null>(null);
  const conversationRef = useRef<GrokMessage[]>([]);

  // Welcome message
  useEffect(() => {
    const welcomeMsg: ChatMessage = {
      id: generateId(),
      role: 'bot',
      text: isHindi
        ? '🙏 नमस्ते! मैं एग्रीचेन AI हूं — आपका खेती सहायक।\n\n🎤 बोलने के लिए माइक बटन दबाकर रखें\n⌨️ या टाइप करने के लिए कीबोर्ड बटन दबाएं\n\nमुझसे मौसम, मंडी भाव, फसल सलाह, सरकारी योजनाएं — कुछ भी पूछें!'
        : '🙏 Namaste! I\'m AgriChain AI — your farming assistant.\n\n🎤 Hold the mic button to speak\n⌨️ Or tap keyboard to type\n\nAsk me about weather, market prices, crop advice, schemes — anything!',
      timestamp: new Date(),
    };
    setMessages([welcomeMsg]);
  }, [isHindi]);

  // Gather fresh context on mount and every 5 minutes
  useEffect(() => {
    const fetchContext = async () => {
      try {
        const ctx = await gatherAppContext(userLoc.lat, userLoc.lon, userLoc.displayName);
        setAppContext(ctx);
      } catch (e) {
        console.warn('Failed to gather context:', e);
      }
    };
    fetchContext();
    const interval = setInterval(fetchContext, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userLoc.lat, userLoc.lon, userLoc.displayName]);

  // ─── Send message (text or voice) ───────────────────
  const sendMessage = useCallback(
    async (text: string, isVoice = false) => {
      const trimmed = text.trim();
      if (!trimmed || isProcessing) return;

      // Add user message
      const userMsg: ChatMessage = {
        id: generateId(),
        role: 'user',
        text: trimmed,
        timestamp: new Date(),
        isVoice,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInputText('');
      setIsProcessing(true);

      // Get response from Grok
      try {
        // Refresh context if stale
        let ctx = appContext;
        if (!ctx) {
          ctx = await gatherAppContext(userLoc.lat, userLoc.lon, userLoc.displayName);
          setAppContext(ctx);
        }

        const response = await chatWithGrok(
          trimmed,
          conversationRef.current,
          ctx,
          isHindi,
        );

        // Update conversation history
        conversationRef.current.push(
          { role: 'user', content: trimmed },
          { role: 'assistant', content: response },
        );
        // Keep last 20 messages
        if (conversationRef.current.length > 20) {
          conversationRef.current = conversationRef.current.slice(-20);
        }

        const botMsg: ChatMessage = {
          id: generateId(),
          role: 'bot',
          text: response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMsg]);

        // Auto-speak if enabled (especially for voice input)
        if (autoSpeak || isVoice) {
          handleSpeak(botMsg.id, response);
        }
      } catch (error) {
        const errMsg: ChatMessage = {
          id: generateId(),
          role: 'bot',
          text: isHindi
            ? '⚠️ कनेक्शन में समस्या है। कृपया फिर से कोशिश करें।'
            : '⚠️ Connection error. Please try again.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setIsProcessing(false);
      }
    },
    [isHindi, appContext, userLoc, isProcessing, autoSpeak],
  );

  // ─── Voice Recording ────────────────────────────────
  const handleRecordStart = async () => {
    Vibration.vibrate(50);
    const started = await startRecording();
    if (started) {
      setIsRecordingState(true);
    }
  };

  const handleRecordStop = async () => {
    if (!isRecordingState) return;
    Vibration.vibrate(50);
    setIsRecordingState(false);
    setIsProcessing(true);

    const audioUri = await stopRecording();
    if (!audioUri) {
      setIsProcessing(false);
      return;
    }

    // Try to transcribe
    const transcription = await transcribeAudio(audioUri);
    if (transcription) {
      // Got transcription — send as voice message
      sendMessage(transcription, true);
    } else {
      // Transcription not available — show fallback
      setIsProcessing(false);
      const fallbackMsg: ChatMessage = {
        id: generateId(),
        role: 'bot',
        text: isHindi
          ? '🎤 वॉइस ट्रांसक्रिप्शन अभी उपलब्ध नहीं है। कृपया कीबोर्ड से टाइप करें — मैं हिंदी और अंग्रेजी दोनों में जवाब दे सकता हूं!'
          : '🎤 Voice transcription is not available yet. Please type your question — I can answer in both Hindi and English!',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
      setShowKeyboard(true);
    }
  };

  // ─── TTS ─────────────────────────────────────────────
  const handleSpeak = async (msgId: string, text: string) => {
    if (speakingId === msgId) {
      stopSpeaking();
      setSpeakingId(null);
      return;
    }
    stopSpeaking();
    setSpeakingId(msgId);
    await speakText(text, isHindi);
    setSpeakingId(null);
  };

  // ─── Render Message ──────────────────────────────────
  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isBot = item.role === 'bot';
    const speaking = speakingId === item.id;

    return (
      <View style={[styles.messageRow, isBot ? styles.botRow : styles.userRow]}>
        {isBot && (
          <View style={styles.avatar}>
            <Bot size={16} color={Colors.white} />
          </View>
        )}
        <View style={[styles.bubble, isBot ? styles.botBubble : styles.userBubble]}>
          <Text style={[styles.messageText, isBot ? styles.botText : styles.userText]}>
            {item.text}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[styles.timestamp, isBot ? styles.botTimestamp : styles.userTimestamp]}>
              {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {item.isVoice ? ' 🎤' : ''}
            </Text>
            {isBot && (
              <TouchableOpacity
                onPress={() => handleSpeak(item.id, item.text)}
                style={[styles.speakerBtn, speaking && styles.speakerBtnActive]}
              >
                {speaking ? (
                  <VolumeX size={16} color={Colors.white} />
                ) : (
                  <Volume2 size={16} color={Colors.primary} />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Bot size={22} color={Colors.white} />
          </View>
          <View>
            <Text style={styles.headerTitle}>
              {isHindi ? 'एग्रीचेन AI' : 'AgriChain AI'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isHindi ? 'स्मार्ट AI कृषि सहायक • वॉइस + टेक्स्ट' : 'Smart AI Farm Assistant • Voice + Text'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => setAutoSpeak(!autoSpeak)}
          style={[styles.autoSpeakBtn, autoSpeak && styles.autoSpeakBtnActive]}
        >
          {autoSpeak ? (
            <Volume2 size={16} color={Colors.white} />
          ) : (
            <VolumeX size={16} color={Colors.textMuted} />
          )}
          <Text style={[styles.autoSpeakText, autoSpeak && styles.autoSpeakTextActive]}>
            {isHindi ? 'आवाज़' : 'Auto'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        data={[...messages].reverse()}
        inverted
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
      />

      {/* Processing Indicator */}
      {isProcessing && (
        <View style={styles.processingBar}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.processingText}>
            {isRecordingState
              ? (isHindi ? '🎤 सुन रहा हूं...' : '🎤 Listening...')
              : (isHindi ? '🤔 सोच रहा हूं...' : '🤔 Thinking...')}
          </Text>
        </View>
      )}

      {/* Quick Chips (only on start) */}
      {messages.length <= 1 && !isProcessing && (
        <View style={styles.quickActions}>
          <Text style={styles.quickTitle}>
            {isHindi ? '💡 यह पूछें:' : '💡 Try asking:'}
          </Text>
          <View style={styles.chipRow}>
            {(isHindi
              ? ['आज मौसम कैसा है?', 'टमाटर कब बेचूं?', 'सबसे अच्छी मंडी कौन सी है?', 'PM किसान योजना बताओ', 'फसल कब काटें?']
              : ['How is today\'s weather?', 'When to sell tomato?', 'Which mandi is best?', 'Tell me about PM Kisan', 'When to harvest?']
            ).map((chip) => (
              <TouchableOpacity
                key={chip}
                style={styles.chip}
                onPress={() => sendMessage(chip)}
              >
                <Text style={styles.chipText}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {showKeyboard ? (
          /* ── Text Input Mode ── */
          <View style={styles.inputBar}>
            <TouchableOpacity
              onPress={() => setShowKeyboard(false)}
              style={styles.modeSwitchBtn}
            >
              <Mic size={22} color={Colors.primary} />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder={isHindi ? 'हिंदी या अंग्रेजी में टाइप करें...' : 'Type in Hindi or English...'}
              placeholderTextColor={Colors.textMuted}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={() => sendMessage(inputText)}
            />
            <TouchableOpacity
              onPress={() => sendMessage(inputText)}
              style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
              disabled={!inputText.trim() || isProcessing}
            >
              <Send size={20} color={inputText.trim() ? Colors.white : Colors.textMuted} />
            </TouchableOpacity>
          </View>
        ) : (
          /* ── Voice Input Mode ── */
          <View style={styles.voiceBar}>
            <TouchableOpacity
              onPress={() => setShowKeyboard(true)}
              style={styles.keyboardBtn}
            >
              <Keyboard size={22} color={Colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.micContainer}>
              <VoicePulse isActive={isRecordingState} />
              <TouchableOpacity
                onPressIn={handleRecordStart}
                onPressOut={handleRecordStop}
                style={[
                  styles.micBtn,
                  isRecordingState && styles.micBtnActive,
                  isProcessing && styles.micBtnDisabled,
                ]}
                disabled={isProcessing}
                activeOpacity={0.7}
              >
                {isRecordingState ? (
                  <MicOff size={32} color={Colors.white} />
                ) : (
                  <Mic size={32} color={Colors.white} />
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.voiceHint}>
              {isRecordingState
                ? (isHindi ? 'छोड़ें...' : 'Release...')
                : isProcessing
                  ? (isHindi ? 'रुकें...' : 'Wait...')
                  : (isHindi ? 'दबाकर बोलें' : 'Hold to talk')
              }
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  autoSpeakBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  autoSpeakBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  autoSpeakText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  autoSpeakTextActive: {
    color: Colors.white,
  },
  messageList: {
    padding: 12,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-end',
  },
  botRow: {
    justifyContent: 'flex-start',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
  },
  botBubble: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  botText: {
    color: Colors.text,
  },
  userText: {
    color: Colors.white,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  timestamp: {
    fontSize: 10,
  },
  botTimestamp: {
    color: Colors.textMuted,
  },
  userTimestamp: {
    color: 'rgba(255,255,255,0.7)',
  },
  speakerBtn: {
    padding: 5,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
  },
  speakerBtnActive: {
    backgroundColor: Colors.primary,
  },
  processingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    marginHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 4,
  },
  processingText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  quickActions: {
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  quickTitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 6,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  // ── Text input mode ──
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    gap: 8,
  },
  modeSwitchBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 100,
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.cardBorder,
  },
  // ── Voice input mode ──
  voiceBar: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 16 : 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  keyboardBtn: {
    position: 'absolute',
    top: 16,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  micContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    height: 100,
  },
  pulse: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EF4444',
  },
  micBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  micBtnActive: {
    backgroundColor: '#EF4444',
  },
  micBtnDisabled: {
    backgroundColor: Colors.textMuted,
    opacity: 0.7,
  },
  voiceHint: {
    marginTop: 8,
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
  },
});
