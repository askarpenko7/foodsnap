/**
 * CaptureScreen — design concept screen 3 (docs/DESIGN.md §5/§6).
 *
 * A real live camera preview behind the corner brackets, not a hand-off to the
 * system camera sheet. That matters for more than looks: permission is asked
 * when you arrive here, in context and with the viewfinder already on screen,
 * instead of appearing at the moment you tap the shutter, and the capture never
 * leaves the app.
 *
 * The Simulator has no camera device, so it always lands in the "no camera"
 * state — this screen can only really be judged on hardware.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  type CameraPosition,
} from 'react-native-vision-camera';
import { launchImageLibrary, type ImagePickerResponse } from 'react-native-image-picker';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { GalleryIcon } from '../components/GalleryIcon';
import { Notice } from '../components/Notice';
import { colors, glass, radii, spacing, type } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Capture'>;

const BRACKET = 40;
const BRACKET_STROKE = 3;
const CAMERA_POSITION: CameraPosition = 'back';

function ViewfinderCorners() {
  const corner = [styles.corner, { width: BRACKET, height: BRACKET }];
  return (
    <>
      <View
        style={[...corner, styles.cornerTL, { borderTopWidth: BRACKET_STROKE, borderLeftWidth: BRACKET_STROKE }]}
      />
      <View
        style={[...corner, styles.cornerTR, { borderTopWidth: BRACKET_STROKE, borderRightWidth: BRACKET_STROKE }]}
      />
      <View
        style={[...corner, styles.cornerBL, { borderBottomWidth: BRACKET_STROKE, borderLeftWidth: BRACKET_STROKE }]}
      />
      <View
        style={[...corner, styles.cornerBR, { borderBottomWidth: BRACKET_STROKE, borderRightWidth: BRACKET_STROKE }]}
      />
    </>
  );
}

export function CaptureScreen() {
  const navigation = useNavigation<Nav>();
  const isFocused = useIsFocused();

  // A native modal reports zero insets of its own, so fall back to the window's
  // — this screen covers the whole window, which makes that exactly right.
  const insets = useSafeAreaInsets();
  const fallback = initialWindowMetrics?.insets;
  const topInset = Math.max(insets.top, fallback?.top ?? 0);
  const bottomInset = Math.max(insets.bottom, fallback?.bottom ?? 0);

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice(CAMERA_POSITION);
  const camera = useRef<Camera>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [askedOnce, setAskedOnce] = useState(false);

  // Ask on arrival rather than at the shutter, so the prompt appears with the
  // viewfinder already on screen and it is obvious what is being asked for.
  useEffect(() => {
    if (hasPermission || askedOnce) return;
    setAskedOnce(true);
    void requestPermission();
  }, [hasPermission, askedOnce, requestPermission]);

  const goToResults = useCallback(
    (uri: string) => navigation.navigate('Results', { imageUri: uri }),
    [navigation],
  );

  const onShutter = useCallback(async () => {
    if (camera.current === null || busy) return;
    setBusy(true);
    setError(null);
    try {
      const photo = await camera.current.takePhoto();
      // takePhoto returns a bare filesystem path; the classifier and <Image>
      // both want a URI.
      goToResults(photo.path.startsWith('file://') ? photo.path : `file://${photo.path}`);
    } catch {
      setError('The camera could not take that shot. Try again.');
    } finally {
      setBusy(false);
    }
  }, [busy, goToResults]);

  const onLibrary = useCallback(() => {
    launchImageLibrary(
      { mediaType: 'photo', quality: 0.9, selectionLimit: 1 },
      (response: ImagePickerResponse) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          setError(response.errorMessage ?? 'Could not open your gallery.');
          return;
        }
        const uri = response.assets?.[0]?.uri;
        if (uri) goToResults(uri);
      },
    );
  }, [goToResults]);

  const previewActive = hasPermission && device !== undefined;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      {previewActive && (
        <Camera
          ref={camera}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={isFocused}
          photo
        />
      )}

      <View style={[styles.content, { paddingTop: topInset, paddingBottom: bottomInset }]}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={[styles.closeButton, glass.chip]}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Close the camera"
          >
            <Text style={styles.closeGlyph}>×</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.finderArea}>
          <View style={styles.finder}>
            <ViewfinderCorners />
          </View>

          {previewActive && <Text style={styles.hint}>Fill the frame with your plate</Text>}

          {!hasPermission && (
            <>
              <Notice
                tone={colors.status.danger}
                title="Camera access is off"
                body="FoodSnap classifies your plate on this device — the photo never leaves it. Turn the camera on in Settings, or pick a photo from your gallery instead."
              />
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => void Linking.openSettings()}
                accessibilityRole="button"
              >
                <Text style={styles.settingsText}>Open Settings</Text>
              </TouchableOpacity>
            </>
          )}

          {hasPermission && device === undefined && (
            <Notice
              tone={colors.macro.carbs}
              title="No camera on this device"
              body="Nothing to preview here — the Simulator has no camera. Pick a photo from your gallery to try the classifier."
            />
          )}

          {error !== null && <Notice tone={colors.status.danger} title="Camera" body={error} />}
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.libraryChip, glass.chip]}
            onPress={onLibrary}
            accessibilityRole="button"
            accessibilityLabel="Pick a photo from your gallery"
          >
            <GalleryIcon size={22} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shutterRing}
            onPress={onShutter}
            disabled={!previewActive || busy}
            accessibilityRole="button"
            accessibilityLabel="Take a photo of your food"
            accessibilityState={{ disabled: !previewActive || busy }}
          >
            <View style={[styles.shutter, !previewActive && styles.shutterDisabled]}>
              {busy && <ActivityIndicator color={colors.bg.deep} />}
            </View>
          </TouchableOpacity>

          {/* Balances the gallery chip so the shutter stays centred. */}
          <View style={styles.libraryChipGhost} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.deep },
  content: { flex: 1, paddingHorizontal: spacing.gutter },
  topBar: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: radii.circle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeGlyph: { fontSize: 17, lineHeight: 20, color: colors.text.primary },
  finderArea: { flex: 1, justifyContent: 'center', gap: 18 },
  finder: { alignSelf: 'center', width: '78%', aspectRatio: 3 / 4 },
  corner: { position: 'absolute', borderColor: colors.text.primary },
  cornerTL: { top: 0, left: 0, borderTopLeftRadius: 16 },
  cornerTR: { top: 0, right: 0, borderTopRightRadius: 16 },
  cornerBL: { bottom: 0, left: 0, borderBottomLeftRadius: 16 },
  cornerBR: { bottom: 0, right: 0, borderBottomRightRadius: 16 },
  /**
   * The only control here without a surface of its own, so it carries a shadow
   * instead. The screen used to darken the whole top and bottom of the
   * viewfinder to keep this legible, which cost far more of the preview than
   * one line of text is worth — the chips are already 92% opaque and the
   * shutter is solid white.
   */
  hint: {
    ...type.body,
    color: colors.text.primary,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  settingsButton: {
    alignSelf: 'center',
    backgroundColor: colors.fill.chip,
    borderRadius: radii.chip,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  settingsText: { ...type.bodyEmphasis, fontSize: 14, color: colors.text.primary },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 22,
  },
  libraryChip: {
    width: 52,
    height: 52,
    borderRadius: radii.thumb,
    alignItems: 'center',
    justifyContent: 'center',
  },
  libraryChipGhost: { width: 52 },
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterDisabled: { opacity: 0.35 },
});
