/**
 * CaptureScreen — design concept screen 3 (docs/DESIGN.md §5/§6).
 * Dark full-bleed pre-capture home: corner-bracket viewfinder, "Fill the frame
 * with your plate" hint, 82px shutter (system camera via react-native-image-picker),
 * "Library" glass chip. Camera-permission denial shows an explanatory state;
 * the gallery path keeps working regardless. "Type it" is a P4.4 feature — omitted.
 */
import React, { useCallback, useState } from 'react';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  launchCamera,
  launchImageLibrary,
  type ImagePickerResponse,
} from 'react-native-image-picker';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { Notice } from '../components/Notice';
import { colors, glass, radii, spacing, type } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Capture'>;

const BRACKET = 40;
const BRACKET_STROKE = 3;

function ViewfinderCorners() {
  const corner = [styles.corner, { width: BRACKET, height: BRACKET }];
  return (
    <>
      <View
        style={[
          ...corner,
          styles.cornerTL,
          { borderTopWidth: BRACKET_STROKE, borderLeftWidth: BRACKET_STROKE },
        ]}
      />
      <View
        style={[
          ...corner,
          styles.cornerTR,
          { borderTopWidth: BRACKET_STROKE, borderRightWidth: BRACKET_STROKE },
        ]}
      />
      <View
        style={[
          ...corner,
          styles.cornerBL,
          { borderBottomWidth: BRACKET_STROKE, borderLeftWidth: BRACKET_STROKE },
        ]}
      />
      <View
        style={[
          ...corner,
          styles.cornerBR,
          { borderBottomWidth: BRACKET_STROKE, borderRightWidth: BRACKET_STROKE },
        ]}
      />
    </>
  );
}

export function CaptureScreen() {
  const navigation = useNavigation<Nav>();
  // A screen presented as a native modal gets its own container, and the
  // provider reports zero insets for it — which is how the close button ended
  // up level with the status bar clock. `initialWindowMetrics` is a static
  // snapshot of the *window's* insets, which is exactly right here because this
  // modal covers the whole window.
  const insets = useSafeAreaInsets();
  const fallback = initialWindowMetrics?.insets;
  const topInset = Math.max(insets.top, fallback?.top ?? 0);
  const bottomInset = Math.max(insets.bottom, fallback?.bottom ?? 0);
  const [cameraDenied, setCameraDenied] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  const handleResponse = useCallback(
    (response: ImagePickerResponse, fromCamera: boolean) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        if (response.errorCode === 'permission' && fromCamera) {
          // Graceful denial: explain, keep the gallery path available.
          setCameraDenied(true);
          return;
        }
        setPickerError(response.errorMessage ?? 'Something went wrong opening the picker.');
        return;
      }
      const uri = response.assets?.[0]?.uri;
      if (uri) {
        setPickerError(null);
        navigation.navigate('Results', { imageUri: uri });
      }
    },
    [navigation],
  );

  const onShutter = useCallback(() => {
    launchCamera(
      { mediaType: 'photo', quality: 0.9, saveToPhotos: false },
      (response) => handleResponse(response, true),
    );
  }, [handleResponse]);

  const onLibrary = useCallback(() => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.9, selectionLimit: 1 }, (response) =>
      handleResponse(response, false),
    );
  }, [handleResponse]);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg.deep} />
      <View style={[styles.safe, { paddingTop: topInset, paddingBottom: bottomInset }]}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={[styles.closeButton, glass.chip]}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Close the camera"
          >
            <Text style={styles.closeGlyph}>×</Text>
          </TouchableOpacity>
          <Text style={styles.brandMicro}>FOODSNAP</Text>
          {/* Balances the close button so the wordmark stays centred. */}
          <View style={styles.closeButton} />
        </View>

        <View style={styles.finderArea}>
          <View style={styles.finder}>
            <ViewfinderCorners />
          </View>
          <Text style={styles.hint}>Fill the frame with your plate</Text>
          {cameraDenied && (
            <Notice
              tone={colors.status.danger}
              title="Camera access is off"
              body="FoodSnap needs the camera to snap your plate. You can enable it in system settings — or pick a photo from your library instead."
            />
          )}
          {pickerError && !cameraDenied && (
            <Notice
              tone={colors.status.danger}
              title="Couldn’t open the picker"
              body={pickerError}
            />
          )}
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.libraryChip, glass.chip]}
            onPress={onLibrary}
            accessibilityRole="button"
            accessibilityLabel="Pick a photo from your library"
          >
            <Text style={styles.libraryChipText}>Library</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shutterRing}
            onPress={onShutter}
            accessibilityRole="button"
            accessibilityLabel="Snap a photo of your food"
          >
            <View style={styles.shutter} />
          </TouchableOpacity>

          {/* Balances the Library chip so the shutter stays centered. */}
          <View style={styles.libraryChipGhost} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.deep },
  safe: { flex: 1, paddingHorizontal: spacing.gutter },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  brandMicro: { ...type.microLabel, color: colors.text.tertiary },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: radii.circle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeGlyph: { fontSize: 22, lineHeight: 24, color: colors.text.primary },
  finderArea: { flex: 1, justifyContent: 'center', gap: 18 },
  finder: {
    alignSelf: 'center',
    width: '78%',
    aspectRatio: 3 / 4,
  },
  corner: { position: 'absolute', borderColor: colors.text.primary },
  cornerTL: { top: 0, left: 0, borderTopLeftRadius: 16 },
  cornerTR: { top: 0, right: 0, borderTopRightRadius: 16 },
  cornerBL: { bottom: 0, left: 0, borderBottomLeftRadius: 16 },
  cornerBR: { bottom: 0, right: 0, borderBottomRightRadius: 16 },
  hint: { ...type.body, color: colors.text.secondary, textAlign: 'center' },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 22,
  },
  libraryChip: { borderRadius: radii.chip, paddingHorizontal: 15, paddingVertical: 10 },
  libraryChipText: { ...type.bodyEmphasis, color: colors.text.primary },
  libraryChipGhost: { width: 86 },
  shutterRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 5,
    borderColor: 'rgba(242,243,245,.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutter: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: colors.text.primary,
  },
});
