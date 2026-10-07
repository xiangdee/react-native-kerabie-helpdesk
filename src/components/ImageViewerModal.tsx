import React from 'react';
import { Dimensions, Image, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  uri: string | null;
  onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Minimal fullscreen tap-to-view — no image-viewer dependency needed just
// for "tap a chat photo to see it bigger", which is all this SDK needs.
export function ImageViewerModal({ uri, onClose }: Props) {
  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.imageWrap} activeOpacity={1} onPress={onClose}>
          {uri && (
            <Image
              source={{ uri }}
              // Explicit pixel dimensions (not '100%'/'100%') — attachments
              // can be up to 25MB straight off a phone camera, and without a
              // concrete target size up front, Android's image decoder can't
              // downsample during decode, so it decodes the full-resolution
              // bitmap into memory — an OOM crash that closes the whole app
              // (native, not a catchable JS error, hence no red screen).
              style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
              resizeMode="contain"
              // Android-only: forces the native pipeline to decode-and-resize
              // aggressively instead of holding the full bitmap in memory.
              resizeMethod={Platform.OS === 'android' ? 'resize' : undefined}
            />
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  imageWrap: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  closeBtn: {
    position: 'absolute', top: 48, right: 20, zIndex: 1,
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  closeText: { color: '#fff', fontSize: 16 },
});
