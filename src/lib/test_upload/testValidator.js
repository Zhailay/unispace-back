/**
 * Валидация распарсенных вопросов.
 * Без таблицы test_format. Минимальные правила:
 *  - Текст вопроса не пустой
 *  - Минимум 2 варианта ответа
 *  - Минимум 1 правильный ответ (test_answer_status = 1)
 *  - Нет пустых вариантов ответа
 *  - Нет «битых» html-символов из-за плохой кодировки
 */

const INCORRECT_SYMBOLS = ['&#208;', '&#1611;', '&#224;'];

function getTrueAnsCount(question) {
  return question.answers.filter(a => a.isTrue).length;
}

function hasEmptyAnswers(question) {
  return question.answers.some(a => !a.html || a.html.trim() === '');
}

function isSymbolsCorrect(question) {
  for (const sym of INCORRECT_SYMBOLS) {
    if (question.html.indexOf(sym) > -1) return false;
    for (const a of question.answers) {
      if (a.html.indexOf(sym) > -1) return false;
    }
  }
  return true;
}

function isCorrectQuestion(question, disableSymbolCheck) {
  return (question.html && question.html.trim() !== '')
    && question.answers.length >= 2
    && getTrueAnsCount(question) >= 1
    && !hasEmptyAnswers(question)
    && (disableSymbolCheck || isSymbolsCorrect(question));
}

function whyQuestionNotCorrect(question, disableSymbolCheck) {
  if (!question.html || question.html.trim() === '') {
    return 'Пустой текст вопроса';
  }
  if (question.answers.length < 2) {
    return `Вопрос должен иметь минимум 2 варианта ответа, а имеет ${question.answers.length}`;
  }
  if (getTrueAnsCount(question) < 1) {
    return 'Вопрос не содержит ни одного правильного ответа';
  }
  if (hasEmptyAnswers(question)) {
    return 'Вопрос имеет пустые варианты ответа';
  }
  if (!disableSymbolCheck && !isSymbolsCorrect(question)) {
    return 'Вопрос содержит некорректный символ';
  }
  return '';
}

function validateQuestions(questions, disableSymbolCheck) {
  const correct = [];
  const incorrect = [];

  for (const q of questions) {
    if (isCorrectQuestion(q, disableSymbolCheck)) {
      correct.push(q);
    } else {
      incorrect.push({
        ...q,
        errorReason: whyQuestionNotCorrect(q, disableSymbolCheck),
      });
    }
  }

  return { correct, incorrect };
}

module.exports = { isCorrectQuestion, whyQuestionNotCorrect, validateQuestions };
