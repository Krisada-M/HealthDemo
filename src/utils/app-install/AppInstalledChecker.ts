import { Platform } from 'react-native';
import { isPackageInstalled } from './android';
import { APP_LIST } from './app-list';

export const AppInstalledChecker = {
  async isAppInstalledAndroid(packageName: string): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    return await isPackageInstalled(packageName);
  },

  async isAnyHealthAppInstalled(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    const packages = Object.keys(APP_LIST);
    for (const pkg of packages) {
      if (await isPackageInstalled(pkg)) {
        return true;
      }
    }
    return false;
  }
};
