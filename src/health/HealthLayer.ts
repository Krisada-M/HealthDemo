import { Platform } from 'react-native';
import { HealthState, DashboardMetrics, HourlyHealthPayload, HealthProvider } from './models';
import { IosHealthKitProvider } from './providers/iosHealthKit';
import { AndroidHealthConnectProvider } from './providers/androidHealthConnect';


class HealthLayerManager {
  private provider: HealthProvider | null = null;
  private state: HealthState = HealthState.NOT_SUPPORTED;

  constructor() {
    this.initializeProvider();
  }

  private initializeProvider() {
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
    this.ensureReady();
    return this.provider!.getDashboardMetrics();
  }


  async getTodayHourlyPayload(): Promise<HourlyHealthPayload[]> {
    this.ensureReady();
    return this.provider!.getTodayHourlyPayload();
  }


  getProvider() {
    return this.provider;
  }

  private ensureReady() {
    if (!this.provider || this.state !== HealthState.READY) {
      throw new Error(`HealthLayer not ready. Current state: ${this.state}`);
    }
  }
}


export const HealthLayer = new HealthLayerManager();
