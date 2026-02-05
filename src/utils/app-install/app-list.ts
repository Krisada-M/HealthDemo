export const APP_LIST = {
  "com.google.android.apps.fitness": {
    label: "Google Fit",
    playStorePackage: "com.google.android.apps.fitness"
  },
  "com.fitbit.FitbitMobile": {
    label: "Fitbit",
    playStorePackage: "com.fitbit.FitbitMobile"
  }
};

export type AppPackageName = keyof typeof APP_LIST;
