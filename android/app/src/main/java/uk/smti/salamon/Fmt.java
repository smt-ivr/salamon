package uk.smti.salamon;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

/** Dates and durations in Hebrew. Server times are Israel time ("2026-11-15 14:30:00"). */
public final class Fmt {

    private static final TimeZone IL = TimeZone.getTimeZone("Asia/Jerusalem");

    private Fmt() {
    }

    public static Date parse(String s) {
        if (s == null || s.length() < 16) return null;
        try {
            SimpleDateFormat f = new SimpleDateFormat(s.length() >= 19 ? "yyyy-MM-dd HH:mm:ss" : "yyyy-MM-dd HH:mm", Locale.US);
            f.setTimeZone(IL);
            return f.parse(s.replace('T', ' ').substring(0, Math.min(19, s.length())));
        } catch (Exception e) {
            return null;
        }
    }

    /** "עכשיו", "לפני 5 דק׳", "היום 14:30", "אתמול 09:10", "12/11 08:00" */
    public static String when(String s) {
        Date d = parse(s);
        if (d == null) return s == null ? "" : s;
        long diff = System.currentTimeMillis() - d.getTime();
        if (diff < 60_000) return "עכשיו";
        if (diff < 3_600_000) return "לפני " + (diff / 60_000) + " דק׳";
        Calendar now = Calendar.getInstance(IL), c = Calendar.getInstance(IL);
        c.setTime(d);
        SimpleDateFormat hm = new SimpleDateFormat("HH:mm", Locale.US);
        hm.setTimeZone(IL);
        if (sameDay(now, c)) return "היום " + hm.format(d);
        now.add(Calendar.DAY_OF_YEAR, -1);
        if (sameDay(now, c)) return "אתמול " + hm.format(d);
        SimpleDateFormat dm = new SimpleDateFormat("d/M HH:mm", Locale.US);
        dm.setTimeZone(IL);
        return dm.format(d);
    }

    public static String time(String s) {
        Date d = parse(s);
        if (d == null) return "";
        SimpleDateFormat hm = new SimpleDateFormat("HH:mm", Locale.US);
        hm.setTimeZone(IL);
        return hm.format(d);
    }

    private static boolean sameDay(Calendar a, Calendar b) {
        return a.get(Calendar.YEAR) == b.get(Calendar.YEAR) && a.get(Calendar.DAY_OF_YEAR) == b.get(Calendar.DAY_OF_YEAR);
    }

    public static String clock(int ms) {
        int s = Math.max(0, ms / 1000);
        return (s / 60) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60);
    }
}
