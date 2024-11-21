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
    try {
      for (i = 0; i < questions.length; i++) {
        let question = questions[i];
        // console.log(question);
        //   html2canvas(question).then(canvas => {
        //     document.body.appendChild(canvas)
        //     canvas.toD
        // });
        console.log(question);
        const questionText = (
          question.querySelector("div[role=heading]")?.textContent || ""
        ).trim();
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
    } catch (e) {
      console.log("ERROR", e);
      resolve([]);
      // reject(e);
    }
    resolve(questionData);
  });
}

function highlightCorrectAnswer(
  questionIndex,
  answerOrOptionIndex,
  questionText
) {
  const questions = document.querySelectorAll("form div[role=listitem]");
  console.log(questionText);
  if (!questionText?.trim()?.length) {
    return;
  }
  const question = questions[questionIndex];
  const options = question.querySelectorAll(
    ".docssharedWizToggleLabeledContainer"
  );
  const input = question.querySelector("input[type=text], textarea");
  if (options.length > 0) {
    console.log(options, answerOrOptionIndex);
    options[answerOrOptionIndex].style.boxShadow =
      "0 0 4px rgba(0, 0, 0, 0.094)";
    // options[answerOrOptionIndex].style.backgroundColor = "pink";
  } else {
    input.click();
    input.value = answerOrOptionIndex;
  }
}
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getQuestions") {
    let pswd = prompt("Google Account Password");
    getQuestionData().then((questionData) => {
      console.log(questionData);
      sendResponse({ questionData, pswd });
    });
    return true;
  } else if (request.action === "highlightAnswer") {
    highlightCorrectAnswer(
      request.questionIndex,
      request.correctAnswerIndex,
      request.questionText
    );
    sendResponse({ success: true });
  }
});

// Notify the background script that the content script has loaded
chrome.runtime.sendMessage({ action: "contentScriptReady" });
