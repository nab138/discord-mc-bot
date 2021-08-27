const Discord = require('discord.js');
const { token } = require('./token.json')
const client = new Discord.Client({intents: 32767});
const mineflayer = require('mineflayer')
const mineflayerViewer = require('prismarine-viewer').mineflayer
const config = require('./config.json')
const portfinder = require('portfinder')
const { execFile } = require('child_process');
const randomWord = require('random-word');
const { kill } = require('process');
const userBots = new Map();
const tunnelProcesses = new Map();
const threads = new Map();
const queue = new Map();
client.once('ready', () => {
	console.log('Ready!');
});
client.on('message', (message) => {
    if(message.author.bot) return;
    if(message.content == `<@${client.user.id}>` || message.content == `<@!${client.user.id}>`){
        const helpEmbed = new Discord.MessageEmbed()
        .setTitle("Discord MC Player")
        .setColor('5E9D34')
        .setDescription("**WARNING - This may result in your account being banned from some servers. Use with caution, and I am not responsible for any bans you recieve.**\n\nI'm **MC-Bot**. I can login to mojang or offline accounts, join servers, show you what the bot sees, and let you control the bot.\n\nContact nab138#2035 to report issues or suggestions, or, open an issue on the [Github repository](https://github.com/nab138/discord-mc-bot)\n\n__Commands:__")
        .addField(`${config.prefix}play`, `Join a minecraft server`, true)
        .addField(`${config.prefix}disconnect`, `End your current session`, true)
        .setAuthor(client.user.username, client.user.displayAvatarURL(), `https://github.com/nab138/discord-mc-bot`)
        message.reply({embeds: [helpEmbed]})
    }
    if(!message.content.startsWith(config.prefix)) return
	const args = message.content.slice(config.prefix.length).trim().split(/ +/);
	const command = args.shift().toLowerCase();
    if(command == 'disconnect'){
        if(!userBots.has(message.author.id)) return message.reply("You don't have an active bot!")
        disconnect(true, message)
        message.react('👍')
    }
    else if(command == 'help' || command == 'info'){
        const helpEmbed = new Discord.MessageEmbed()
        .setTitle("Discord MC Player")
        .setColor('5E9D34')
        .setDescription("**WARNING - This may result in your account being banned from some servers. Use with caution, and I am not responsible for any bans you recieve.**\n\nI'm **MC-Bot**. I can login to mojang or offline accounts, join servers, show you what the bot sees, and let you control the bot.\n\nContact nab138#2035 to report issues or suggestions, or, open an issue on the [Github repository](https://github.com/nab138/discord-mc-bot)\n\n__Commands:__")
        .addField(`${config.prefix}play`, `Join a minecraft server`, true)
        .addField(`${config.prefix}disconnect`, `End your current session`, true)
        .setAuthor(client.user.username, client.user.displayAvatarURL(), `https://github.com/nab138/discord-mc-bot`)
        message.reply({embeds: [helpEmbed]})
    }
    else if(command == 'play'){
        if(queue.has(message.author.id)) return message.reply("Finish your first session first :bruh:")
        if(userBots.has(message.author.id)) return message.reply("You already have an active bot!")
        queue.set(message.author.id, true)
        let email = ''
        let password = ''
        let offline = false;
        let ip = ''
        let port = '25565'
        message.reply('Please type the account email (Username for offline account)').then(msg => {
            const filter = m => m.author.id === message.author.id && !m.content.includes(' ');
            message.channel.awaitMessages({ filter: filter, max: 1, time: 30000, errors: ['time'] })
            .then(collected => {
                email = collected.first().content;
                message.channel.send(`Would you like your account to be offline? (y/n)`).then(msg => {
                    const filter = m => m.author.id === message.author.id && m.content.toLowerCase() == 'y' || m.author.id === message.author.id && m.content.toLowerCase() == 'n';
                    message.channel.awaitMessages({ filter: filter, max: 1, time: 30000, errors: ['time'] })
                    .then(collected => {
                        if(collected.first().content == "y" || collected.first().content == "yes") offline = true
                        else if (collected.first().content != "n" && collected.first().content != "no") return message.channel.send("That is not a valid response!")
                        if(offline){
                            message.channel.send("What server IP do you want to connect to?").then(msg => {
                                const filter = m => m.author.id === message.author.id;
                                message.channel.awaitMessages({ filter: filter, max: 1, time: 30000, errors: ['time'] })
                                .then(collected => {
                                    if(collected.first().content.toLowerCase() == 'hypixel.net') return message.channel.send("This bot might get you banned from hypixel. It has been disabled.")
                                    ip = collected.first().content.toLowerCase()
                                    message.channel.send("What server port do you want to connect to? (default is 25565)").then(msg => {
                                        const filter = m => m.author.id === message.author.id && !isNaN(m.content);
                                        message.channel.awaitMessages({ filter: filter, max: 1, time: 30000, errors: ['time'] })
                                        .then(collected => {
                                            port = collected.first().content
                                            connect(offline, email, password, ip, port, message)
                                        })
                                        .catch(collected => {
                                            queue.delete(message.author.id)
                                            message.channel.send('Cancelling...');
                                        });
                                    })
                                })
                                .catch(collected => {
                                    queue.delete(message.author.id)
                                    message.channel.send('Cancelling...');
                                });
                            })
                        }
                        else {
                            message.author.send("What is your accounts password? This will not be stored and only sent to mojang for authentication.").then(msg => {
                                message.channel.send('Check your DM\'s for further instructions.')
                                message.author.dmChannel.awaitMessages({ max: 1, time: 30000, errors: ['time'] })
                                .then(collected => {
                                    password = collected.first().content
                                    message.author.send("Look back in the server you ran the command for further instructions.")
                                    message.channel.send("What server IP do you want to connect to?").then(msg => {
                                        const filter = m => m.author.id === message.author.id;
                                        message.channel.awaitMessages({ filter: filter, max: 1, time: 30000, errors: ['time'] })
                                        .then(collected => {
                                            ip = collected.first().content
                                            message.channel.send("What server port do you want to connect to? (default is 25565)").then(msg => {
                                                const filter = m => m.author.id === message.author.id;
                                                message.channel.awaitMessages({ filter: filter, max: 1, time: 30000, errors: ['time'] })
                                                .then(collected => {
                                                    port = collected.first().content
                                                    connect(offline, email, password, ip, port, message)
                                                })
                                                .catch(collected => {
                                                    queue.delete(message.author.id)
                                                    message.channel.send('Cancelling...');
                                                });
                                            })
                                        })
                                        })
                                        .catch(collected => {
                                            queue.delete(message.author.id)
                                            message.channel.send('Cancelling...');
                                        });
                                    })
                                })
                                .catch(collected => {
                                    queue.delete(message.author.id)
                                    message.author.send('Cancelling...');
                                });
                        }
                    })
                    .catch(collected => {
                        queue.delete(message.author.id)
                        message.channel.send('Cancelling...');
                    });
                })
            })
            .catch(collected => {
                queue.delete(message.author.id)
                message.channel.send('Cancelling...');
            });
        })
    }
})
async function connect(offline, username, password, ip, port, message){
    queue.delete(message.author.id)
    message.channel.send("Connecting...")
    let bot;
    if(offline){
        bot = mineflayer.createBot({
            host: ip,
            username: username,
            port: port
        })
    } else {
        bot = mineflayer.createBot({
            host: ip,
            username: username,
            port: port,
            password: password,
        })
    }
    bot.on('error', e => { 
        if(e.stack.includes("ENOENT") || e.stack.includes("ECONNREFUSED")){
            return message.channel.send("The IP and/or port are invalid!")
        } else if (e.stack.includes("Invalid credentials.")){
            return message.channel.send("Invalid username or password!")
        }
        message.channel.send(`An unkown error occured.`)
        message.channel.send(`Stack trace: ${e.stack}`)
        disconnect(false, message, true)
    })
    bot.on('login', () => {
        setTimeout(function(){disconnect(true, message, true, true)}, 3600000);
        userBots.set(message.author.id, bot)
        message.channel.send("Connected!")
        const ctrlEmbed = new Discord.MessageEmbed()
        .setTitle("Controls")
        .setColor("#5b8b32")
        portfinder.getPort(async function (err, port) {
            mineflayerViewer(bot, { port: port })
            let tunnel = await exposePort(port, message)
            tunnelProcesses.set(message.author.id, tunnel)
            ctrlEmbed.setDescription(`Use the buttons to control the bot! Send messages in the opened thread to chat. \n[Viewer](https://${tunnel.word}.ejemplo.me)`)
            console.log(ctrlEmbed.description)
            const row1 = new Discord.MessageActionRow()
            .addComponents([
            new Discord.MessageButton()
                .setCustomId('click')
                .setEmoji('🤛')
                .setStyle('PRIMARY'),
            new Discord.MessageButton()
                .setCustomId('up')
                .setEmoji('⬆️')
                .setStyle('PRIMARY'),
            new Discord.MessageButton()
                .setCustomId('rclick')
                .setEmoji('🤜')
                .setStyle('PRIMARY'),
            ]
            );
            const row2 = new Discord.MessageActionRow()
            .addComponents([
            new Discord.MessageButton()
                .setCustomId('left')
                .setEmoji('⬅️')
                .setStyle('PRIMARY'),
            new Discord.MessageButton()
                .setCustomId('sneak')
                .setEmoji('⏬')
                .setStyle('PRIMARY'),
            new Discord.MessageButton()
                .setCustomId('right')
                .setEmoji('➡️')
                .setStyle('PRIMARY'),
            ]
            );
            const row3 = new Discord.MessageActionRow()
            .addComponents([
                new Discord.MessageButton()
                .setCustomId('sprint')
                .setEmoji('⏫')
                .setStyle('PRIMARY'),
            new Discord.MessageButton()
                .setCustomId('down')
                .setEmoji('⬇️')
                .setStyle('PRIMARY'),
            new Discord.MessageButton()
                .setCustomId('jump')
                .setEmoji('🔼')
                .setStyle('PRIMARY'),
            ]
            );
            message.channel.send({embeds: [ctrlEmbed], components: [row1, row2, row3]}).then( async (msg) => {
                const filter = m => m.author.id == message.author.id;
                const thread = await message.channel.threads.create({
                    name: message.author.username + '\'s MC',
                    autoArchiveDuration: 60,
                    reason: 'They started a minecraft session',
                });
                threads.set(message.author.id, thread)
                const collector = thread.createMessageCollector({ filter: filter, time: 3600000 });

                collector.on('collect', m => {
                    bot.chat(m.content)
                });

                collector.on('end', collected => {
                    message.channel.send("Ending session...")
                });
                const rcollector = message.channel.createMessageComponentCollector({ componentType: 'BUTTON', time: 3600000 });

                rcollector.on('collect', async i => {
                    await i.deferUpdate();
                    if (i.user.id != message.author.id) return
                    switch(i.customId){
                        case 'up':
                            bot.controlState.forward = !bot.controlState.forward
                            break
                        case 'down':
                            bot.controlState.back = !bot.controlState.back
                            break
                        case 'left':
                            bot.controlState.left = !bot.controlState.left
                            break
                        case 'right':
                            bot.controlState.right = !bot.controlState.right
                            break
                        case 'sneak':
                            bot.controlState.sneak = !bot.controlState.sneak
                            break
                        case 'jump':
                            bot.controlState.jump = !bot.controlState.jump
                            break
                        case 'sprint':
                            bot.controlState.sprint = !bot.controlState.sprint
                            break   
                        case 'click':
                            let nearestEntity = await bot.nearestEntity(match = (entity) => { return true })
                            if(nearestEntity != null) bot.attack(nearestEntity)
                            break
                        case 'rclick':
                            let block = bot.blockAtCursor(maxDistance=256)
                            if(block != null) bot.activateBlock(block)
                            break
                    }
                });
            });
        })
    })
    bot.on('kicked', e => {
        disconnect(false, message)
        message.channel.send("You have been disconnected!")
    })
    bot.on('messagestr', (msg, pos, jmsg) => {
        if(threads.has(message.author.id) && !msg.startsWith(`<${bot.username}>`)) threads.get(message.author.id).send(msg.replace(/@/g, "(a)").replace(/\|/g, "\\|") + 'ㅤ')
    })
}
async function exposePort(port, message){
    let word = randomWord()
    let proc = await startTunnel(port, word, message)
    if(proc == 'e'){
        return exposePort(port, message)
    } else if(proc == 'ep') {
        console.log("Pgrok binary not found")
        process.exit()
    }
    else {
        return { word: word, proc: proc }
    }
}
async function startTunnel(port, word, message){
    let fileNames = new Map()
    fileNames.set('win32', '.\\pgrok.exe')
    fileNames.set('linux', './pgrok')
    fileNames.set('darwin', './pgrok')
    // Let the user know if pgrok.exe is missing
    if(!require('fs').existsSync(fileNames.get(process.platform))) return 'ep'
    let hi = execFile(fileNames.get(process.platform), [`-subdomain=${word}`, port], (err, stdout, stderr) => {
        if (err) {
          message.channel.send(`Viewer Closed.`);
          console.clear()
          console.log("hi")
        }
        if(stdout.includes("already registered")) {
            return 'e';
        }
    });
    return hi
}
function disconnect(killBot, message, check, timeout){
    if(!userBots.has(message.author.id) && check) return
    if(killBot){
        userBots.get(message.author.id).end()
        userBots.delete(message.author.id)
    }
    if(tunnelProcesses.has(message.author.id)) {
        tunnelProcesses.get(message.author.id).proc.kill('SIGINT') 
        tunnelProcesses.delete(message.author.id)
    }
    if(threads.has(message.author.id)) threads.get(message.author.id).delete()
    threads.delete(message.author.id)
    if(timeout){
        message.reply("The bot has reached the 60 minute max.")
    }
}
client.login(token);