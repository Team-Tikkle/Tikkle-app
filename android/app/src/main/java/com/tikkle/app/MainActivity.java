package com.tikkle.app;

import android.content.ComponentName;
import android.content.Intent;
import android.os.Bundle;
import android.provider.Settings;
import android.text.TextUtils;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        promptNotificationAccessIfNeeded();
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
