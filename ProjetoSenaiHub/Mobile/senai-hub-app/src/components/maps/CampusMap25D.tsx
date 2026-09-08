import { useEffect, useMemo, useState } from 'react';
import type { ImageSourcePropType, LayoutChangeEvent, ViewStyle } from 'react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Maximize2, Minus, Plus } from 'lucide-react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors } from '@/constants/colors';
import { senaiCampus } from '@/lib/geofence';
import type { LocalizacaoAluno } from '@/types/connect.types';
import { useI18n } from '@/hooks/useI18n';

interface CampusFloor {
  id: string;
  label: string;
  source: ImageSourcePropType;
}

interface CampusMap25DProps {
  locations: LocalizacaoAluno[];
  selectedId?: string | null;
  onSelect?: (location: LocalizacaoAluno) => void;
}

interface LocationPin {
  id: string;
  label: string;
  initials: string;
  x: number;
  y: number;
  color: string;
  location: LocalizacaoAluno;
}

const campusFloors: CampusFloor[] = [
  { id: '1', label: '1', source: require('../../../assets/maps/1.png') },
  { id: '2', label: '2', source: require('../../../assets/maps/2.png') },
  { id: '3', label: '3', source: require('../../../assets/maps/3.png') },
  { id: '4', label: '4', source: require('../../../assets/maps/4.png') },
  { id: '5', label: '5', source: require('../../../assets/maps/5.png') },
  { id: '6', label: '6', source: require('../../../assets/maps/6.png') },
  { id: '7', label: '7', source: require('../../../assets/maps/7.png') },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function locationId(location: LocalizacaoAluno) {
  return location.aluno_id;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? 'A';
  const second = parts[1]?.charAt(0) ?? parts[0]?.charAt(1) ?? '';
  return `${first}${second}`.toUpperCase();
}

function projectCoordinates(location: LocalizacaoAluno) {
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  const metersPerLatitude = 111_320;
  const metersPerLongitude = 111_320 * Math.cos((senaiCampus.latitude * Math.PI) / 180);
  const eastMeters = (longitude - senaiCampus.longitude) * metersPerLongitude;
  const northMeters = (latitude - senaiCampus.latitude) * metersPerLatitude;
  const radius = Math.max(senaiCampus.radiusMeters, 1);
  return {
    x: clamp(50 + (eastMeters / radius) * 40, 7, 93),
    y: clamp(52 - (northMeters / radius) * 45, 7, 93),
  };
}

function buildPins(locations: LocalizacaoAluno[]): LocationPin[] {
  return locations
    .filter((location) =>
      location.latitude != null && location.longitude != null &&
      Number.isFinite(Number(location.latitude)) && Number.isFinite(Number(location.longitude))
    )
    .map((location) => {
    const id = locationId(location);
    const label = location.aluno_nome ?? location.aluno_id ?? 'Aluno';
    const point = projectCoordinates(location);
    const inside = location.dentro_perimetro ?? location.dentro_do_senai;
    const color = inside === false ? colors.red : inside === true ? (location.em_aula ? colors.blue : colors.green) : colors.orange;

    return {
      id,
      label,
      initials: getInitials(label),
      color,
      location,
      ...point,
    };
    });
}

export function CampusMap25D({ locations, selectedId, onSelect }: CampusMap25DProps) {
  const { t } = useI18n();
  const [activeFloorId, setActiveFloorId] = useState(campusFloors[0].id);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const pins = useMemo(() => buildPins(locations), [locations]);
  const activeFloor = campusFloors.find((floor) => floor.id === activeFloorId) ?? campusFloors[0];
  const selectedPin = pins.find((pin) => pin.id === selectedId);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const resetView = () => {
    scale.value = withSpring(1);
    savedScale.value = 1;
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const zoomBy = (amount: number) => {
    const nextScale = clamp(scale.value + amount, 1, 3);
    scale.value = withSpring(nextScale);
    savedScale.value = nextScale;
    if (nextScale === 1) {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    }
  };

  useEffect(() => {
    if (!selectedPin || viewport.width === 0 || viewport.height === 0) return;

    const nextScale = 1.55;
    const pinX = (selectedPin.x / 100) * viewport.width;
    const pinY = (selectedPin.y / 100) * viewport.height;
    const nextTranslateX = -(pinX - viewport.width / 2) * nextScale;
    const nextTranslateY = -(pinY - viewport.height / 2) * nextScale;

    scale.value = withSpring(nextScale);
    savedScale.value = nextScale;
    translateX.value = withSpring(nextTranslateX);
    translateY.value = withSpring(nextTranslateY);
    savedTranslateX.value = nextTranslateX;
    savedTranslateY.value = nextTranslateY;
  }, [
    savedScale,
    savedTranslateX,
    savedTranslateY,
    scale,
    selectedPin,
    translateX,
    translateY,
    viewport.height,
    viewport.width,
  ]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      const limitX = 280 * Math.max(scale.value, 1);
      const limitY = 360 * Math.max(scale.value, 1);
      translateX.value = Math.min(limitX, Math.max(-limitX, savedTranslateX.value + event.translationX));
      translateY.value = Math.min(limitY, Math.max(-limitY, savedTranslateY.value + event.translationY));
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      scale.value = Math.min(3, Math.max(1, savedScale.value * event.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1.02) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);
  const animatedMapStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewport({ width, height });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.floorTabs}>
        <Text style={styles.floorLabel}>{t("Pav.")}</Text>
        {campusFloors.map((floor) => {
          const active = floor.id === activeFloor.id;
          return (
            <Pressable
              key={floor.id}
              accessibilityRole="button"
              onPress={() => {
                setActiveFloorId(floor.id);
                resetView();
              }}
              style={[styles.floorButton, active && styles.floorButtonActive]}
            >
              <Text style={[styles.floorButtonText, active && styles.floorButtonTextActive]}>{floor.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.viewport} onLayout={handleLayout}>
        <View style={styles.sheetShadowTwo} />
        <View style={styles.sheetShadowOne} />
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={[styles.mapPlane, animatedMapStyle]}>
            <Image source={activeFloor.source} resizeMode="cover" style={styles.mapImage} />
            <View pointerEvents="none" style={styles.mapGrid} />
            {pins.map((pin) => {
              const selected = pin.id === selectedId;
              return (
                <Pressable
                  key={pin.id}
                  accessibilityRole="button"
                  onPress={() => onSelect?.(pin.location)}
                  style={[
                    styles.pinWrap,
                    { left: `${pin.x}%`, top: `${pin.y}%` } as ViewStyle,
                    selected && styles.pinWrapSelected,
                  ]}
                  hitSlop={8}
                >
                  {selected ? (
                    <View style={styles.pinLabel}>
                      <Text numberOfLines={1} style={styles.pinLabelText}>
                        {pin.label}
                      </Text>
                    </View>
                  ) : null}
                  <View style={[styles.pinHead, selected && styles.pinHeadSelected, { borderColor: pin.color }]}>
                    <Text style={[styles.pinText, { color: pin.color }]}>{pin.initials}</Text>
                  </View>
                  <View style={[styles.pinNeedle, { backgroundColor: pin.color }]} />
                  <View style={[styles.pinShadow, selected && styles.pinShadowSelected]} />
                </Pressable>
              );
            })}
          </Animated.View>
        </GestureDetector>

        <View style={styles.mapControls}>
          <Pressable accessibilityRole="button" onPress={() => zoomBy(0.25)} style={styles.controlButton}>
            <Plus size={16} color={colors.navy} />
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => zoomBy(-0.25)} style={styles.controlButton}>
            <Minus size={16} color={colors.navy} />
          </Pressable>
          <Pressable accessibilityRole="button" onPress={resetView} style={styles.controlButton}>
            <Maximize2 size={15} color={colors.navy} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  floorTabs: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  floorLabel: {
    color: colors.grayText,
    fontSize: 11,
    fontWeight: '900',
  },
  floorButton: {
    width: 30,
    height: 30,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floorButtonActive: {
    borderColor: colors.red,
    backgroundColor: '#FFE7E9',
  },
  floorButtonText: {
    color: colors.grayText,
    fontSize: 12,
    fontWeight: '900',
  },
  floorButtonTextActive: {
    color: colors.red,
  },
  viewport: {
    width: '100%',
    aspectRatio: 0.72,
    maxHeight: 520,
    minHeight: 360,
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#EFF5FB',
  },
  sheetShadowOne: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 12,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#BED2E7',
    transform: [{ skewX: '-7deg' }],
  },
  sheetShadowTwo: {
    position: 'absolute',
    left: 28,
    right: 28,
    bottom: 4,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#9BB7D0',
    opacity: 0.65,
    transform: [{ skewX: '-7deg' }],
  },
  mapPlane: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 10,
    bottom: 24,
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C9D7E8',
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  mapImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  mapGrid: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(14, 165, 233, 0.03)',
    borderColor: 'rgba(29, 94, 244, 0.1)',
    borderWidth: 1,
  },
  mapControls: {
    position: 'absolute',
    right: 10,
    top: 10,
    gap: 7,
  },
  controlButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  pinWrap: {
    position: 'absolute',
    width: 38,
    minHeight: 54,
    alignItems: 'center',
    transform: [{ translateX: -19 }, { translateY: -42 }],
  },
  pinWrapSelected: {
    zIndex: 10,
  },
  pinLabel: {
    maxWidth: 132,
    minHeight: 24,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  pinLabelText: {
    color: colors.navy,
    fontSize: 11,
    fontWeight: '900',
  },
  pinHead: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  pinHeadSelected: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 4,
  },
  pinText: {
    fontSize: 9,
    fontWeight: '900',
  },
  pinNeedle: {
    width: 4,
    height: 14,
    borderRadius: 2,
    marginTop: -3,
  },
  pinShadow: {
    width: 22,
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(2, 6, 23, 0.24)',
    marginTop: -2,
  },
  pinShadowSelected: {
    width: 28,
    backgroundColor: 'rgba(2, 6, 23, 0.34)',
  },
});
