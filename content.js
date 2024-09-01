function getImageMimeType(img) {
  return new Promise((resolve, reject) => {
    var url = img.src;
    var xhr = new XMLHttpRequest();
    xhr.open("HEAD", url, true);
    xhr.onload = function () {
      var contentType = xhr.getResponseHeader("Content-Type");
      console.log(contentType);
      resolve(contentType);
    };
    xhr.send();
  });
}

async function getQuestionData() {
  return new Promise(async (resolve, reject) => {
    console.log("Getting questions...");
    const questions = document.querySelectorAll("form div[role=listitem]");
    const questionData = [];
    let i;
    for (i = 0; i < questions.length; i++) {
      let question = questions[i];
      // console.log(question);
      //   html2canvas(question).then(canvas => {
      //     document.body.appendChild(canvas)
      //     canvas.toD
      // });
      const questionText = question
        .querySelector("div[role=heading]")
        .textContent.trim();
      const questionImages = question.querySelectorAll("img");
      const imgGeminiType = [];
      for (let i = 0; i < questionImages.length; i++) {
        let mime_type = await getImageMimeType(questionImages[i]);
        imgGeminiType.push({
          fileData: { mime_type, fileUri: questionImages[i].src },
        });
      }

      const options = Array.from(
        question.querySelectorAll(".docssharedWizToggleLabeledContainer")
      ).map((option) => option.textContent.trim());
      questionData.push({ questionText, options, imgGeminiType });
    }
    resolve(questionData);
  });
}

function highlightCorrectAnswer(questionIndex, answerOrOptionIndex) {
  const questions = document.querySelectorAll("form div[role=listitem]");
  const question = questions[questionIndex];
  const options = question.querySelectorAll(
    ".docssharedWizToggleLabeledContainer"
  );
  const input = question.querySelector("input[type=text]");
  if (options.length > 0) {
    console.log(options, answerOrOptionIndex);
    options[answerOrOptionIndex].style.boxShadow = "0 0 2px rgba(0,0,0,0.05)";
  } else {
    input.click();
    input.value = answerOrOptionIndex;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getQuestions") {
    getQuestionData().then((questionData) => {
      console.log(questionData);
      sendResponse({ questionData });
    });
    return true;
  } else if (request.action === "highlightAnswer") {
    highlightCorrectAnswer(request.questionIndex, request.correctAnswerIndex);
    sendResponse({ success: true });
  }
});

// Notify the background script that the content script has loaded
chrome.runtime.sendMessage({ action: "contentScriptReady" });
