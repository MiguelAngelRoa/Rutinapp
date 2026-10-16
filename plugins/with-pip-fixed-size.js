const {
  withAndroidManifest,
  AndroidConfig,
  createRunOncePlugin,
} = require('@expo/config-plugins');

const DEFAULT_WIDTH_DP = 150;
const DEFAULT_HEIGHT_DP = 100;

const withPipFixedSize = (config, props) => {
  const widthDp = props && props.width ? props.width : DEFAULT_WIDTH_DP;
  const heightDp = props && props.height ? props.height : DEFAULT_HEIGHT_DP;

  return withAndroidManifest(config, (config) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(
      config.modResults,
    );

    activity.layout = [
      {
        $: {
          'android:minWidth': `${widthDp}dp`,
          'android:minHeight': `${heightDp}dp`,
        },
      },
    ];

    return config;
  });
};

module.exports = createRunOncePlugin(
  withPipFixedSize,
  'with-pip-fixed-size',
  '1.0.0',
);
