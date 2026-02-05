import { Platform } from 'react-native';
import { HealthState, DashboardMetrics, HourlyHealthPayload, HealthProvider } from './models';
import { IosHealthKitProvider } from './providers/iosHealthKit';
import { AndroidHealthConnectProvider } from './providers/androidHealthConnect';
import { AppInstalledChecker } from '../utils/app-install/AppInstalledChecker';

class HealthLayerManager {
  private provider: HealthProvider | null = null;
  private state: HealthState = HealthState.NOT_SUPPORTED;

  constructor() {
    if (Platform.OS === 'ios') {
      this.provider = new IosHealthKitProvider();
    } else if (Platform.OS === 'android') {
      this.provider = new AndroidHealthConnectProvider();
    }
  }

  async ensurePermissions(): Promise<HealthState> {
    if (!this.provider) {
      this.state = HealthState.NOT_SUPPORTED;
      return this.state;
    }

    this.state = await this.provider.ensurePermissions();
    return this.state;
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    if (!this.provider || this.state !== HealthState.READY) {
      throw new Error(`HealthLayer not ready. Current state: ${this.state}`);
    }
    return await this.provider.getDashboardMetrics();
  }

  async getTodayHourlyPayload(): Promise<HourlyHealthPayload[]> {
    if (!this.provider || this.state !== HealthState.READY) {
      throw new Error(`HealthLayer not ready. Current state: ${this.state}`);
    }
    return await this.provider.getTodayHourlyPayload();
  }

  getProvider() {
    return this.provider;
  }
}

export const HealthLayer = new HealthLayerManager();
