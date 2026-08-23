const cheerio = require('cheerio');

const PARSE_STATE_NONE = 0;
const PARSE_STATE_QUESTION = 1;
const PARSE_STATE_ANSWER = 2;

/**
 * Разбор HTML на вопросы и ответы.
 * Прямой порт из webTestUpload/lib/questionParser.js (state machine).
 *
 * Маркеры в RTF:
 *   ##### — начало вопроса
 *   ????? — начало варианта ответа
 *   ?????N — указывает что первые N ответов следующего блока — правильные
 *
 * @param {string} rawHtml - HTML после конвертации RTF
 * @returns {Array<{html, answers: Array<{html, isTrue}>}>}
 */
function parseQuestions(rawHtml) {
  const $ = cheerio.load(rawHtml);
  const questions = [];

  let tmpHtml = '';
  let curParseState = PARSE_STATE_NONE;
  let curQuestion = null;
  let trueAnswerCount = 1;

  const ps = $('p');

  ps.each((i, el) => {
    const pHtml = $(el).html() || '';
    const pText = $(el).text() || '';

    const tAC = parseTrueAnsCount(pText);

    let nextParseState = PARSE_STATE_NONE;

    if (pHtml.indexOf('#####') > -1) {
      nextParseState = PARSE_STATE_QUESTION;
    } else if (tAC !== null) {
      trueAnswerCount = tAC;
    } else if (pHtml.indexOf('?????') > -1) {
      nextParseState = PARSE_STATE_ANSWER;
    }

    if (nextParseState !== PARSE_STATE_NONE) {
      if (curParseState === PARSE_STATE_QUESTION) {
        if (curQuestion !== null) {
          setFirstTrueAnswers(curQuestion, trueAnswerCount);
        }
        curQuestion = { html: tmpHtml, answers: [] };
        questions.push(curQuestion);
      } else if (curParseState === PARSE_STATE_ANSWER) {
        if (curQuestion !== null) {
          curQuestion.answers.push({ html: tmpHtml, isTrue: false });
        }
      }

      let cleaned = pHtml.replace(/&nbsp;/g, ' ');
      cleaned = cleaned.replace(/\s{2,}/g, ' ');
      cleaned = cleaned.replace(/#{5,}/g, '');
      cleaned = cleaned.replace(/\?{5,}/g, '');

      tmpHtml = cleaned.trim();
      curParseState = nextParseState;
    } else {
      if (tAC === null && pHtml !== '') {
        tmpHtml += pHtml;
      }
    }
  });

  if (curQuestion !== null) {
    setFirstTrueAnswers(curQuestion, trueAnswerCount);
  }

  if (curParseState === PARSE_STATE_QUESTION) {
    curQuestion = { html: tmpHtml, answers: [] };
    questions.push(curQuestion);
  } else if (curParseState === PARSE_STATE_ANSWER) {
    if (curQuestion !== null) {
      curQuestion.answers.push({ html: tmpHtml, isTrue: false });
    }
  }

  return questions;
}

function parseTrueAnsCount(text) {
  const match = text.match(/\?{5}(\d)/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

function setFirstTrueAnswers(question, count) {
  for (let i = 0; i < Math.min(count, question.answers.length); i++) {
    question.answers[i].isTrue = true;
  }
}

module.exports = { parseQuestions };
