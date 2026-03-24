import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export interface NotificationMedication {
  id: string;
  name: string;
  dosage: string;
  times: string[];
}

class NotificationService {
  async cancelAll() {
    if (Platform.OS === 'web') return;
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async scheduleMedicationReminders(meds: NotificationMedication[]) {
    if (Platform.OS === 'web') return;

    // Clear existing to avoid duplicates
    await this.cancelAll();

    for (const med of meds) {
      for (const time of med.times) {
        const [hour, minute] = time.split(':').map(Number);

        await Notifications.scheduleNotificationAsync({
          content: {
            title: `💊 Time for ${med.name}`,
            body: `Dosage: ${med.dosage}. Don't forget to take your medication!`,
            data: { medId: med.id },
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: {
            hour,
            minute,
            repeats: true,
          },
        });
      }
    }
  }

  async scheduleSnooze(doseId: string, minutes: number, newTime: string) {
    if (Platform.OS === 'web') return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💊 Medication Snoozed',
        body: `Reminder rescheduled for ${newTime}`,
        data: { doseId },
      },
      trigger: { seconds: minutes * 60 },
    });
  }
}

export const notificationService = new NotificationService();
