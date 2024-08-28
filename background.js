const GEMINI_API_KEY = "AIzaSyBcs7c6XujOJDhEedR5JjZgAGSxG9swBqg";
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";

async function queryGeminiAPI(question, options) {
  console.log("Queryinhg Gemini API");
  const mcqPrompt = `Question: ${question}\nOptions: ${options.join(
    ", "
  )}\nPlease select the correct answer by providing only the index (0-based) of the correct option.`;

  const shortAnswerPrompt = `Question: ${question}\nPlease write the correct answer in just one word.`;
  if (options.length > 0) {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: mcqPrompt }] }],
      }),
    });
    const data = await response.json();
    const answer = data.candidates[0].content.parts[0].text.trim();
    console.log(answer);
    return parseInt(answer, 10);
  } else {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: shortAnswerPrompt }] }],
      }),
    });
    const data = await response.json();
    const answer = data.candidates[0].content.parts[0].text.trim();
    console.log(answer);
    return answer;
  }
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
          console.log(response);
          const { questionData } = response;

          for (let i = 0; i < questionData.length; i++) {
            const { questionText, options } = questionData[i];
            const correctAnswerIndex = await queryGeminiAPI(
              questionText,
              options
            );

            chrome.tabs.sendMessage(tabs[0].id, {
              action: "highlightAnswer",
              questionIndex: i,
              correctAnswerIndex,
            });
          }
        }
      );
    });
  }
});

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: "getQuestions" });
});
