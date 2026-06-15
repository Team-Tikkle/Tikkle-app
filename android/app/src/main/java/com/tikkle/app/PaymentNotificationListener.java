package com.tikkle.app;

import android.app.Notification;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Base64;
import android.util.Log;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * PaymentNotificationListener
 *
 * Intercepts notifications from verified Korean card app packages, routes each
 * notification to a dedicated per-app parser, and dispatches the extracted
 * payment data to POST https://api.tikkle.xyz/api/payments.
 *
 * Supported packages:
 *   com.kbcard.csw      — KB Pay
 *   com.wooricard.wpay  — Woori Card WON Pay
 *   com.android.mms     — Android default SMS (fallback)
 *
 * Requires "Notification Access" granted via ACTION_NOTIFICATION_LISTENER_SETTINGS.
 */
public class PaymentNotificationListener extends NotificationListenerService {

    private static final String TAG = "TikklePaymentListener";

    private static final String API_BASE_URL   = BuildConfig.API_BASE_URL;
    private static final String PAYMENT_SECRET = BuildConfig.PAYMENT_SECRET_KEY;

    // @capacitor/preferences stores values in the "CapacitorStorage" SharedPreferences
    // file, keyed verbatim (no prefix) — verified against the plugin's Preferences.java.
    private static final String PREFS_NAME     = "CapacitorStorage";
    private static final String PREFS_KEY_USER = "userId";

    // ── Verified package whitelist ────────────────────────────────────────────

    private static final String PKG_KB_PAY    = "com.kbcard.cxh.appcard";
    private static final String PKG_WOORI     = "com.wooricard.smartapp";
    //private static final String PKG_WOORI     = "com.google.android.dialer";
    //private static final String PKG_SMS       = "com.google.android.apps.messaging"; // Google Messages (AVD default)
    private static final String PKG_SMS       = "com.google.android.apps.messaging"; // Google Messages (AVD default). 사실상 테스트용으로 사용하지 않을 듯함

    // ── KB Pay patterns ───────────────────────────────────────────────────────
    //
    // KB Pay posts a multi-line notification body, e.g.:
    //   KB국민체크(1082)
    //   김*윤님
    //   06/15 17:53
    //   32,580원
    //   주식회사 무신사페이 사용
    //
    // KB_LAST4    — 4 digits inside the parenthesis on the card-name line
    // KB_AMOUNT   — digits-with-commas immediately before 원
    // KB_MERCHANT — a line ending in "사용"; the trailing marker is stripped off

    private static final Pattern KB_LAST4    = Pattern.compile("\\((\\d{4})\\)");
    private static final Pattern KB_AMOUNT   = Pattern.compile("([\\d,]+)원");
    private static final Pattern KB_MERCHANT = Pattern.compile("(?m)^\\s*(.+?)\\s*사용\\s*$");

    // ── Woori Card patterns ───────────────────────────────────────────────────
    //
    // Woori posts a multi-line body (title "승인내역" excluded), e.g.:
    //   [일시불체크.승인(1162)]06/15 18:28
    //   9,000원
    //   쿠니라멘 (KUN        ← may be truncated in the collapsed view
    //
    // WOORI_LAST4  — 4 digits inside the (NNNN) parenthesis of the approval header
    // WOORI_AMOUNT — digits-with-commas before 원
    // Merchant is the last non-empty line (truncated "(..." tail stripped).

    private static final Pattern WOORI_LAST4  = Pattern.compile("\\((\\d{4})\\)");
    private static final Pattern WOORI_AMOUNT = Pattern.compile("([\\d,]+)원");

    // ── SMS fallback patterns ─────────────────────────────────────────────────
    //
    // Generic Korean card SMS alerts often look like:
    //   "[신한카드] 스타벅스 12,500원 승인 (1234)"
    // These patterns are intentionally broad and serve as a last-resort path.

    private static final Pattern SMS_AMOUNT   = Pattern.compile("([\\d,]+)원");
    private static final Pattern SMS_LAST4    = Pattern.compile("(?:\\*{2,4}|\\()(\\d{4})\\)?");
    private static final Pattern SMS_COMPANY  = Pattern.compile(
        "(신한카드|현대카드|KB카드|국민카드|롯데카드|삼성카드|NH카드|농협카드|우리카드|씨티카드|하나카드|BC카드)");
    private static final Pattern SMS_MERCHANT = Pattern.compile(
        "([가-힣a-zA-Z0-9·&'_-]{2,30})\\s*[\\d,]+원");

    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    @Override
    public void onListenerConnected() {
        super.onListenerConnected();
        Log.i(TAG, "✅ NotificationListenerService connected — listening for payment notifications.");
    }

