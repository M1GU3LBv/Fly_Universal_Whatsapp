
# Whatsapp Fly Bot

Whatsapp Fly Bot is a software project that enables users to interact with WhatsApp through a programming interface. Utilizing technologies such as Node.js and Puppeteer, this project provides an automated, programmatic way to send and receive WhatsApp messages, making it ideal for creating WhatsApp bots, automated customer service systems, and other automated messaging applications.


## Installation

Install my-project with npm

```bash
  npm install
  npm start
```
    
## Features

- Many messages listeners methods and image an audio transformation
- API feature to send messages using rest endpoint
- Usage of many endpoints to get custom data
- Easy deployment

## URL Reference

#### Login

```http
  GET /qr/
```

Shows the qr to login using your own whatsapp number 
#### Send messages

```http
  POST /send-message/
```

| Parameter | Type     | Example                  | Description                      |
| :-------- | :------- | :------------------------|:-------------------------------- |
| `to`      | `string` | "to":"51xxxxxxxxx@c.us"  |**Required**. Destination phone   |
| `message` | `string` |"message":"test"          |**Required**. Message             |

Endpoint to send messages using post method 

#### Logout

```http
  GET /logout/
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `id`      | `string` | **Required**. Id of item to fetch |


Close your session and redirects you to the qr login




## Authors

- [@anllacarpro](https://www.github.com/anllacarpro)
- [@M1GU3LBv](https://github.com/M1GU3LBv)

