import { defineConfig, presetIcons, presetUno, presetWind, UserConfig } from 'unocss'

const config = {
  presets: [presetUno(), presetWind(), presetIcons()],
  shortcuts: [
    {
      'flex-center': 'flex justify-center items-center',
      'flex-col-center': 'flex flex-col justify-center items-center',
    },
  ],
  rules: [
    [
      /^border\-angle$/,
      () => ({
        position: 'relative',
        'z-index': 0,
      }),
    ],
    [
      /^fake\-border$/,
      () => ({
        'box-shadow': '0 0 0 1px inset rgba(46, 46, 58, 0.2)',
      }),
    ],
  ],
  theme: {
    colors: {
      primary: '#34E0A1',
    },
    fontFamily: {
      pixel: 'Dogica Pixel',
    },
  },
}

export default defineConfig(config as any) as unknown as UserConfig<(typeof config)['theme']>
