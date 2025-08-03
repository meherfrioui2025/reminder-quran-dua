chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "start") {
    chrome.alarms.clear("verseAlarm"); // Clear previous alarms
    chrome.alarms.create("verseAlarm", {
      delayInMinutes: request.interval / 60,
      periodInMinutes: request.interval / 60,
    });

    chrome.storage.local.set(
      {
        interval: request.interval,
        duration: request.duration,
        language: request.language,
        content: request.content,
      },
      () => {
        console.log("Settings saved in background:", {
          interval: request.interval,
          duration: request.duration,
          language: request.language,
          content: request.content,
        });
      }
    );
  } else if (request.action === "stop") {
    chrome.alarms.clear("verseAlarm");
  }
});

// Handle alarm trigger
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "verseAlarm") {
    console.log("verseAlarm triggered at:", new Date().toLocaleString());
    chrome.storage.local.get(["language", "duration", "content"], (data) => {
      console.log("Alarm triggered with settings:", data);
      if (data.content === "verse") {
        fetchVerse(data.language || "en", data.duration || 20);
      } else if (data.content === "dua") {
        fetchDua(data.language || "en", data.duration || 20);
      }
    });
  }
});

async function getSurahMeta(chapter, language) {
  try {
    const langFile = `/chapters/${language}.json`; // e.g. 'fr.json'
    const response = await fetch(chrome.runtime.getURL(langFile));
    const surahList = await response.json();

    // Find matching surah
    return surahList.find((surah) => surah.id === chapter);
  } catch (err) {
    console.error("Error loading surah metadata:", err);
    return null;
  }
}

async function fetchVerse(language, duration) {
  try {
    const langFile = `/quran/${language}.json`; // 'ar', 'en', or 'fr'
    const response = await fetch(chrome.runtime.getURL(langFile));
    const quranData = await response.json();

    // Flatten all verses into a single array
    const allVerses = [];
    for (const chapterKey in quranData) {
      const verses = quranData[chapterKey];
      verses.forEach((verse) => allVerses.push(verse));
    }

    // Select a random verse
    const verse = allVerses[Math.floor(Math.random() * allVerses.length)];

    // Load surah metadata
    const surahMeta = await getSurahMeta(verse.chapter, language);
    const surahName =
      language === "ar"
        ? surahMeta.name
        : surahMeta?.translation || surahMeta?.transliteration;
    // Create Chrome notification
    chrome.notifications.create(
      `verseNotification_${Date.now()}`,
      {
        type: "basic",
        iconUrl: "icon.png",
        title: `${surahName} (${verse.chapter}:${verse.verse})`,
        message: verse.text,
      },
      (notificationId) => {
        // Hide after `duration` seconds
        setTimeout(() => {
          chrome.notifications.clear(notificationId);
        }, duration * 1000);
      }
    );
  } catch (error) {
    console.error("Error fetching verse:", error);
  }
}

// Fetch and display a random dua
async function fetchDua(language, duration) {
  try {
    // Use English file as fallback for French
    const langFile = `/dua/${language}.json`;
    const response = await fetch(chrome.runtime.getURL(langFile));
    const duaData = await response.json();
    console.log("duaData", duaData);
    // Select a random dua
    const dua = duaData[Math.floor(Math.random() * duaData.length)];

    // Choose text based on language
    const duaText = language === "ar" ? dua.arabic : dua.translation;

    // Create notification with unique ID
    const notificationId = `duaNotification_${Date.now()}`;
    chrome.notifications.create(
      notificationId,
      {
        type: "basic",
        iconUrl: "icon.png",
        title: dua.title,
        message: duaText,
        priority: 0,
      },
      () => {
        console.log(
          `Dua notification ${notificationId} displayed for ${duration} seconds`
        );
        // Clear notification after user-specified duration
        setTimeout(() => {
          chrome.notifications.clear(notificationId, () => {
            console.log(`Dua notification ${notificationId} cleared`);
          });
        }, duration * 1000);
      }
    );
  } catch (error) {
    console.error("Error fetching dua:", error);
  }
}
