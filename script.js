const fs = require('fs');
const path = require('path');
const axios = require('axios');
const TelegramApi = require('node-telegram-bot-api');
const token = '5980630603:AAH3ikiRkcAP3qVpKjZA9mfh1IC95pHGxVk';
// test token
// const token = '7740171963:AAHPnWnOXhoCLTv_nJEe82eXlXfF0c6Okhs';
const bot = new TelegramApi(token, {polling: true});
const GROUP_CHAT_ID = '-1001961186421';
// const TEST_GROUP_CHAT_ID = '-740721555';
let users = {};
let messageText = {};
const fileLogs = path.resolve('logs.txt');

// function checkInternetConnection() {
//   axios.get('http://www.google.com', { timeout: 5000 })
//       .then(() => {
//
//       })
//       .catch(() => {
//           bot.stopPolling();
//           setTimeout(() => {
//               bot.startPolling();
//           }, 5000);
//       });
// }
//
// setInterval(checkInternetConnection, 5000);

fs.readFile(path.resolve('users.json'), (err, data) => {
  if (err) throw err;
  users = JSON.parse(data);
});

const commandsBot = bot.setMyCommands ([
  { command: '/start', description: 'Старт' },
]);

const commandsKeyboard = [
  [
      { text: 'Буду позже', callback_data: 'Буду позже' },
      { text: 'Опаздываю', callback_data: 'Опаздываю' },
      { text: 'Заболел', callback_data: 'Заболел' }
  ],
  [
      { text: 'На удаленке', callback_data: 'На удаленке' },
      { text: 'Командировка', callback_data: 'Командировка' },
      { text: 'В отпуске', callback_data: 'В отпуске' },
  ],
  [
      { text: 'День за свой счет', callback_data: 'День за свой счет' },
      { text: 'На монтаже', callback_data: 'На монтаже'}
  ]
];
const options = { reply_markup: { inline_keyboard: commandsKeyboard } };

const questions = {
  "Буду позже": [
    "В какое время ты планируешь быть в офисе?",
    "Укажи, пожалуйста, причину (Если встреча, то укажи клиента)"
  ],
  "Опаздываю": [
    "На сколько ты опаздываешь? (укажи время в минутах/часах)",
    "Подскажи, пожалуйста, почему опаздываешь?"
  ],
  "Заболел": [
    "Выздоравливай скорее! Не забудь сообщить своему непосредственному руководителю и взять больничный :)\nКак самочувствие в целом?"
  ],
  "На удаленке": [
    "Сколько дней ты будешь на удаленке?"
  ],
  "Командировка": [
    "Пожалуйста, напиши даты командировки в формате дд.мм-дд.мм"
  ],
  "В отпуске": [
    "Пожалуйста, напиши даты отпуска в формате дд.мм-дд.мм"
  ],
  "День за свой счет": [
    "Сколько дней ты берешь за свой счет?"
  ],
  "На монтаже": [
    "Во сколько планируешь быть в офисе?",
    "Что за монтаж (проект)?"
  ]
}

let userAnswers = {};

bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  const username = query.from.username;
  if (users[username]) {
    if (questions.hasOwnProperty(query.data)) {
      userAnswers[chatId] = {date: null, userName: null, category: query.data, answers: [], questions: [], currentQuestionIndex: 0 };
      // let dataLog = userAnswers[chatId];
      askQuestion(chatId);
    }
  } else {
    bot.sendMessage(chatId, 'Нажмите Старт в меню ниже!')
  }
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.username;
  if (msg.text === '/start') {
    if (!userAnswers[chatId]) {
      if (users[username]) {
        bot.sendMessage(chatId, `Привет, ${users[username]}! О чем расскажешь?`, options)
      } else {
        bot.sendMessage(chatId, 'Представься, пожалуйста! Как тебя зовут?\nПришли свои Имя и Фамилию');
      }  
    }
  }
  if (!users[username] && msg.text !== '/start') {
    if (/^[A-Za-zА-Яа-яЁё]+\s[A-Za-zА-Яа-яЁё]+$/.test(msg.text)) {
      users[username] = msg.text;
      fs.writeFile(path.resolve('users.json'), JSON.stringify(users), (err) => {
          if (err) throw err;
      });

      console.log(`Добавлен новый пользователь ${users[username]}!`);

      bot.sendMessage(chatId, `Привет, ${users[username]}!\nВыбери команду:`, options)
    } else {
        bot.sendMessage(chatId, `Просьба ввести Имя и Фамилию`)
    }
  }
  if (userAnswers.hasOwnProperty(chatId)) {
    if (msg.text && msg.text !== '/start') {
      userAnswers[chatId].date = getDate(msg.date*1000);
      userAnswers[chatId].userName = users[username];
      userAnswers[chatId].answers.push(msg.text);
      userAnswers[chatId].questions.push(questions[userAnswers[chatId].category][userAnswers[chatId].currentQuestionIndex]);
      userAnswers[chatId].currentQuestionIndex++;


    } else {
        bot.sendMessage(chatId, `Просьба текстом`);
        switch (userAnswers[chatId].currentQuestionIndex) {
          case '0':
            userAnswers[chatId].currentQuestionIndex = 0;
            break
          case '1':
            userAnswers[chatId].currentQuestionIndex = 1;
            break
          case '2':
            userAnswers[chatId].currentQuestionIndex = 2;
            break
        }
      }
  }
  if (userAnswers.hasOwnProperty(chatId) && userAnswers[chatId] !== undefined) {
    if (userAnswers[chatId] && userAnswers[chatId].currentQuestionIndex < questions[userAnswers[chatId].category].length) {
      askQuestion(chatId);
    } else {
      let finalMessage;
      switch (userAnswers[chatId].category) {
        case "Буду позже":
          finalMessage = `<b>${userAnswers[chatId].category}</b>\n${String.fromCodePoint(0x1F464)} Имя - ${users[username]}\n${String.fromCodePoint(0x23F0)} Будет в офисе - ${userAnswers[chatId].answers[0]}\n${String.fromCodePoint(0x2753)} Причина - ${userAnswers[chatId].answers[1]}\n@${username}`;
          break;
        case "Опаздываю":
          finalMessage = `<b>${userAnswers[chatId].category}</b>\n${String.fromCodePoint(0x1F464)} Имя - ${users[username]}\n${String.fromCodePoint(0x23F0)} Опаздывает на - ${userAnswers[chatId].answers[0]}\n${String.fromCodePoint(0x2753)} Причина - ${userAnswers[chatId].answers[1]}\n@${username}`;
          break
        case "Заболел":
          finalMessage = `<b>${userAnswers[chatId].category}</b>\n${String.fromCodePoint(0x1F464)} Имя - ${users[username]}\n${String.fromCodePoint(0x23F0)} Самочувствие - ${userAnswers[chatId].answers[0]}\n@${username}`;
          break
        case "На удаленке":
          finalMessage = `<b>${userAnswers[chatId].category}</b>\n${String.fromCodePoint(0x1F464)} Имя - ${users[username]}\n${String.fromCodePoint(0x23F0)} Дней на удаленке - ${userAnswers[chatId].answers[0]}\n@${username}`;
          break
        case "Командировка":
          finalMessage = `<b>${userAnswers[chatId].category}</b>\n${String.fromCodePoint(0x1F464)} Имя - ${users[username]}\n${String.fromCodePoint(0x23F0)} Даты командировки - ${userAnswers[chatId].answers[0]}\n@${username}`;
          break
        case "В отпуске":
          finalMessage = `<b>${userAnswers[chatId].category}</b>\n${String.fromCodePoint(0x1F464)} Имя - ${users[username]}\n${String.fromCodePoint(0x23F0)} Даты отпуска - ${userAnswers[chatId].answers[0]}\n@${username}`;
          break
        case "День за свой счет":
          finalMessage = `<b>${userAnswers[chatId].category}</b>\n${String.fromCodePoint(0x1F464)} Имя - ${users[username]}\n${String.fromCodePoint(0x23F0)} Дней взял - ${userAnswers[chatId].answers[0]}\n@${username}`;
          break
        case "На монтаже":
          finalMessage = `<b>${userAnswers[chatId].category}</b>\n${String.fromCodePoint(0x1F464)} Имя - ${users[username]}\n${String.fromCodePoint(0x23F0)} Будет в офисе - ${userAnswers[chatId].answers[0]}\n${String.fromCodePoint(0x2753)} Проект - ${userAnswers[chatId].answers[1]}\n@${username}`;
          break
      }

      bot.sendMessage(chatId, 'Мы передали твой ответ руководству. Ждем в офисе ' + String.fromCodePoint(0x1F49B));
      setTimeout(() => {
        bot.sendMessage(chatId, 'Мы записали твой прошлый ответ. Это окно с выбором понадобится тебе в следующий раз ' + String.fromCodePoint(0x1FAF6), options);
      }, 2000);
      try {
        bot.sendMessage(GROUP_CHAT_ID, finalMessage, {parse_mode: 'HTML'});
        // bot.sendMessage(TEST_GROUP_CHAT_ID, finalMessage, {parse_mode: 'HTML'});
        writeLog(chatId);

      } catch (error) {
        bot.sendMessage(GROUP_CHAT_ID, 'Произошла ошибка, пожалуйста, повтори отправку позже!', {parse_mode: 'HTML'});
        // bot.sendMessage(TEST_GROUP_CHAT_ID, 'Произошла ошибка, пожалуйста, повтори отправку позже!', {parse_mode: 'HTML'});
        console.log(error);
      }
    }
  }


});



function askQuestion(chatId) {
  const question = questions[userAnswers[chatId].category][userAnswers[chatId].currentQuestionIndex];
  bot.sendMessage(chatId, question);
}

function getDate(milliseconds) {
  let date = new Date(milliseconds);

  let day = date.getDate();
  let month = date.getMonth() + 1;
  let year = date.getFullYear();
  let hours = date.getHours();
  let minutes = date.getMinutes();

  return `${day}-${month}-${year}, ${hours}:${minutes}`;
}

let logCounter = 0;

function writeLog(chatId) {

  fs.appendFileSync(fileLogs, `${logCounter}. ${JSON.stringify(userAnswers[chatId])},\n\n`);
  delete userAnswers[chatId];
  ++logCounter;
}