const fs = require('fs');
const fetch = require('node-fetch');
const TelegramBot = require('node-telegram-bot-api');

// Token to access your Telegram bot
const telegramToken = '7805896464:AAEqSycWm1PiEEU0nzpJHi3qqzxgsDAFFSA';

// ID of your Telegram group where you want to send notifications
const telegramGroupId = '-1002489210171';

//  volume
const volumeThreshold = 30; // Replace with desired volume value -30 SOL HERE FOR EXAMPLE


const bot = new TelegramBot(telegramToken, { polling: false });

// Use a Set to store mints already present in the JSON file
let storedMints = new Set(readMintsFromFile());

// Function to read mints from JSON file
function readMintsFromFile() {
  try {
    const mintsData = fs.readFileSync('mints.json', 'utf8');
    return new Set(JSON.parse(mintsData));
  } catch (error) {
    console.error('Error reading JSON file:', error);
    return new Set();
  }
}

// Function to write mints into JSON file
function writeMintsToFile(mints) {
  const data = JSON.stringify(Array.from(mints));
  fs.writeFileSync('mints.json', data);
}

// Function to send a message on Telegram with all the data associated with the mint
async function sendMessageToTelegram(data) {
  const options = {
    parse_mode: 'HTML',
    reply_markup: JSON.stringify({
      inline_keyboard: [
        [
          { text: 'View on pumpfun', url: `https://www.pump.fun/${data.coinMint}` },
          { text: 'Fastest buybot', url: `https://t.me/solana_trojanbot?start=r-frankdege96642-${data.coinMint}` },
        ]
      ]
    }),
    disable_web_page_preview: true
  };

  const timestamp = new Date(data.creationTime);

  const message = `ℹ️ <b>NEW ALERT !  </b>\n\n` +
    `<b>💎 Mint :</b> <code>${data.coinMint}</code>\n` +
    `<b>📝 Name :</b> <code>${data.name}</code>\n` +
    `<b>🔹 Ticker :</b> <code>${data.ticker}</code>\n` +
    `<b>👥 Num. Holders :</b> ${data.numHolders}\n` +
    `<b>💰 Market Cap :</b> $${data.marketCap.toLocaleString()}\n` +
    `<b>📈 Volume :</b> ${data.volume}\n` +
    `<b>📊 Bonding Curve Progress :</b> ${data.bondingCurveProgress}%\n` +
    `<b>👤 Developer :</b> ${data.dev}\n\n` +
    `<b>⏰ Creation Time :</b> <code>${timestamp.toLocaleString()}</code>\n\n`;

  try {
    if (data.imageUrl) {
      try {
        let response = await fetch(data.imageUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image, status ${response.status}`);
        }

        const imageBuffer = await response.buffer();
        await bot.sendPhoto(telegramGroupId, imageBuffer, { ...options, caption: message });
        console.log('Message with image sent successfully');
      } catch (fetchError) {
        console.error('Error fetching image, sending message without image:', fetchError);
        await bot.sendMessage(telegramGroupId, message, options);
      }
    } else {
      await bot.sendMessage(telegramGroupId, message, options);
    }
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

// Function to retrieve API data
function fetchDataFromAPI() {
  const apiUrl = 'https://advanced-api.pump.fun/coins/list?sortBy=creationTime&marketCapFrom=58000&marketCapTo=65000';

  return fetch(apiUrl)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    });
}

// Function to display filtered data and update mints
function displayLatestData(data) {
  console.log(`Last recording in real time :`);
  console.log(data);

  // Filter data by market cap and volume
  const filteredData = data.filter(item =>
    item.marketCap >= 58000 &&
    item.marketCap <= 65000 &&
    item.volume > volumeThreshold //volume value you choose 
  );

  // Sort data by creation date
  filteredData.sort((a, b) => b.creationTime - a.creationTime);

  // filter new mints
  const newMints = filteredData.filter(item => !storedMints.has(item.coinMint));

  if (newMints.length > 0) {
    newMints.forEach(item => {
      sendMessageToTelegram(item);
    });

    // update new mints
    newMints.forEach(item => storedMints.add(item.coinMint));

    // update json with new mints
    writeMintsToFile(storedMints);

    console.log(`Number of new mints found :`, newMints.length);
  } else {
    console.log(`no new mint found`);
  }
}

// Recursive function to call fetchDataAndDisplay periodically
function fetchPeriodically() {
  console.log('Fetching data from the new API...');
  fetchDataFromAPI()
    .then(data => {
      displayLatestData(data);
    })
    .catch(error => {
      console.error('Data recovery problem :', error);
    })
    .finally(() => {
      setTimeout(fetchPeriodically, 10000); // Wait 10 seconds before the next fetch
    });
}

// intialize
fetchPeriodically();
