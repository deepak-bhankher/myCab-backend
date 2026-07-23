// Sends a push notification through Expo's push service.
// No Firebase setup needed — this works with any Expo push token.
async function sendPushNotification(expoPushToken, title, body, data = {}) {
  if (!expoPushToken) return;

  const message = {
    to: expoPushToken,
    sound: "default",
    title,
    body,
    data,
    priority: "high",
  };

  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });
    const result = await res.json();
    console.log("Push notification result:", result);
  } catch (err) {
    console.log("Push notification error:", err.message);
  }
}

module.exports = sendPushNotification;