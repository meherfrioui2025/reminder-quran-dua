document.addEventListener("DOMContentLoaded", () => {
  const startButton = document.getElementById("start");
  const stopButton = document.getElementById("stop");
  const intervalSelect = document.getElementById("interval");
  const durationSelect = document.getElementById("duration"); // <— FIXED
  const languageSelect = document.getElementById("language");
  const contentSelect = document.getElementById("content");

  const htmlElement = document.documentElement;

  // Load translations
  async function loadTranslations(language) {
    try {
      const response = await fetch(
        chrome.runtime.getURL("/translations/translations.json")
      );
      const translations = await response.json();
      const langData = translations[language] || translations["en"]; // Fallback to English

      // Update text for elements with data-i18n attribute
      document.querySelectorAll("[data-i18n]").forEach((element) => {
        const key = element.getAttribute("data-i18n");
        element.textContent = langData[key] || element.textContent;
      });

      // Apply RTL for Arabic, LTR for others
      if (language === "ar") {
        htmlElement.setAttribute("dir", "rtl");
        document.querySelectorAll(".container, label, select").forEach((el) => {
          el.classList.add("rtl");
        });
      } else {
        htmlElement.setAttribute("dir", "ltr");
        document.querySelectorAll(".container, label, select").forEach((el) => {
          el.classList.remove("rtl");
        });
      }
    } catch (error) {
      console.error("Error loading translations:", error);
    }
  }

  // Request notification permission
  Notification.requestPermission().then((permission) => {
    console.log("Notification permission:", permission);
  });

  // Load saved settings
  chrome.storage.local.get(
    ["interval", "duration", "language", "content"],
    (data) => {
      if (data.interval) intervalSelect.value = data.interval;
      if (data.duration) durationSelect.value = data.duration;
      if (data.content) contentSelect.value = data.content;
      const language = data.language || "en";
      languageSelect.value = language;
      loadTranslations(language); // Apply translations on load
    }
  );

  // Update UI and save settings when language changes
  languageSelect.addEventListener("change", () => {
    const language = languageSelect.value;
    loadTranslations(language);
    chrome.storage.local.set({ language }, () => {
      console.log("Language saved:", language);
    });
  });

  // Save content type when changed
  contentSelect.addEventListener("change", () => {
    const content = contentSelect.value;
    chrome.storage.local.set({ content }, () => {
      console.log("Content type saved:", content);
    });
  });

  startButton.addEventListener("click", () => {
    const interval = parseInt(intervalSelect.value, 10);
    const duration = parseInt(durationSelect.value, 10); // <— FIXED
    const language = languageSelect.value;
    const content = contentSelect.value;
    console.log("content", content);
    chrome.storage.local.set({ interval, duration, language, content });
    chrome.runtime.sendMessage({
      action: "start",
      interval,
      duration,
      language,
      content,
    });
  });

  stopButton.addEventListener("click", () => {
    console.log("Sending stop message");
    chrome.runtime.sendMessage({ action: "stop" });
  });
});
