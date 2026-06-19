package com.tikkle.app;

import android.Manifest;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        promptNotificationAccessIfNeeded();
        requestPostNotificationsIfNeeded();
    }

    /**
     * On Android 13+ (API 33), posting our own result notifications requires the
     * runtime POST_NOTIFICATIONS permission. Request it once if not yet granted.
     */
    private void requestPostNotificationsIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{ Manifest.permission.POST_NOTIFICATIONS }, 1001);
        }
    }

    /**
     * Checks whether the user has granted Notification Listener access to this app.
     * If not, opens the system Notification Access settings page so the user can
     * enable it manually. Called once on app launch.
     */
    private void promptNotificationAccessIfNeeded() {
        if (!isNotificationListenerEnabled()) {
            startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS));
        }
    }

    /**
     * Returns true if PaymentNotificationListener is in the set of enabled
     * notification listener components reported by the system.
     */
    private boolean isNotificationListenerEnabled() {
        String flat = Settings.Secure.getString(
            getContentResolver(),
            "enabled_notification_listeners"
        );
        if (flat == null || flat.isEmpty()) return false;

        ComponentName thisComponent = new ComponentName(this, PaymentNotificationListener.class);
        for (String entry : flat.split(":")) {
            if (thisComponent.flattenToString().equals(entry.trim())) {
                return true;
            }
        }
        return false;
    }
}
