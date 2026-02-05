import { Platform } from 'react-native';
import { HealthState, DashboardMetrics, HourlyHealthPayload, HealthProvider } from './models';
import { IosHealthKitProvider } from './providers/iosHealthKit';
import { AndroidHealthConnectProvider } from './providers/androidHealthConnect';

/**
 * HealthLayer - Unified Service for Health Data
 * Manages provider lifecycle and cross-platform permissions.
 */
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

  /**
   * Ensures permissions are granted.
   * Returns the current HealthState.
   */
  async ensurePermissions(): Promise<HealthState> {
    if (!this.provider) {
      this.state = HealthState.NOT_SUPPORTED;
      return this.state;
    }

    this.state = await this.provider.ensurePermissions();
    return this.state;
  }

  /**
   * Fetches high-level metrics for the dashboard.
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    this.ensureReady();
    return this.provider!.getDashboardMetrics();
  }

  /**
   * Fetches hourly data for the current day.
   */
  async getTodayHourlyPayload(): Promise<HourlyHealthPayload[]> {
    this.ensureReady();
    return this.provider!.getTodayHourlyPayload();
  }

  /**
   * Returns the active platform provider instance.
   */
  getProvider() {
    return this.provider;
  }

  private ensureReady() {
    if (!this.provider || this.state !== HealthState.READY) {
      throw new Error(`HealthLayer not ready. Current state: ${this.state}`);
    }
  }
}

// Single instance export
export const HealthLayer = new HealthLayerManager();
