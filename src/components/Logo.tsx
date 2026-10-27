import React from 'react';
import { StyleSheet, Image,View } from 'react-native';
import { colors } from '../theme/colors';

const Logo: React.FC<{ size?: number }> = ({ size = 60 }) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Image
        source={require('../assets/velotv-icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );

  // return (
  //   <View style={[styles.container, {width: size, height: size}]}>
  //     <LinearGradient
  //       colors={colors.gradients.primary}
  //       start={{x: 0, y: 0}}
  //       end={{x: 1, y: 1}}
  //       style={[styles.gradient, {width: size, height: size, borderRadius: size * 0.2}]}>
  //       <View style={styles.innerCircle}>
  //         <View style={styles.playIcon}>
  //           <View style={styles.playTriangle} />
  //         </View>
  //       </View>
  //     </LinearGradient>
  //   </View>
  // );
};

const styles = StyleSheet.create({
  logo: {
    // width: 180,
    // height: 70,
    width: '100%',
    height: '100%',
  },

  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  innerCircle: {
    width: '70%',
    height: '70%',
    borderRadius: 999,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    width: '50%',
    height: '50%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 12,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: colors.primary,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 2,
  },
});

export default Logo;
