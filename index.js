const { Client, RemoteAuth, MessageMedia } = require('whatsapp-web.js');

const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');
const moment = require('moment-timezone');
const QRCode = require('qrcode')
const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();
const googleTTS = require('google-tts-api');

mongoose.connect(process.env.MONGO_PRIVATE_URL).then(async () => {
    const store = new MongoStore({ mongoose: mongoose });
    let sessionData = null;

    if (await store.sessionExists('client')) {
        sessionData = await store.extract('client');
    }

    const client = new Client({
        restartOnAuthFail: true,
        puppeteer: {
            headless: true,
            args: [ '--no-sandbox', '--disable-setuid-sandbox' ]
        },
        ffmpeg: './ffmpeg.exe',
        authStrategy: new RemoteAuth({

            store: store,
            backupSyncIntervalMs: 300000,
            session: 'client'
        }),
        
    });
    
    async function initializeClient(client) {
        try {
            await client.initialize();
        } catch (error) {
            console.log('Error initializing client, retrying in 5 seconds', error);
            setTimeout(() => initializeClient(client), 5000);
        }
    }
    
    initializeClient(client);

    client.on('remote_session_saved', () => {
        console.log('Session data saved successfully');
    });













 
let qrSVG = '';
const config = require('./config/config.json');

client.on('qr', async (qr) => {
    console.log(`[${moment().tz(config.timezone).format('HH:mm:ss')}] Escanea el codigo` );
    qrSVG = await QRCode.toString(qr, { type: 'svg'}); 
});

app.get('/qr', (req, res) => {
    const html = `
        <div style="width: 500px; height: 500px;">
            ${qrSVG}
        </div>
    `;
    res.send(html);
});

app.use(express.static('public'));


client.on('ready', () => {
    console.clear();
    console.log(`[${moment().tz(config.timezone).format('HH:mm:ss')}] ready`);
    console.log(`[${moment().tz(config.timezone).format('HH:mm:ss')}] ${client.info.pushname}`);    
    
    // store.save({ session: 'client' });
    
});
app.use(express.json()); // Para poder parsear el cuerpo de las solicitudes POST en formato JSON

app.post('/send-message', async (req, res) => {
    const { to, message } = req.body;

    if (!to || !message) {
        return res.status(400).json({ error: 'Faltan los campos "to" o "message".' });
    }

    try {
        await client.sendMessage(to, message);
        res.status(200).json({ success: 'Mensaje enviado con éxito.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al enviar el mensaje.' });
    }
});

const port = process.env.PORT || 3000; // 3000 es el puerto predeterminado en caso de que no se proporcione PORT
app.get('/logout', (req, res) => {
    client.logout();
    console.log(`[${moment().tz(config.timezone).format('HH:mm:ss')}] Cerrando sesión..`);
    res.redirect('/qr');
});

app.listen(port, () => {
    console.log(`Servidor iniciado en el puerto ${port}`);
});


client.on('message', async (message) => {
    if(message.body.startsWith(`${config.prefix}weather`)) {
        const url = message.body.split(`${config.prefix}weather `)[1];
        if (url) {
            try {
                const response = await fetch(`https://wttr.in/${url}?format=j1`);
                const data = await response.json();
                const weatherMessage = `*[🌤] Weather :* ${data.current_condition[0].FeelsLikeC}°C\n*[🌡] Temperature :* ${data.current_condition[0].temp_C}°C\n*[💧] Humidity :* ${data.current_condition[0].humidity}%\n*[🌬] Wind :* ${data.current_condition[0].windspeedKmph}km/h`;
                message.reply(weatherMessage);
            } catch (error) {
                console.error(error);
                message.reply('Failed to get the weather.');
            }
        }
    }
    else if(message.body.startsWith(`${config.prefix}location`)) {
        const url = message.body.split(`${config.prefix}location `)[1];
        if (url) {
            try {
                const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${url}.json?access_token=${config.mapboxToken}`);
                const data = await response.json();
                const locationMessage = `*[📍] Location :* ${data.features[0].place_name}`;
                message.reply(locationMessage);
            } catch (error) {
                console.error(error);
                message.reply('Failed to get the location.');
            }
        }
    }
    else if (message.body.startsWith(`${config.prefix}love`)) {
        const names = message.body.split(' ').slice(1);
        if(names.length !== 2) {
            client.sendMessage(message.from, 'Por favor, proporciona exactamente dos nombres.');
            return;
        }
        const percentage = Math.floor(Math.random() * 101);
        const emoji = percentage > 50 ? '❤️' : '💔';
        const loveMessage = `El amor entre ${names[0]} y ${names[1]} es del ${percentage}% ${emoji}`;
        message.reply(loveMessage);
    }
    else if(message.body.startsWith(`${config.prefix}joke`)) {
        try {
            const response = await fetch('https://v2.jokeapi.dev/joke/Any?lang=es');
            const data = await response.json();
            const jokeMessage = data.setup ? `${data.setup}\n\n${data.delivery}` : data.joke;
            client.sendMessage(message.from, jokeMessage);
        } catch (error) {
            console.error(error);
            client.sendMessage(message.from, 'Failed to get a joke.');
        }
    }
    else if(message.body.startsWith(`${config.prefix}dick`)) {
    const medida = Math.floor(Math.random() * 30);
    message.reply(`Tu pene mide ${medida} cm`);
    }
    else if( message.body.startsWith(`${config.prefix}info`)) {
        const infoMessage = `*[🤖] Name :* ${config.name}\n*[👤] Author :* ${config.author}\n*[🎃] GitHub :* ${config.github}\n*[🌐] Version :* ${config.version}\n*[📆] Update :* ${config.update}`;
        message.reply(infoMessage);
    }
    else if (message.body === '@everyone') {
        const isGroup = message.from.endsWith('@g.us');
        if (isGroup) {
            let chat = await client.getChatById(message.from);
            let mentions = [];

            for(let participant of chat.participants) {
                mentions.push(participant.id._serialized);
            }

            // Comprueba si el remitente del mensaje es un administrador del grupo
            const sender = chat.participants.find(participant => participant.id._serialized === message.author);
            if (sender && sender.isAdmin) {
                chat.sendMessage('Mentioning everyone 🤖', {
                    mentions: mentions
                });
            }else{
                chat.sendMessage('You are not an admin 🤖');
            }
        }
    }
    else if (message.body.startsWith(`${config.prefix}levantate`)) {
        // Lee el archivo de audio
        const file = fs.readFileSync('./static/audio/x2mate.com - levantate de pie muchacho (128 kbps).mp3');
        
        // Crea un objeto MessageMedia
        const media = new MessageMedia('audio/mp3', file.toString('base64'));
        
        // Envía el audio
        message.reply(media);
    }
    else if (message.body.startsWith(`${config.prefix}vamos`))
    {
        const file = fs.readFileSync('./static/audio/vamos gg brianeitor [TubeRipper.com].mp3');
        
        // Crea un objeto MessageMedia
        const media = new MessageMedia('audio/mp3', file.toString('base64'));
        
        // Envía el audio
        message.reply(media);
    }
    else if (message.body.startsWith(`${config.prefix}tts`)) {
        const text = message.body.slice(`${config.prefix}tts`.length).trim();
        if (text) {
            try {
                const url = googleTTS.getAudioUrl(text, {
                    lang: 'es',
                    slow: false,
                    host: 'https://translate.google.com',
                });
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const media = new MessageMedia('audio/mp3', buffer.toString('base64'));
                message.reply(media);
            } catch (error) {
                console.error(error);
                message.reply('Failed to convert text to speech.');
            }
        }
    }
    else if(message.body.startsWith(`${config.prefix}ping`)) {
        const timestamp = moment();
        const start = moment();
        await message.reply('*[⏳]* Loading..');
        const end = moment();
        const diff = end - start;
        message.reply(`*[🤖] Ping :* ${diff}ms`);
    } else if(message.body.startsWith(`${config.prefix}uptime`)) {
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        const uptimeMessage = `⏳Uptime: ${hours}h ${minutes}m ${seconds}s`;

        client.sendMessage(message.from, uptimeMessage);
    }
});
client.on('message', async (message) => {
    const isGroups = message.from.endsWith('@g.us') ? true : false;
    if ((isGroups && config.groups) || !isGroups) {

        const isGroupMessage = message.from.endsWith('@g.us');

        // Image to Sticker (Auto && Caption)
        if (!isGroupMessage && (message.type == "image" || message.type == "video" || message.type  == "gif") || (message._data.caption == `${config.prefix}sticker`)) {
            client.sendMessage(message.from, "*[⏳]* Loading..");
            try {
                const media = await message.downloadMedia();
                client.sendMessage(message.from, media, {
                    sendMediaAsSticker: true,
                    stickerName: config.name, // Sticker Name = Edit in 'config/config.json'
                    stickerAuthor: config.author // Sticker Author = Edit in 'config/config.json'
                }).then(() => {
                    client.sendMessage(message.from, "*[✅]* Successfully!");
                });
            } catch {
                client.sendMessage(message.from, "*[❎]* Failed!");
            }

        // Image to Sticker (With Reply Image)
        } else if (!isGroupMessage && message.body == `${config.prefix}sticker`) {
            const quotedMsg = await message.getQuotedMessage(); 
            if (message.hasQuotedMsg && quotedMsg.hasMedia) {
                client.sendMessage(message.from, "*[⏳]* Loading..");
                try {
                    const media = await quotedMsg.downloadMedia();
                    client.sendMessage(message.from, media, {
                        sendMediaAsSticker: true,
                        stickerName: config.name, // Sticker Name = Edit in 'config/config.json'
                        stickerAuthor: config.author // Sticker Author = Edit in 'config/config.json'
                    }).then(() => {
                        client.sendMessage(message.from, "*[✅]* Successfully!");
                    });
                } catch {
                    client.sendMessage(message.from, "*[❎]* Failed!");
                }
            } else {
                client.sendMessage(message.from, "*[❎]* Reply Image First!");
            }

        // Sticker to Image (Auto)
        } else if (!isGroupMessage && message.type == "sticker") {
            client.sendMessage(message.from, "*[⏳]* Loading..");
            try {
                const media = await message.downloadMedia();
                client.sendMessage(message.from, media).then(() => {
                    client.sendMessage(message.from, "*[✅]* Successfully!");
                });  
            } catch {
                client.sendMessage(message.from, "*[❎]* Failed!");
            }

        // Sticker to Image (With Reply Sticker)
        } else if (!isGroupMessage && message.body == `${config.prefix}image`) {
            const quotedMsg = await message.getQuotedMessage(); 
            if (message.hasQuotedMsg && quotedMsg.hasMedia) {
                client.sendMessage(message.from, "*[⏳]* Loading..");
                try {
                    const media = await quotedMsg.downloadMedia();
                    client.sendMessage(message.from, media).then(() => {
                        client.sendMessage(message.from, "*[✅]* Successfully!");
                    });
                } catch {
                    client.sendMessage(message.from, "*[❎]* Failed!");
                }
            } else {
                client.sendMessage(message.from, "*[❎]* Reply Sticker First!");
            }
            

        // Claim or change sticker name and sticker author
        } else if (!isGroupMessage && message.body.startsWith(`${config.prefix}change`)) {
            if (message.body.includes('|')) {
                let name = message.body.split('|')[0].replace(message.body.split(' ')[0], '').trim();
                let author = message.body.split('|')[1].trim();
                const quotedMsg = await message.getQuotedMessage(); 
                if (message.hasQuotedMsg && quotedMsg.hasMedia) {
                    client.sendMessage(message.from, "*[⏳]* Loading..");
                    try {
                        const media = await quotedMsg.downloadMedia();
                        client.sendMessage(message.from, media, {
                            sendMediaAsSticker: true,
                            stickerName: name,
                            stickerAuthor: author
                        }).then(() => {
                            client.sendMessage(message.from, "*[✅]* Successfully!");
                        });
                    } catch {
                        client.sendMessage(message.from, "*[❎]* Failed!");
                    }
                } else {
                    client.sendMessage(message.from, "*[❎]* Reply Sticker First!");
                }
            } else {
                client.sendMessage(message.from, `*[❎]* Run the command :\n*${config.prefix}change <name> | <author>*`);
            }
        
        // Read chat
        } else {
            client.getChatById(message.id.remote).then(async (chat) => {
                await chat.sendSeen();
            });
        }
    }
});































client.on("message", async (message) => {
    if (message.body.startsWith(`${config.prefix}help`)) {
      client.sendMessage(
        message.from,
        `*[🤖] Commands :*\n\n*${config.prefix}sticker* - Convert Image to Sticker\n*${config.prefix}image* - Convert Sticker to Image\n*${config.prefix}change <name> | <author>* - Change Sticker Name and Sticker Author\n*${config.prefix}weather <location>* - Show Weather\n*${config.prefix}location <location>* - Show Location\n*${config.prefix}love <name> <name>* - Check Love\n*${config.prefix}joke* - Show Joke\n*${config.prefix}tts <text>* - Convert Text to Speech\n\n*${config.prefix}help* - Show Commands\n*${config.prefix}info* - Show Information\n*${config.prefix}ping* - Show Ping\n*${config.prefix}uptime* - Show Uptime\n*${config.prefix}about* - Show About`,
        { quotedMessageId: message.id._serialized }
      );
    }
  });
  
});