import type { ImageSourcePropType } from 'react-native';

export type BrandArea = 'hub' | 'connect' | 'grid' | 'safe';
export type BrandKind = 'icon' | 'slogan';

type ThemeAssets = {
  light: ImageSourcePropType;
  dark: ImageSourcePropType;
};

const brandAssets: Record<BrandArea, Record<BrandKind, ThemeAssets>> = {
  hub: {
    icon: {
      light: require('../../assets/brand/logo_preto_hub.png'),
      dark: require('../../assets/brand/logo_branco_hub.png'),
    },
    slogan: {
      light: require('../../assets/brand/logo_slogan_preto_hub.png'),
      dark: require('../../assets/brand/logo_slogan_branco_hub.png'),
    },
  },
  connect: {
    icon: {
      light: require('../../assets/brand/logo_preto_connect.png'),
      dark: require('../../assets/brand/logo_branco_connect.png'),
    },
    slogan: {
      light: require('../../assets/brand/logo_slogan_preto_connect.png'),
      dark: require('../../assets/brand/logo_slogan_branco_connect.png'),
    },
  },
  grid: {
    icon: {
      light: require('../../assets/brand/logo_preto_grid.png'),
      dark: require('../../assets/brand/logo_branco_grid.png'),
    },
    slogan: {
      light: require('../../assets/brand/logo_slogan_preto_grid.png'),
      dark: require('../../assets/brand/logo_slogan_branco_grid.png'),
    },
  },
  safe: {
    icon: {
      light: require('../../assets/brand/logo_preto_safe.png'),
      dark: require('../../assets/brand/logo_branco_safe.png'),
    },
    slogan: {
      light: require('../../assets/brand/logo_slogan_preto_safe.png'),
      dark: require('../../assets/brand/logo_slogan_branco_safe.png'),
    },
  },
};

export function getBrandAsset(area: BrandArea, kind: BrandKind, isDark: boolean) {
  return brandAssets[area][kind][isDark ? 'dark' : 'light'];
}
