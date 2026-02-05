package com.healthdemo;

import android.content.pm.PackageManager;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class CheckPackageInstallationModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;

    public CheckPackageInstallationModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "CheckPackageInstallation";
    }

    @ReactMethod
    public void isPackageInstalled(String packageName, Callback callback) {
        PackageManager pm = reactContext.getPackageManager();
        try {
            pm.getPackageInfo(packageName, PackageManager.GET_ACTIVITIES);
            callback.invoke(true);
        } catch (PackageManager.NameNotFoundException e) {
            callback.invoke(false);
        }
    }
}
