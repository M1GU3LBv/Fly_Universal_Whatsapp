const { Client, LocalAuth} = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const moment = require('moment-timezone');
const QRCode = require('qrcode')
const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();
const client = new Client({
    restartOnAuthFail: true,
    puppeteer: {
        headless: true,
        args: [ '--no-sandbox', '--disable-setuid-sandbox' ]
    },
    ffmpeg: './ffmpeg.exe',
    authStrategy: new LocalAuth({ clientId: "client" })
});
const config = require('./config/config.json');

app.use(express.static('public'));
app.get('/generate-qr', async (req, res) => {
    const qrSVG = await QRCode.toString('Some text', { type: 'svg' });
    fs.writeFileSync('./public/qr.svg', qrSVG);
    res.send('QR Code generated!');
});
app.get('/qr', (req, res) => {
    res.sendFile(path.join(__dirname, './public/qr.svg'));
});

client.on('ready', () => {
    console.clear();
    const consoleText = './config/console.txt';
    fs.readFile(consoleText, 'utf-8', (err, data) => {
        if (err) {
            console.log(`[${moment().tz(config.timezone).format('HH:mm:ss')}] Console Text not found!`.yellow);
            console.log(`[${moment().tz(config.timezone).format('HH:mm:ss')}] ${config.name} is Already!`.green);
        } else {
            console.log(data.green);
            console.log(`[${moment().tz(config.timezone).format('HH:mm:ss')}] ${config.name} is Already!`.green);
        }
    });
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

app.listen(port, () => {
    console.log(`[${moment().tz(config.timezone).format('HH:mm:ss')}] Server is running on port ${port}!`.green);
});

client.initialize();