    @Override
    public void onListenerDisconnected() {
        super.onListenerDisconnected();
        Log.w(TAG, "⚠️ NotificationListenerService disconnected.");
    }

    // ── Entry point ───────────────────────────────────────────────────────────

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null) return;

        String pkg = sbn.getPackageName();

        // Log every incoming notification so the whitelist filter is visible in Logcat
        Log.v(TAG, "onNotificationPosted pkg=" + pkg);

        // Hard whitelist — drop everything that is not a verified target
        if (!PKG_KB_PAY.equals(pkg) && !PKG_WOORI.equals(pkg) && !PKG_SMS.equals(pkg)) return;

        Notification notification = sbn.getNotification();
        if (notification == null) return;

        Bundle extras = notification.extras;
        if (extras == null) return;

        // Prefer EXTRA_TEXT; some apps send expanded content only in EXTRA_BIG_TEXT
        CharSequence bodyCs = extras.getCharSequence(Notification.EXTRA_TEXT);
        if (bodyCs == null) bodyCs = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
        if (bodyCs == null) return;

        String body = bodyCs.toString();
        Log.d(TAG, "Notification from " + pkg + ": " + body);

        ParsedPayment payment = routeParser(pkg, body);
        if (payment == null) {
            Log.d(TAG, "Parser returned null for " + pkg + " — skipping.");
            return;
        }

        dispatchPayment(payment, sbn.getPostTime());
    }

    // ── Parser router ─────────────────────────────────────────────────────────

    /**
     * Routes the notification body to the correct dedicated parser based on the
     * source package. Returns null if the text does not match the expected layout.
     */
    private ParsedPayment routeParser(String pkg, String body) {
        try {
            switch (pkg) {
                case PKG_KB_PAY: return parseKbPay(body);
                case PKG_WOORI:  return parseWooriCard(body);
                case PKG_SMS:    return parseSms(body);
                default:         return null;
            }
        } catch (IndexOutOfBoundsException e) {
            Log.w(TAG, "Parser index error for " + pkg + " — notification layout may have changed.", e);
            return null;
        } catch (Exception e) {
            Log.w(TAG, "Unexpected parser error for " + pkg, e);
            return null;
        }
    }

    // ── KB Pay sub-parser ─────────────────────────────────────────────────────

    /**
     * Parses a KB Pay notification body.
     *
     * @return ParsedPayment, or null if a required field could not be extracted.
     */
    private ParsedPayment parseKbPay(String body) {
        // Last 4 digits — inside the parenthesis on the card-name line
        Matcher last4Matcher = KB_LAST4.matcher(body);
        if (!last4Matcher.find()) {
            Log.d(TAG, "[KB] could not extract card last4");
            return null;
        }
        String cardLast4 = last4Matcher.group(1);

        // Amount
        Matcher amountMatcher = KB_AMOUNT.matcher(body);
        if (!amountMatcher.find()) {
            Log.d(TAG, "[KB] could not extract amount");
            return null;
        }
        int amount;
        try {
            amount = Integer.parseInt(amountMatcher.group(1).replace(",", ""));
        } catch (NumberFormatException e) {
            Log.d(TAG, "[KB] amount parse failed: " + amountMatcher.group(1));
            return null;
        }

        // Merchant — the line ending in "사용" (trailing marker stripped by the pattern)
        Matcher merchantMatcher = KB_MERCHANT.matcher(body);
        if (!merchantMatcher.find()) {
            Log.d(TAG, "[KB] could not extract merchant");
            return null;
        }
        String merchant = merchantMatcher.group(1).trim();
        if (merchant.isEmpty()) {
            Log.d(TAG, "[KB] merchant is empty after trim");
            return null;
        }

        return new ParsedPayment(merchant, amount, "국민카드", cardLast4);
    }

    // ── Woori Card sub-parser ─────────────────────────────────────────────────

    /**
     * Parses a Woori Card WON Pay notification body.
     *
     * @return ParsedPayment, or null if a required field could not be extracted.
     */
    private ParsedPayment parseWooriCard(String body) {
        // Search across the whole body rather than fixed line indices, so a leading
        // "승인내역" title line (if it ends up in the body) does not shift everything.

        // Last 4 digits — inside the (NNNN) parenthesis of the approval header
        Matcher last4Matcher = WOORI_LAST4.matcher(body);
        if (!last4Matcher.find()) {
            Log.d(TAG, "[Woori] could not extract card last4 from body");
            return null;
        }
        String cardLast4 = last4Matcher.group(1);

        // Amount
        Matcher amountMatcher = WOORI_AMOUNT.matcher(body);
        if (!amountMatcher.find()) {
            Log.d(TAG, "[Woori] could not extract amount from body");
            return null;
        }
        int amount;
        try {
            amount = Integer.parseInt(amountMatcher.group(1).replace(",", ""));
        } catch (NumberFormatException e) {
            Log.d(TAG, "[Woori] amount parse failed: " + amountMatcher.group(1));
            return null;
        }

        // Merchant — the last non-empty line (Woori puts the merchant name on its own
        // line after the header and amount). A trailing truncated "(..." fragment from
        // the collapsed notification view is stripped; properly closed parens are kept.
        String merchant = "";
        String[] lines = body.split("\\n");
        for (int i = lines.length - 1; i >= 0; i--) {
            String line = lines[i].trim();
            if (!line.isEmpty()) { merchant = line; break; }
        }
        merchant = merchant.replaceAll("\\s*\\([^)]*$", "").trim();
        if (merchant.isEmpty()) {
            Log.d(TAG, "[Woori] merchant line is empty");
            return null;
        }

        return new ParsedPayment(merchant, amount, "우리카드", cardLast4);
    }

    // ── SMS fallback sub-parser ───────────────────────────────────────────────

    /**
     * Generic fallback parser for standard Korean card SMS alerts.
     * Less reliable than the dedicated app parsers — logs a warning on failure.
     */
    private ParsedPayment parseSms(String body) {
        Matcher amountMatcher = SMS_AMOUNT.matcher(body);
        if (!amountMatcher.find()) return null;
        int amount;
        try {
            amount = Integer.parseInt(amountMatcher.group(1).replace(",", ""));
        } catch (NumberFormatException e) {
            return null;
        }

        Matcher companyMatcher = SMS_COMPANY.matcher(body);
        String cardCompany = companyMatcher.find() ? companyMatcher.group(1) : "";

        Matcher last4Matcher = SMS_LAST4.matcher(body);
        String cardLast4 = last4Matcher.find() ? last4Matcher.group(1) : "0000";

        Matcher merchantMatcher = SMS_MERCHANT.matcher(body);
        if (!merchantMatcher.find()) return null;
        String merchant = merchantMatcher.group(1).trim();
        if (!cardCompany.isEmpty()) merchant = merchant.replace(cardCompany, "").trim();
        if (merchant.isEmpty()) return null;

        return new ParsedPayment(merchant, amount, cardCompany, cardLast4);
    }

    // ── Dispatch ──────────────────────────────────────────────────────────────

    private void dispatchPayment(ParsedPayment payment, long pushReceivedMillis) {
        executor.execute(() -> {
            try {
                // Fail fast with a clear message if the HMAC secret was not injected at build time
                if (PAYMENT_SECRET == null || PAYMENT_SECRET.isEmpty()) {
                    Log.e(TAG, "PAYMENT_SECRET_KEY is empty — set it in android/local.properties and rebuild.");
                    return;
                }

                // userId is written by the Vue layer (fetchProfile → Preferences.set) into
                // the @capacitor/preferences "CapacitorStorage" file. Read the real value.
                SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
                String userIdStr = prefs.getString(PREFS_KEY_USER, null);
                if (userIdStr == null) {
                    Log.w(TAG, "userId not found in CapacitorStorage — user not logged in / profile not fetched yet.");
                    return;
                }
                int userId;
                try {
                    userId = Integer.parseInt(userIdStr);
                } catch (NumberFormatException e) {
                    Log.w(TAG, "userId is not a valid integer: " + userIdStr);
                    return;
                }
                Log.d(TAG, "Loaded userId from CapacitorStorage: " + userId);

                // 1. Deterministic transactionId: SHA-256(merchant + amount + cardCompany + millis)
                String transactionId = generateTransactionId(
                    payment.merchant, payment.amount,
                    payment.cardCompany, pushReceivedMillis
                );

                // 2. Build compact JSON payload (field order must match PaymentRequest)
                JSONObject payload = new JSONObject();
                payload.put("userId",          userId);
                payload.put("cardCompany",     payment.cardCompany);
                payload.put("cardNumberLast4", payment.cardNumberLast4);
                payload.put("merchant",        payment.merchant);
                payload.put("amount",          payment.amount);
                payload.put("transactionId",   transactionId);

                // 3. Sign: HMAC-SHA256(compactJson + timestampSeconds)
                long timestampSeconds = System.currentTimeMillis() / 1000;
                String compactJson = payload.toString();
                String signature = generateTikkleSignature(compactJson, timestampSeconds);

                // 4. POST to backend
                postPayment(compactJson, timestampSeconds, signature);

            } catch (Exception e) {
                Log.e(TAG, "Error in dispatchPayment", e);
            }
        });
    }

    // ── Crypto helpers ────────────────────────────────────────────────────────

    /** SHA-256(merchant + amount + cardCompany + pushReceivedMillis) — no delimiter. */
    private String generateTransactionId(
        String merchant, int amount,
        String cardCompany, long pushReceivedMillis
    ) throws Exception {
        String raw = merchant + amount + cardCompany + pushReceivedMillis;
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] hash = md.digest(raw.getBytes(StandardCharsets.UTF_8));
        return bytesToHex(hash);
    }

    /** Base64(HMAC-SHA256(secret, compactJson + timestampSeconds)) */
    private String generateTikkleSignature(String compactJson, long timestampSeconds) throws Exception {
        String message = compactJson + timestampSeconds;
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(PAYMENT_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] sig = mac.doFinal(message.getBytes(StandardCharsets.UTF_8));
        return Base64.encodeToString(sig, Base64.NO_WRAP);
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) sb.append(String.format("%02x", b));
        return sb.toString();
    }

    // ── HTTP client ───────────────────────────────────────────────────────────

    private void postPayment(String body, long timestampSeconds, String signature) throws Exception {
        URL url = new URL(API_BASE_URL + "/api/payments");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        try {
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);
            conn.setConnectTimeout(10_000);
            conn.setReadTimeout(10_000);
            conn.setRequestProperty("Content-Type",        "application/json");
            conn.setRequestProperty("X-Tikkle-Timestamp", String.valueOf(timestampSeconds));
            conn.setRequestProperty("X-Tikkle-Signature", signature);

            // ── Log the outgoing request in full ──
            Log.d(TAG, "──────── REQUEST ────────");
            Log.d(TAG, "POST " + url);
            Log.d(TAG, "X-Tikkle-Timestamp: " + timestampSeconds);
            Log.d(TAG, "X-Tikkle-Signature: " + signature);
            Log.d(TAG, "Body: " + body);

            byte[] bodyBytes = body.getBytes(StandardCharsets.UTF_8);
            conn.setFixedLengthStreamingMode(bodyBytes.length);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(bodyBytes);
            }

            int status = conn.getResponseCode();

            // ── Read and log the response body in full ──
            // On non-2xx, the body is exposed via getErrorStream() instead of getInputStream().
            InputStream is = (status >= 200 && status < 300)
                ? conn.getInputStream()
                : conn.getErrorStream();
            String responseBody = readStream(is);

            Log.d(TAG, "──────── RESPONSE ────────");
            Log.d(TAG, "HTTP " + status);
            Log.d(TAG, "Body: " + responseBody);

            if (status != 200) {
                Log.w(TAG, "Non-200 response from payment endpoint: " + status);
            }
        } finally {
            conn.disconnect();
        }
    }

    /** Reads an InputStream fully into a UTF-8 string. Returns "" for a null stream. */
    private static String readStream(InputStream is) {
        if (is == null) return "";
        StringBuilder sb = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) sb.append(line);
        } catch (Exception e) {
            Log.w(TAG, "Failed to read response stream", e);
        }
        return sb.toString();
    }

    // ── Data class ────────────────────────────────────────────────────────────

    private static class ParsedPayment {
        final String merchant;
        final int    amount;
        final String cardCompany;
        final String cardNumberLast4;

        ParsedPayment(String merchant, int amount, String cardCompany, String cardNumberLast4) {
            this.merchant        = merchant;
            this.amount          = amount;
            this.cardCompany     = cardCompany;
            this.cardNumberLast4 = cardNumberLast4;
        }
    }
}
