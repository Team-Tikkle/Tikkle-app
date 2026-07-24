package com.tikkle.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

/**
 * Periodic self-diagnosis (Phase 2-②): checks whether Notification Access for
 * PaymentNotificationListener is still granted. If it has been revoked (OEM
 * battery saver, user toggle, app update edge cases), posts a LOCAL notification
 * guiding the user back into the app — no server involved.
 */
public class ListenerCheckWorker extends Worker {

    private static final String TAG = "TikkleListenerCheck";
    private static final String CHANNEL_ID = "tikkle_system_alert";
    private static final int NOTIFICATION_ID = 9001;

    public ListenerCheckWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context ctx = getApplicationContext();
        if (TikkleSystemPlugin.isListenerEnabled(ctx)) {
            return Result.success();
        }
        Log.w(TAG, "Notification listener is disabled — posting recovery notification.");

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager mgr = ctx.getSystemService(NotificationManager.class);
            if (mgr != null && mgr.getNotificationChannel(CHANNEL_ID) == null) {
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, "서비스 상태 알림", NotificationManager.IMPORTANCE_DEFAULT);
                channel.setDescription("잔돈 적립에 필요한 권한 상태를 알려줍니다.");
                mgr.createNotificationChannel(channel);
            }
        }

        Intent intent = new Intent(ctx, MainActivity.class)
            .setAction(Intent.ACTION_MAIN)
            .addCategory(Intent.CATEGORY_LAUNCHER)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(
            ctx, 0, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        Notification notification = new NotificationCompat.Builder(ctx, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("잔돈 적립이 멈췄어요")
            .setContentText("알림 접근 권한이 꺼져 있어요. 앱을 열어 다시 켜 주세요.")
            .setAutoCancel(true)
            .setContentIntent(contentIntent)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build();

        try {
            NotificationManagerCompat.from(ctx).notify(NOTIFICATION_ID, notification);
        } catch (SecurityException e) {
            Log.w(TAG, "POST_NOTIFICATIONS not granted — cannot show recovery notification.", e);
        }
        return Result.success();
    }
}
