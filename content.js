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

        // Check if it's a checkbox question by looking for checkbox inputs
        const isCheckbox =
          question.querySelector('div[role="checkbox"]') !== null;

        const options = Array.from(
          question.querySelectorAll(".docssharedWizToggleLabeledContainer")
        ).map((option) => option.textContent.trim());

        questionData.push({ questionText, options, imgGeminiType, isCheckbox });
      }
    } catch (e) {
      console.log("ERROR", e);
      resolve([]);
    }
    resolve(questionData);
  });
}

function highlightCorrectAnswer(
  questionIndex,
  answerOrOptionIndex,
  questionText,
  isCheckbox
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
    if (isCheckbox && Array.isArray(answerOrOptionIndex)) {
      question.innerHTML += `<div style='color:rgba(0,0,0,0.5);'> ${answerOrOptionIndex.join(
        ","
      )} </div>`;
      // Handle multiple correct answers for checkbox questions
      answerOrOptionIndex.forEach((index) => {
        if (index >= 0 && index < options.length) {
          options[index].style.boxShadow = "0 0 4px rgba(0, 0, 0, 0.094)";
          // Optionally click the checkbox
          const checkbox = options[index].querySelector(
            'input[type="checkbox"]'
          );
          if (checkbox) {
            checkbox.click();
          }
        }
      });
    } else {
      question.innerHTML += `<div style='color:rgba(0,0,0,0.5);'> ${answerOrOptionIndex} </div>`;
      // Handle single correct answer
      options[answerOrOptionIndex].style.boxShadow =
        "0 0 4px rgba(0, 0, 0, 0.094)";
      // Optionally click the radio button
      const radio = options[answerOrOptionIndex].querySelector(
        'input[type="radio"]'
      );
      if (radio) {
        radio.click();
      }
    }
  } else {
    input.click();
    input.value = answerOrOptionIndex;
  }

  const submitButton = document.querySelector("div[aria-label='Submit']");
  const submitParent = submitButton.parentNode.parentNode.parentNode;
  if (!submitParent.innerText.includes("care")) {
    console.log(submitButton, submitParent);
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
      request.questionText,
      request.isCheckbox
    );
    sendResponse({ success: true });
  }
});

// Notify the background script that the content script has loaded
chrome.runtime.sendMessage({ action: "contentScriptReady" });
