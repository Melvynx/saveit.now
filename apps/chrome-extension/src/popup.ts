import { getSession, saveBookmark } from "./auth-client";
import { config } from "./config";

const BASE_URL = config.BASE_URL;

// DOM Elements
const statusContainer = document.getElementById(
  "status-container",
) as HTMLDivElement;
const authContainer = document.getElementById(
  "auth-container",
) as HTMLDivElement;
const loadingContainer = document.getElementById(
  "loading-container",
) as HTMLDivElement;
const successContainer = document.getElementById(
  "success-container",
) as HTMLDivElement;
const saveButton = document.getElementById("save-button") as HTMLButtonElement;
const loginButton = document.getElementById(
  "login-button",
) as HTMLButtonElement;
const statusMessage = document.getElementById(
  "status-message",
) as HTMLDivElement;

// Helper to show one container and hide others
function showContainer(container: HTMLDivElement): void {
  [statusContainer, authContainer, loadingContainer, successContainer].forEach(
    (c) => {
      if (c === container) {
        c.classList.remove("hidden");
      } else {
        c.classList.add("hidden");
      }
    },
  );
}

// Initialize popup
async function init() {
  try {
    // Get current tab URL
    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (tabs.length === 0) {
      statusMessage.textContent = "Unable to access current tab";
      showContainer(statusContainer);
      return;
    }

    const tab = tabs[0];
    const currentUrl = tab?.url || "";

    // Check authentication status
    const session = await getSession();

    if (session) {
      // User is logged in
      statusMessage.textContent = "Save this page to your bookmarks?";
      showContainer(statusContainer);

      // Set up save button
      saveButton.addEventListener("click", async () => {
        await handleSaveBookmark(currentUrl);
      });
    } else {
      // User is not logged in
      showContainer(authContainer);

      // Set up login button
      loginButton.addEventListener("click", () => {
        chrome.tabs.create({ url: `${BASE_URL}/signin` });
      });
    }
  } catch (error) {
    console.error("Initialization error:", error);
    statusMessage.textContent = "An error occurred. Please try again.";
    showContainer(statusContainer);
  }
}

// Handle saving bookmark
async function handleSaveBookmark(url: string): Promise<void> {
  showContainer(loadingContainer);

  try {
    const result = await saveBookmark(url);

    if (result.success) {
      // Show success message
      showContainer(successContainer);

      // Auto close after 2 seconds
      setTimeout(() => {
        window.close();
      }, 2000);
    } else {
      // Show error message
      statusMessage.textContent = result.error || "Failed to save bookmark";
      showContainer(statusContainer);
    }
  } catch (error) {
    console.error("Error saving bookmark:", error);
    statusMessage.textContent = "An error occurred. Please try again.";
    showContainer(statusContainer);
  }
}

// Initialize when popup is loaded
document.addEventListener("DOMContentLoaded", init);
