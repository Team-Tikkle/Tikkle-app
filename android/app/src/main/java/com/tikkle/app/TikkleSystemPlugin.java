package com.tikkle.app;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.PowerManager;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * TikkleSystem — WebView bridge for listener self-diagnosis (Phase 2).
 *
 * Exposes:
 *  - isNotificationListenerEnabled: is our NotificationListenerService allowed?
 *  - openNotificationAccessSettings: system page to (re-)grant listener access
 *  - isIgnoringBatteryOptimizations / requestIgnoreBatteryOptimizations:
 *    battery-optimization exemption so OEM power savers don't kill the listener
 */
@CapacitorPlugin(name = "TikkleSystem")
public class TikkleSystemPlugin extends Plugin {

    /** Shared with ListenerCheckWorker — checks the system's enabled-listeners list. */
    static boolean isListenerEnabled(Context ctx) {
        String flat = Settings.Secure.getString(
            ctx.getContentResolver(), "enabled_notification_listeners");
        if (flat == null || flat.isEmpty()) return false;
        ComponentName component = new ComponentName(ctx, PaymentNotificationListener.class);
        for (String entry : flat.split(":")) {
            if (component.flattenToString().equals(entry.trim())) return true;
        }
        return false;
    }

    @PluginMethod
    public void isNotificationListenerEnabled(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("enabled", isListenerEnabled(getContext()));
        call.resolve(ret);
    }

    @PluginMethod
    public void openNotificationAccessSettings(PluginCall call) {
        getActivity().startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS));
        call.resolve();
    }

    @PluginMethod
    public void isIgnoringBatteryOptimizations(PluginCall call) {
        PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        JSObject ret = new JSObject();
        ret.put("ignoring", pm != null && pm.isIgnoringBatteryOptimizations(getContext().getPackageName()));
        call.resolve(ret);
    }

    @PluginMethod
    public void requestIgnoreBatteryOptimizations(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
            .setData(Uri.parse("package:" + getContext().getPackageName()));
        getActivity().startActivity(intent);
        call.resolve();
    }
}
