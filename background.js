// TODO: Add your API key here
const GEMINI_API_KEY = "API_KEY";
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent";

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

async function queryGeminiAPI(question, options, questionImages) {
  console.log("Queryinhg Gemini API", question, options, questionImages);
  const mcqPrompt = `Question: ${question} ${
    questionImages.length > 0 ? ". See the images." : ""
  }\nOptions: ${options.join(
    ", "
  )}\nPlease select the correct answer by providing only the index (0-based) of the correct option. Don't write an other text or explanation.`;

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

  console.log("Final Prompt:", [{ text: prompt }, ...imageParts]);
  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
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
  console.log(answer);
  return options.length > 0 ? parseInt(answer, 10) : answer;
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
          const { questionData } = response;

          for (let i = 0; i < questionData.length; i++) {
            const {
              questionText,
              options,
              imgGeminiType: questionImages,
            } = questionData[i];
            if (
              questionText.toLowerCase().includes("email") ||
              questionText.toLowerCase().includes("phone") ||
              questionText.toLowerCase().includes("roll n") ||
              questionText == "Name *"
            ) {
              console.log("Skipping question", questionText);
            } else {
              const correctAnswerIndex = await queryGeminiAPI(
                questionText,
                options,
                questionImages
              );
              console.log(questionText, correctAnswerIndex);
              chrome.tabs.sendMessage(tabs[0].id, {
                action: "highlightAnswer",
                questionIndex: i,
                correctAnswerIndex,
                questionText: questionText,
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
