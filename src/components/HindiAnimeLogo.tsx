import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

export const HindiAnimeLogo: React.FC<LogoProps> = ({
  size = 'md',
  showTagline = false,
}) => {
  const svgSizes = {
    sm: 24,
    md: 32,
    lg: 40,
  };

  const fontSizes = {
    sm: 16,
    md: 20,
    lg: 26,
  };

  const dimension = svgSizes[size];
  const fontSize = fontSizes[size];

  return (
    <View style={styles.container}>
      {/* Exact Hexagon Play Emblem */}
      <Svg
        width={dimension}
        height={dimension}
        viewBox="0 0 32 32"
        fill="none"
      >
        <Path
          d="M16 2.2L28.8 9.6V22.4L16 29.8L3.2 22.4V9.6L16 2.2Z"
          stroke="#22c55e"
          strokeWidth={2.4}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="#000000"
        />
        <Path
          d="M13 10.5L22 16L13 21.5V10.5Z"
          fill="#22c55e"
          stroke="#22c55e"
          strokeWidth={1}
          strokeLinejoin="round"
        />
      </Svg>

      {/* Clean text typography without heavy bold font */}
      <View style={styles.textContainer}>
        <Text style={[styles.title, { fontSize }]}>
          Hindi <Text style={styles.accentText}>Anime</Text>
        </Text>
        {showTagline && (
          <Text style={styles.tagline}>
            Official Hindi Dub Streaming
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  textContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: -0.2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    includeFontPadding: false,
  },
  accentText: {
    color: '#22c55e',
    fontWeight: '600',
  },
  tagline: {
    fontSize: 9,
    color: '#7e8b83',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginTop: 1,
  },
});
