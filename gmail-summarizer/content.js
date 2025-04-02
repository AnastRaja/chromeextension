const API_KEY = "-Ao"; // Replace with your actual Google Gemini API key

// Inject styles if not already present
if (!document.getElementById("summarizer-styles")) {
  const link = document.createElement("link");
  link.id = "summarizer-styles";
  link.rel = "stylesheet";
  link.href = chrome.runtime.getURL("styles.css");
  document.head.appendChild(link);
}

// Create floating button
const floatBtn = document.createElement("button");
floatBtn.id = "summarize-float-btn";
floatBtn.innerText = "Summarize";
document.body.appendChild(floatBtn);

// Create modal container
const modal = document.createElement("div");
modal.id = "summarizer-modal";
modal.className = "modal hidden";
modal.innerHTML = `
  <div class="modal-content">
    <h2>Email Summarizer</h2>
    <div id="summary" class="summary-box"></div>
    <button id="summarize-btn" class="summarize-btn">
      <span class="btn-text">Summarize Email</span>
      <span class="loader hidden"></span>
    </button>
    <button id="auto-reply-btn" class="auto-reply-btn">
      <span class="btn-text">Auto-Reply</span>
      <span class="loader hidden"></span>
    </button>
    <button id="close-btn" class="close-btn">Close</button>
  </div>
`;
document.body.appendChild(modal);

// Modal elements
const modalContent = modal.querySelector(".modal-content");
const summarizeBtn = modal.querySelector("#summarize-btn");
const autoReplyBtn = modal.querySelector("#auto-reply-btn");
const closeBtn = modal.querySelector("#close-btn");
const summaryBox = modal.querySelector("#summary");
const summarizeLoader = summarizeBtn.querySelector(".loader");
const autoReplyLoader = autoReplyBtn.querySelector(".loader");

// Function to wait for email content
function waitForEmailContent(callback) {
  let retries = 10;
  let interval = setInterval(() => {
    let emailBody = document.querySelector("div.a3s.aiL");
    if (emailBody && emailBody.innerText.trim() !== "") {
      clearInterval(interval);
      callback(emailBody.innerText);
    }
    if (retries-- <= 0) {
      clearInterval(interval);
      callback("No email content found.");
    }
  }, 500);
}

// Show/hide modal
floatBtn.addEventListener("click", () => {
  modal.classList.remove("hidden");
  summaryBox.innerText = "";
});

closeBtn.addEventListener("click", () => {
  modal.classList.add("hidden");
});

// Summarize email
summarizeBtn.addEventListener("click", () => {
  summarizeBtn.querySelector(".btn-text").classList.add("hidden");
  summarizeLoader.classList.remove("hidden");
  summaryBox.innerText = "";

  waitForEmailContent((emailText) => {
    if (emailText !== "No email content found.") {
      summarizeEmail(emailText);
    } else {
      summaryBox.innerText = "No email content found. Please open an email.";
      resetButton(summarizeBtn, summarizeLoader);
    }
  });
});

// Auto-reply email
autoReplyBtn.addEventListener("click", () => {
  autoReplyBtn.querySelector(".btn-text").classList.add("hidden");
  autoReplyLoader.classList.remove("hidden");
  summaryBox.innerText = "Generating reply...";

  waitForEmailContent((emailText) => {
    if (emailText !== "No email content found.") {
      generateAutoReply(emailText);
    } else {
      summaryBox.innerText = "No email content found. Please open an email.";
      resetButton(autoReplyBtn, autoReplyLoader);
    }
  });
});

function summarizeEmail(emailText) {
  fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Summarize this email in a few sentences:\n\n${emailText}`,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 150,
        },
      }),
    }
  )
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      if (data.candidates && data.candidates.length > 0) {
        summaryBox.innerText = data.candidates[0].content.parts[0].text;
      } else {
        summaryBox.innerText = "Failed to summarize email.";
      }
      resetButton(summarizeBtn, summarizeLoader);
    })
    .catch((error) => {
      summaryBox.innerText = "Error fetching summary.";
      console.error("Fetch Error:", error.message);
      resetButton(summarizeBtn, summarizeLoader);
    });
}

function generateAutoReply(emailText) {
  fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Generate a polite and professional reply to this email:\n\n${emailText}\n\nKeep the reply concise, under 100 words.`,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 100,
        },
      }),
    }
  )
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      if (data.candidates && data.candidates.length > 0) {
        const replyText = data.candidates[0].content.parts[0].text;
        summaryBox.innerText = "Reply generated! Check the reply box below.";
        appendToReplyBox(replyText);
        // Close the modal after successful reply generation
        modal.classList.add("hidden");
      } else {
        summaryBox.innerText = "Failed to generate reply.";
        resetButton(autoReplyBtn, autoReplyLoader);
      }
    })
    .catch((error) => {
      summaryBox.innerText = "Error generating reply.";
      console.error("Fetch Error:", error.message);
      resetButton(autoReplyBtn, autoReplyLoader);
    });
}

function appendToReplyBox(replyText) {
  const replyButton = document.querySelector(
    'div[role="button"][aria-label="Reply"]'
  );
  if (!replyButton) {
    summaryBox.innerText =
      "Reply button not found. Please ensure you're viewing an email.";
    return;
  }
  replyButton.click();

  setTimeout(() => {
    const replyBox = document.querySelector(
      'div[role="textbox"][contenteditable="true"]'
    );
    if (replyBox) {
      replyBox.innerText = replyText;
      const inputEvent = new Event("input", {bubbles: true});
      replyBox.dispatchEvent(inputEvent);
    } else {
      summaryBox.innerText = "Reply box not found. Please try again.";
    }
  }, 500);
}

function resetButton(btn, loader) {
  btn.querySelector(".btn-text").classList.remove("hidden");
  loader.classList.add("hidden");
}

// Toggle modal via icon click (optional)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleModal") {
    if (modal.classList.contains("hidden")) {
      modal.classList.remove("hidden");
      summaryBox.innerText = "";
    } else {
      modal.classList.add("hidden");
    }
  }
});
