import React, { useState } from 'react';
import {
  View,
  Image,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import type { SupportHubTheme } from '../models/types';

interface AttachmentPreviewProps {
  /** The image URL to display */
  url: string;
  /** Callback when the image is tapped (opens fullscreen by default) */
  onPress?: () => void;
  /** Theme object for styling */
  theme: SupportHubTheme;
}

/**
 * Displays an image attachment with loading spinner, error state,
 * and fullscreen modal on tap.
 */
export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({
  url,
  onPress,
  theme,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      setIsFullscreen(true);
    }
  };

  const handleCloseFullscreen = () => {
    setIsFullscreen(false);
  };

  // Error placeholder
  if (hasError) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.surfaceColor }]}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={[styles.errorText, { color: theme.mutedTextColor }]}>
          Failed to load image
        </Text>
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handlePress}
        style={styles.touchable}
      >
        <View style={styles.imageWrapper}>
          {isLoading ? (
            <View style={[styles.loadingOverlay, { backgroundColor: theme.surfaceColor }]}>
              <ActivityIndicator size="small" color={theme.primaryColor} />
            </View>
          ) : null}
          <Image
            source={{ uri: url }}
            style={styles.image}
            resizeMode="cover"
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />
        </View>
      </TouchableOpacity>

      {/* Fullscreen Modal */}
      <Modal
        visible={isFullscreen}
        transparent={false}
        animationType="fade"
        onRequestClose={handleCloseFullscreen}
      >
        <SafeAreaView style={styles.fullscreenContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleCloseFullscreen}
            activeOpacity={0.7}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Image
            source={{ uri: url }}
            style={styles.fullscreenImage}
            resizeMode="contain"
          />
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  touchable: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageWrapper: {
    position: 'relative',
    width: '70%',
    maxHeight: 200,
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    borderRadius: 12,
  },
  errorContainer: {
    width: '70%',
    height: 120,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  errorText: {
    fontSize: 12,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
});
