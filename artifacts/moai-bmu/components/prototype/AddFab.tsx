import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePrototype } from '@/lib/prototype/store';
import { C, useOverlayOpen } from './ui';
import { useMotionPrefs } from './motion';

export const fabVisibleOn = ['Home', 'Records', 'Trends', 'TrendChart', 'Settings'] as const;
export function AddFab({ onPress, visible, raised = false }: { onPress: () => void; visible: boolean; raised?: boolean }) {
  const { data } = usePrototype();
  const insets = useSafeAreaInsets();
  const reduceMotion = useMotionPrefs();
  const overlayOpen = useOverlayOpen();
  const [keyboard, setKeyboard] = useState(false), [keyboardReady, setKeyboardReady] = useState(true);
  const [rendered, setRendered] = useState(false);
  const progress = useSharedValue(0), lift = useSharedValue(0);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => { setKeyboard(true); setKeyboardReady(false); });
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => {
      setKeyboard(false); setTimeout(() => setKeyboardReady(true), 150);
    });
    return () => { show.remove(); hide.remove(); };
  }, []);
  const show = visible && !keyboard && keyboardReady && !overlayOpen;
  useEffect(() => {
    if (show) setRendered(true);
    progress.value = withTiming(show ? 1 : 0, { duration: reduceMotion ? 100 : show ? 180 : 100, easing: Easing.out(Easing.cubic) },
      finished => { if (finished && !show) runOnJS(setRendered)(false); });
  }, [progress, reduceMotion, show]);
  useEffect(() => { lift.value = withTiming(raised ? -72 : 0, { duration: reduceMotion ? 100 : 180 }); }, [lift, raised, reduceMotion]);
  const animated = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ scale: reduceMotion ? 1 : .92 + .08 * progress.value }, { translateY: lift.value }] }));
  if (!data || !rendered) return null;
  const iconOnly = data.trends?.fabVariant === 'icon';
  const left = data.trends?.fabSide === 'Left';
  return <Animated.View pointerEvents={show ? 'box-none' : 'none'} style={[{
    position: 'absolute', bottom: (Platform.OS === 'web' ? 84 : 56 + insets.bottom) + 16,
    [left ? 'left' : 'right']: 16, zIndex: 20,
  }, animated]}>
    <Pressable accessibilityRole="button" accessibilityLabel="Add record" accessibilityHint="Starts a new catch record"
       testID="add-record" onPress={onPress} style={({ pressed }) => ({
         minWidth: iconOnly ? 56 : 180, width: iconOnly ? 56 : 180, height: 56, borderRadius: 30, paddingHorizontal: iconOnly ? 0 : 18,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
        backgroundColor: pressed ? '#236C68' : C.primary, borderWidth: 2, borderColor: C.primaryForeground,
        elevation: 5, shadowColor: '#243A37', shadowOpacity: .2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
      })}>
      <Feather name="plus" size={24} color={C.primaryForeground} />
       {!iconOnly ? <Text numberOfLines={1} style={{ color: C.primaryForeground, fontSize: 16, fontWeight: '700', flexShrink: 0 }}>Add record</Text> : null}
    </Pressable>
  </Animated.View>;
}
