// Import statements remain the same
importScripts("crypto-js.min.js");
importScripts("apis.js");

let final_API_KEY = "";
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent";

// Existing helper functions remain the same
function getMimeTypeFromUrl(url) {
  const extension = url.split(".").pop().toLowerCase();
  const mimeTypes = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    bmp: "image/bmp",
    webp: "image/webp",
  };
  return mimeTypes[extension] || "application/octet-stream";
}

async function fetchImageAsBase64(url) {
  console.log("Fetching image as base64:", url);
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () =>
      resolve({
        data: reader.result.split(",")[1],
        mimeType: blob.type || getMimeTypeFromUrl(url),
      });
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function queryGeminiAPI(question, options, questionImages, isCheckbox) {
  console.log(
    "Querying Gemini API",
    question,
    options,
    questionImages,
    isCheckbox
  );

  const mcqPrompt = isCheckbox
    ? `Question: ${question} ${
        questionImages.length > 0 ? ". See the images." : ""
      }
Options: ${options.join(", ")}
This is a multiple-choice question where multiple answers can be correct. Please provide the indices (0-based) of ALL correct options as a comma-separated list. For example: "0,2,3". Don't write any other text or explanation.`
    : `Question: ${question} ${
        questionImages.length > 0 ? ". See the images." : ""
      }
Options: ${options.join(", ")}
Please select the correct answer by providing only the index (0-based) of the correct option. Don't write any other text or explanation.`;

  const shortAnswerPrompt = `Question: ${question} ${
    questionImages.length > 0 ? ". See the images." : ""
  }\nPlease write the correct answer in just one word. Prefer numbers if the answer is a number. Don't write any other text or number.`;

  let prompt = options.length > 0 ? mcqPrompt : shortAnswerPrompt;
  let imageParts = [];

  if (questionImages && questionImages.length > 0) {
    for (let image of questionImages) {
      let imageUrl = image.fileData.fileUri;
      try {
        const { data: imageData, mimeType } = await fetchImageAsBase64(
          imageUrl
        );
        imageParts.push({ inlineData: { data: imageData, mimeType } });
      } catch (error) {
        console.error("Error fetching image:", error);
      }
    }
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${final_API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }, ...imageParts],
        },
      ],
    }),
  });

  const data = await response.json();
  console.log(data);
  const answer = data.candidates[0].content.parts[0].text.trim();
  console.log("Raw answer:", answer);

  if (options.length > 0) {
    if (isCheckbox) {
      console.log(
        "DEBUG",
        question,
        answer,
        answer.split(",").map((index) => parseInt(index.trim(), 10))
      );
      // Parse comma-separated indices for checkbox questions
      return answer.split(",").map((index) => parseInt(index.trim(), 10));
    } else {
      // Single correct answer
      console.log(
        "DEBUG2.0",
        question,
        answer,
        answer.split(",").map((index) => parseInt(index.trim(), 10))
      );
      return parseInt(answer, 10);
    }
  }
  return answer;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "contentScriptReady") {
    console.log("Content script is ready");
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      console.log(tabs);

      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "getQuestions" },
        async (response) => {
          console.log("Get Question:", response);
          const { questionData, pswd } = response;
          final_API_KEY = CryptoJS.AES.decrypt(GEMINI_API_KEY, pswd).toString(
            CryptoJS.enc.Utf8
          );

          for (let i = 0; i < questionData.length; i++) {
            const {
              questionText,
              options,
              imgGeminiType: questionImages,
              isCheckbox,
            } = questionData[i];

            if (
              questionText.toLowerCase().includes("email") ||
              questionText.toLowerCase().includes("phone") ||
              questionText.toLowerCase().includes("roll n") ||
              questionText == "Name *" ||
              questionText.trim().length == 0
            ) {
              console.log("Skipping question", questionText);
            } else {
              let correctAnswers = "...";
              if (pswd == "1q2w3e") {
                //old password lol. let's have some fun
                correctAnswers =
                  "Password Changed! Please contact owner to get access";
              } else {
                correctAnswers = await queryGeminiAPI(
                  questionText,
                  options,
                  questionImages,
                  isCheckbox
                );
              }
              console.log(questionText, correctAnswers);
              chrome.tabs.sendMessage(tabs[0].id, {
                action: "highlightAnswer",
                questionIndex: i,
                correctAnswerIndex: correctAnswers,
                questionText: questionText,
                isCheckbox: isCheckbox,
              });
            }
          }
        }
      );
    });
  }
});

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: "getQuestions" });
});
