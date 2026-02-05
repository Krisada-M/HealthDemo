import { NativeModules, Linking, Platform } from 'react-native';

const { CheckPackageInstallation } = NativeModules;

export const isPackageInstalled = async (packageName: string): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;
  
  return new Promise((resolve) => {
    try {
      CheckPackageInstallation.isPackageInstalled(packageName, (installed: boolean) => {
        resolve(installed);
      });
    } catch (e) {
      console.error('CheckPackageInstallation error:', e);
      resolve(false);
    }
  });
};

export const openPlayStore = async (packageName: string) => {
  const marketUrl = `market://details?id=${packageName}`;
  const webUrl = `https://play.google.com/store/apps/details?id=${packageName}`;
  
  try {
    const supported = await Linking.canOpenURL(marketUrl);
    if (supported) {
      await Linking.openURL(marketUrl);
    } else {
      await Linking.openURL(webUrl);
    }
  } catch (err) {
    await Linking.openURL(webUrl);
  }
};
