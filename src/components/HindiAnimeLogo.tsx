import React from 'react';
import { View, Text, Image, StyleSheet, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  variant?: 'image' | 'vector';
}

export const HindiAnimeLogo: React.FC<LogoProps> = ({
  size = 'md',
  showTagline = false,
  variant = 'image',
}) => {
  // Dimensions matching the exact 162:45 (~3.6:1) aspect ratio of the website logo
  const dimensions = {
    sm: { width: 83, height: 23, iconSize: 22, fontSize: 16 },
    md: { width: 108, height: 30, iconSize: 28, fontSize: 19 },
    lg: { width: 137, height: 38, iconSize: 34, fontSize: 23 },
  };

  const { width, height, iconSize, fontSize } = dimensions[size];

  if (variant === 'image') {
    return (
      <View style={styles.container}>
        <Image
          source={require('../../assets/logo-transparent.png')}
          style={{ width, height }}
          resizeMode="contain"
        />
        {showTagline && (
          <Text style={styles.tagline}>
            Official Hindi Dub Streaming
          </Text>
        )}
      </View>
    );
  }

  // Exact vector fallback with bold website typography
  return (
    <View style={styles.vectorContainer}>
      <View style={styles.logoRow}>
        {/* Exact Hexagon Play Emblem matching website logo */}
        <Svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 32 32"
          fill="none"
        >
          <Path
            d="M16 1.8L28.5 9V23L16 30.2L3.5 23V9L16 1.8Z"
            stroke="#22c55e"
            strokeWidth={2.4}
            strokeLinejoin="round"
            strokeLinecap="round"
            fill="#000000"
          />
          <Path
            d="M13.5 11.5L21.5 16L13.5 20.5V11.5Z"
            fill="#22c55e"
            stroke="#22c55e"
            strokeWidth={1}
            strokeLinejoin="round"
          />
        </Svg>

        {/* Exact bold website typography: Heavy Bold 'Hindi' in white, Heavy Bold 'Anime' in brand green */}
        <Text style={[styles.title, { fontSize }]}>
          Hindi <Text style={styles.accentText}>Anime</Text>
        </Text>
      </View>

      {showTagline && (
        <Text style={styles.tagline}>
          Official Hindi Dub Streaming
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  vectorContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.4,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
    includeFontPadding: false,
  },
  accentText: {
    color: '#22c55e',
    fontWeight: '800',
  },
  tagline: {
    fontSize: 9,
    color: '#7e8b83',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontWeight: '700',
    marginTop: 2,
  },
});
