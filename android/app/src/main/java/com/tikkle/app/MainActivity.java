package com.tikkle.app;

import android.Manifest;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;

import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

import com.getcapacitor.BridgeActivity;

import java.util.concurrent.TimeUnit;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(TikkleSystemPlugin.class);
        super.onCreate(savedInstanceState);
        scheduleListenerCheck();
        // POST_NOTIFICATIONS must be requested before opening the notification-access
        // settings screen. If the settings screen launches first, the permission dialog
        // is obscured by the activity transition and the user never sees it — the
        // permission ends up silently denied, and postFeedback() logs a SecurityException
        // but shows nothing. We request the runtime permission first, then prompt for
        // notification-listener access in the result callback.
        requestPostNotificationsIfNeeded();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == 1001) {
            // Whether granted or denied, proceed to prompt notification-listener access next.
            promptNotificationAccessIfNeeded();
        }
    }

    /**
     * Phase 2-②: daily WorkManager job that re-checks Notification Access and
     * posts a local recovery notification if it has been revoked.
     * ExistingPeriodicWorkPolicy.KEEP → scheduling is idempotent across launches.
     */
    private void scheduleListenerCheck() {
        PeriodicWorkRequest request =
            new PeriodicWorkRequest.Builder(ListenerCheckWorker.class, 1, TimeUnit.DAYS).build();
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "tikkle_listener_check", ExistingPeriodicWorkPolicy.KEEP, request);
    }

    /**
     * On Android 13+ (API 33), posting our own result notifications requires the
     * runtime POST_NOTIFICATIONS permission. Request it once if not yet granted.
     * On older versions skip straight to the notification-listener prompt.
     */
    private void requestPostNotificationsIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{ Manifest.permission.POST_NOTIFICATIONS }, 1001);
        } else {
            promptNotificationAccessIfNeeded();
        }
    }

    /**
     * Checks whether the user has granted Notification Listener access to this app.
     * If not, opens the system Notification Access settings page so the user can
     * enable it manually.
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
