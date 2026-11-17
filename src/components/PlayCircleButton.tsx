import React from 'react';
import { View, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Play, Pause } from 'lucide-react-native';

interface PlayCircleButtonProps {
  size?: number;
  iconSize?: number;
  isPlaying?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const PlayCircleButton: React.FC<PlayCircleButtonProps> = ({
  size = 40,
  iconSize = 18,
  isPlaying = false,
  onPress,
  style,
}) => {
  const content = (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
    >
      {isPlaying ? (
        <Pause size={iconSize} color="#ffffff" fill="#ffffff" />
      ) : (
        <Play
          size={iconSize}
          color="#ffffff"
          fill="#ffffff"
          style={{ marginLeft: Math.round(iconSize * 0.12) }}
        />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  circle: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
});


