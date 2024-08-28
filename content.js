function getQuestionData() {
  console.log("Getting questions...");
  const questions = document.querySelectorAll("form div[role=listitem]");
  const questionData = [];

  questions.forEach((question, index) => {
    const questionText = question
      .querySelector("div[role=heading]")
      .textContent.trim();
    const options = Array.from(
      question.querySelectorAll(".docssharedWizToggleLabeledContainer")
    ).map((option) => option.textContent.trim());

    questionData.push({ questionText, options });
  });

  return questionData;
}

function highlightCorrectAnswer(questionIndex, answerOrOptionIndex) {
  const questions = document.querySelectorAll("form div[role=listitem]");
  const question = questions[questionIndex];
  const options = question.querySelectorAll(
    ".docssharedWizToggleLabeledContainer"
  );
  const input = question.querySelector("input[type=text]");
  if (options.length > 0) {
    options[answerOrOptionIndex].style.boxShadow = "0 0 2px rgba(0,0,0,0.05)";
  } else {
    input.click;
    input.value = answerOrOptionIndex;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getQuestions") {
    const questionData = getQuestionData();
    console.log(questionData);
    sendResponse({ questionData });
  } else if (request.action === "highlightAnswer") {
    highlightCorrectAnswer(request.questionIndex, request.correctAnswerIndex);
    sendResponse({ success: true });
  }
});

// Notify the background script that the content script has loaded
chrome.runtime.sendMessage({ action: "contentScriptReady" });
