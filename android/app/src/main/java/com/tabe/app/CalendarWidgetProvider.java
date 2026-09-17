package com.tabe.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class CalendarWidgetProvider extends AppWidgetProvider {

    public static final String ACTION_UPDATE_WIDGET = "com.tabe.app.ACTION_UPDATE_CALENDAR_WIDGET";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (ACTION_UPDATE_WIDGET.equals(intent.getAction())) {
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            ComponentName thisWidget = new ComponentName(context, CalendarWidgetProvider.class);
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
            onUpdate(context, appWidgetManager, appWidgetIds);
        }
    }

    private static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_calendar_agenda);

        // 1. Fecha de hoy formateada
        try {
            SimpleDateFormat sdf = new SimpleDateFormat("EEEE, d 'de' MMMM", new Locale("es", "ES"));
            String todayStr = sdf.format(new Date());
            // Capitalizar primera letra
            todayStr = todayStr.substring(0, 1).toUpperCase() + todayStr.substring(1);
            views.setTextViewText(R.id.widget_today_date, todayStr);
        } catch (Exception e) {
            views.setTextViewText(R.id.widget_today_date, "Hoy");
        }

        // 2. Intents para abrir la app
        Intent openAppIntent = new Intent(context, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        openAppIntent.setData(Uri.parse("tabe://calendar"));
        PendingIntent pendingOpenApp = PendingIntent.getActivity(
                context,
                0,
                openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (android.os.Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        views.setOnClickPendingIntent(R.id.widget_root, pendingOpenApp);
        views.setOnClickPendingIntent(R.id.widget_footer, pendingOpenApp);
        views.setOnClickPendingIntent(R.id.widget_empty_view, pendingOpenApp);

        // Botón + Agregar Evento
        Intent addEventIntent = new Intent(context, MainActivity.class);
        addEventIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        addEventIntent.setData(Uri.parse("tabe://calendar?action=new"));
        PendingIntent pendingAddEvent = PendingIntent.getActivity(
                context,
                1,
                addEventIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (android.os.Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0)
        );
        views.setOnClickPendingIntent(R.id.widget_btn_add, pendingAddEvent);

        // 3. Leer eventos de CapacitorStorage (guardados por la app web)
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String eventsJson = prefs.getString("tabe_calendar_events", null);

        int[] slotLayoutIds = { R.id.widget_slot_1, R.id.widget_slot_2, R.id.widget_slot_3 };
        int[] slotTitleIds = { R.id.widget_slot_1_title, R.id.widget_slot_2_title, R.id.widget_slot_3_title };
        int[] slotSubjectIds = { R.id.widget_slot_1_subject, R.id.widget_slot_2_subject, R.id.widget_slot_3_subject };
        int[] slotDateIds = { R.id.widget_slot_1_date, R.id.widget_slot_2_date, R.id.widget_slot_3_date };

        boolean hasEvents = false;

        if (eventsJson != null && !eventsJson.trim().isEmpty()) {
            try {
                JSONArray eventsArray = new JSONArray(eventsJson);
                int count = Math.min(eventsArray.length(), slotLayoutIds.length);

                if (count > 0) {
                    hasEvents = true;
                    views.setViewVisibility(R.id.widget_empty_view, View.GONE);
                    views.setViewVisibility(R.id.widget_events_container, View.VISIBLE);

                    for (int i = 0; i < slotLayoutIds.length; i++) {
                        if (i < count) {
                            JSONObject ev = eventsArray.getJSONObject(i);
                            String title = ev.optString("title", "Evento");
                            String subject = ev.optString("subject", "General");
                            String formattedDate = ev.optString("formattedDate", "");

                            views.setViewVisibility(slotLayoutIds[i], View.VISIBLE);
                            views.setTextViewText(slotTitleIds[i], title);
                            views.setTextViewText(slotSubjectIds[i], subject);
                            views.setTextViewText(slotDateIds[i], formattedDate);
                        } else {
                            views.setViewVisibility(slotLayoutIds[i], View.GONE);
                        }
                    }
                }
            } catch (Exception e) {
                hasEvents = false;
            }
        }

        if (!hasEvents) {
            views.setViewVisibility(R.id.widget_empty_view, View.VISIBLE);
            views.setViewVisibility(R.id.widget_events_container, View.GONE);
        }

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
