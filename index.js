const Discord = require('discord.js');
const path = require('path');
const log4js = require('log4js');
const request = require("request");
const filesystem = require("fs");
const GoogleImages = require('google-images');
const config = require("./config.json");
const botmessages = require("./botmsgs.json");
const GiphyAPI = require('giphy-api')({
    "https": true,
	"apiKey": config.GiphyKey
});
const OperatingSys = require("os");
const client = new Discord.Client({autoReconnect: true, max_message_cache: 0});
const GoogleCSE = new GoogleImages(config.GoogleCSEID, config.GoogleAPIKey);

log4js.configure({
  appenders: {
        logs: { type: 'file', filename: path.join(__dirname, config.logsdirectory + '/' + config.logspath) },
        exceptions: {  type: 'file', filename: path.join(__dirname, config.logsdirectory + '/' + config.excepath) },
        warnings: {  type: 'file', filename: path.join(__dirname, config.logsdirectory + '/' + config.warnpath) },
        rejections: {  type: 'file', filename: path.join(__dirname, config.logsdirectory + '/' + config.rejepath) }
  },
  categories: {
        default: { appenders: ['logs'], level: 'debug' },
        'exception': { appenders: ['exceptions'], level: 'error' },
        'warning': { appenders: ['warnings'], level: 'warn' },
        'rejection':  { appenders: ['rejections'], level: 'fatal' }
  }
});

const logger = log4js.getLogger('logs');
const excep = log4js.getLogger('exception');
const warni = log4js.getLogger('warning');
const rejec = log4js.getLogger('rejection');

process.on('exit', (code) => {
  if(CheckDebugMode() != true) return;
  console.debug("BOT is exiting with code: " + code);
  logger.debug("BOT is exiting with code: " + code);
});
process.on('uncaughtException', function (err) {
    console.log("Uncaught Exception Detected... (Check the logs: `../logs/" + config.excepath + "`)");
    excep.error("Uncaught Exception Detected!!");
    excep.error("ERROR: " + err);
    if (err.code == 'ECONNRESET') excep.error("Stack trace: " + err.stack);
    else process.exit(0);
});
process.on('unhandledRejection', function (reason, p)
{
	console.log("Unhandled Rejection...  (Check the logs: `../logs/" + config.rejepath + "`)");
	rejec.fatal('Unhandled Rejection...');
	rejec.fatal('Issue at: ' + p);
	rejec.fatal('Reason: ' + reason);
});
process.on('warning', function (warning) {
    console.log("Uncaught Warning Detected... (Check the logs: `../logs/" + config.warnpath + "`)");
    warni.warn("Uncaught Warning Detected!!");
    warni.warn("Warning Name: " + warning.name);
    warni.warn("Warning Message: " + warning.message);
    warni.warn("Warning Code: " + warning.code);
    warni.warn("Warning Stack trace: " + warning.stack);
    warni.warn("Warning Details: " + warning.detail);
});
const EmbedColors =
{
       default: 0,
       aqua: 1752220,
       green: 3066993,
       blue: 3447003,
       purple: 10181046,
       gold: 15844367,
       orange: 15105570,
       red: 15158332,
       grey: 9807270,
       navy: 3426654,
	   cyan: 1277892,
	   brown: 11356937,
	   dark_navy: 2899536,
       dark_grey: 9936031,
       dark_aqua: 1146986,
       dark_green: 2067276,
       dark_blue: 2123412,
       dark_purple: 7419530,
       dark_gold: 12745742,
       dark_orange: 11027200,
       dark_red: 10038562,
       light_grey: 12370112
};
var MuteRole = {id: void 0};

client.on('ready', () => {
  if(CheckDebugMode())
  {
	 console.info("INFO: DEBUG Mode is Enabled!!");
	 console.debug("NodeJS Executable Path: " + process.execPath);
	 console.debug("NodeJS Version: " + process.version);
	 console.debug("NodeJS Process PID: " + process.pid);
	 console.debug("NodeJS Process Debug Port: " + process.debugPort);
	 console.debug("Operating System: " + GetNodeOS());
	 console.debug("CPU Architecture: " + GetNodeArch());
     console.debug("Current Directory: " + __dirname);
     var readyMessage = ('Logged in as @' + client.user.tag + ' successfully, with ' + client.users.size + ' users and ' + client.channels.size + ' channels of ' + client.guilds.size + ' guilds.');
     console.debug(readyMessage);
	 logger.debug(readyMessage);
  }
  client.user.setActivity("Serving " + client.guilds.size + " servers | " + config.cmdPrefix + "help", { type: "CUSTOM_STATUS" });
  client.user.setStatus('dnd').catch(excep.error);
  client.guilds.forEach(async (guild, id) => {
	if(!(MuteRole = client.guilds.get(id).roles.find(val => val.name === "Muted")))
	{
		try
		{
			MuteRole = client.guilds.get(id).createRole({
				name: "Muted",
				color: "#000000",
				permissions:[]
			});
			console.log("Created 'Muted' Role for the Guild \"" + guild + "\"(ID: " + id + ")");
			logger.log("Created 'Muted' Role for the Guild \"" + guild + "\"(ID: " + id + ")");
		}
		catch(e)
		{
			console.log(e.stack);
			excep.error(e);
		}
	}
  });
  FetchMembersCountByStatus().then((usercount) => {console.log("Online: " + usercount);});
  FetchMembersCountByStatus('idle').then((usercount) => {console.log("Idle: " + usercount);});
  _READYTS = Date.now();
});

client.on('reconnecting',() => {
  if(CheckDebugMode() != true) return;
  console.debug("Reconnecting...");
  logger.debug("Reconnecting...");
});

client.on("disconnect", event => {
	if(CheckDebugMode() != true) return;
	console.debug("Disconnected: " + event.reason + " (" + event.code + ")");
	logger.debug("Disconnected: " + event.reason + " (" + event.code + ")");
});

client.on('guildMemberAdd', member => {
  if(member.guild.systemChannel)
  {
     member.guild.systemChannel.send(new Discord.RichEmbed().setTitle("A new member has arrived").setDescription("Welcome <@" + member.id + "> to ***" + member.guild.name + "***'s Discord Server. Feel free to Check " + member.guild.name + " Community's General Command List by executing the command " + config.cmdPrefix + "help")
	                                                                        .setThumbnail(member.displayAvatarURL)
																			.addField("Members now", member.guild.memberCount)
																			.setTimestamp());
  }
});

client.on('guildMemberRemove', member => {
  if(member.guild.systemChannel)
  {
     member.guild.systemChannel.send(new Discord.RichEmbed().setTitle("A member is leaving").setDescription("<@" + member.id + "> has left ***" + member.guild.name + "***'s Discord server")
	                                                                        .setThumbnail(member.displayAvatarURL)
																			.addField("Members left", member.guild.memberCount)
																			.setTimestamp());
  }
});

client.on("guildCreate", guild => {
  if(CheckDebugMode() == true) console.debug("The BOT has been Invited to '" + guild.name + "' (GuildID: " + guild.id + " | MembersCount: " + guild.memberCount + " | ChannelsCount: " + guild.channels.size + ")");
  client.user.setActivity("Serving " + client.guilds.size + " servers | " + config.cmdPrefix + "help");
  guild.systemChannel.send(new Discord.RichEmbed().setTitle("Greetings").setDescription("Thanks for inviting the BOT! use " + config.cmdPrefix + "help to view the list of available commands.")
                    												       .setThumbnail(client.user.displayAvatarURL)
																	       .addField("BOT ID", "<@" + client.user.id + ">", true)
																		   .addField("Developer ID", "<@" + config.DevID + ">", true)
																		   .addField("BOT Version", config.scriptVersion, true)
																		   .addField("BOT First release DateTime", new Date(config.first_release_date).toString(), true)
																		   .addField("BOT Last release DateTime", new Date(config.last_release_date).toString(), true)
																		   .addField("BOT Command Prefix", "`" + config.cmdPrefix + "`", true)
																	       .addField("Managed Members", client.users.size, true)
																	       .addField("Managed Channels", client.channels.size, true)
																	       .addField("Managed Guilds", client.guilds.size, true)
																	       .setColor(EmbedColors.aqua));
});

client.on("guildDelete", guild => {
  if(CheckDebugMode() == true) console.debug("The BOT has been Kicked/Banned from " + guild.name + " (GuildID: " + guild.id + ")");
  client.user.setActivity("Serving " + client.guilds.size + " servers | " + config.cmdPrefix + "help");
});

var commands = [
		{
			command: "invite",
			premium: false,
			alias: ["botstats"],
			description: "Fetches the BOT's Invite Link!",
			parameters: [],
			execute: function(message, params) {
		    	message.channel.send(new Discord.RichEmbed().setTitle("Inviting the Magic").setDescription("Use this [invite](https://discordapp.com/oauth2/authorize?client_id=" + config.BOTclientID + "&scope=bot&permissions=8) to invite the bot to your server!")
                    .setThumbnail(client.user.displayAvatarURL)
					.addField("BOT ID", "<@" + client.user.id + ">", true)
					.addField("Managed Members", client.users.size, true)
					.addField("Managed Channels", client.channels.size, true)
					.addField("Served Guilds", client.guilds.size, true)
					.setColor(EmbedColors.gold));
			}
		},
		{
			command: "botinfo",
			premium: false,
			alias: [],
			description: "Fetches detailed info about the BOT",
			parameters: [],
			execute: function(message, params) {
		    	message.channel.send(new Discord.RichEmbed().setTitle(config.BOTname + " " + config.scriptVersion).setDescription("Use this [invite](https://discordapp.com/oauth2/authorize?client_id=" + config.BOTclientID + "&scope=bot&permissions=8) to invite the bot to your server!")
                    .setThumbnail(client.user.displayAvatarURL)
					.addField("BOT ID", "<@" + client.user.id + ">", true)
					.addField("Managed Members", client.users.size, true)
					.addField("Managed Channels", client.channels.size, true)
					.addField("Served Guilds", client.guilds.size, true)
					.setColor(EmbedColors.gold));
			}
		},
		{
			command: "memoryusage",
			premium: false,
			alias: ["memory"],
			description: "Fetches detailed info about the BOT",
			parameters: [],
			execute: function(message, params) {
		    	message.channel.send(new Discord.RichEmbed().setTitle(config.BOTname + " " + config.scriptVersion).setDescription("Use this [invite](https://discordapp.com/oauth2/authorize?client_id=" + config.BOTclientID + "&scope=bot&permissions=8) to invite the bot to your server!")
                    .setThumbnail(client.user.displayAvatarURL)
					.addField("BOT ID", "<@" + client.user.id + ">", true)
					.addField("Managed Members", client.users.size, true)
					.addField("Managed Channels", client.channels.size, true)
					.addField("Served Guilds", client.guilds.size, true)
					.setColor(EmbedColors.gold));
			}
		},
		{
			command: "ping",
			premium: false,
			alias: [],
			description: "Fetches the BOT's Command Processing Speed in milliseconds!",
			parameters: [],
			execute: function(message, params) {
				message.channel.send("Pinging ...").then((msg) => {
					msg.edit("Guild Command-Processing Ping is " + (Date.now() - msg.createdTimestamp) + "ms. API Latency is " + Math.round(client.ping) + "ms");
				});
			}
		},
		{
    		command: "imagesearch",
			premium: false,
			alias: [],
			description: "Searchs around the Internet for an Image!",
			parameters: ["limit","Category"],
			execute: function (message, params) {
				params[2] = message.content.replace("\\" + config.cmdPrefix + "(.*){0,30}\s\d{0,7}\s","");
				if(params[1] < 1 || params[1] > 100) return message.channel.send("Please provide a number between 1 and 15 to search for the Image Category!");
				var CountedImaged = 0;
				var ProcessedMSG = [];
				message.channel.send("Processing...").then(async (msg) => {
				    await GoogleCSE.search(params[2]).then(images => images.forEach((fetchedimage) => {
					    if(CountedImaged == 0) msg.delete();
						//console.log(fetchedimage);
						ProcessedMSG[CountedImaged] = fetchedimage.url;
					    if(CountedImaged++ == parseInt(params[1]-1, 10))
					    {
							for(var j = 0; j < ProcessedMSG.length; j++) message.channel.send("", {file: ProcessedMSG[j]});
					    }
				    }));
					if(CountedImaged == 0) message.channel.send("Unknown ERROR, Please contact <@" + config.DevID + "> for more info!");
				});
			}
		},
		{
    		command: "gifsearch",
			premium: false,
			alias: [],
			description: "Searchs around the Internet for an GIF!",
			parameters: ["limit","Category"],
			execute: function (message, params) {
				params[2] = message.content.replace("\\" + config.cmdPrefix + "(.*){0,30}\s\d{0,7}\s","");
				if(params[1] < 1 || params[1] > 100) return message.channel.send("Please provide a number between 1 and 15 to search for the GIF Category!");
				var CountedGIF = 0;
				var ProcessedMSG = [];
				message.channel.send("Processing...").then(async (msg) => {
				    await GiphyAPI.search(params[2]).then(gifs => gifs.data.forEach((fetchedgif) => {
					    if(CountedGIF == 0) msg.delete();
						//console.log(fetchedgif);
						ProcessedMSG[CountedGIF] = "https://media.giphy.com/media/" + fetchedgif.id + "/giphy.gif";
					    if(CountedGIF++ == parseInt(params[1]-1, 10))
					    {
							for(var j = 0; j < ProcessedMSG.length; j++) message.channel.send("", {file: ProcessedMSG[j]});
					    }
				    }));
					if(CountedGIF == 0) message.channel.send("Unknown ERROR, Please contact <@" + config.DevID + "> for more info!");
				});
			}
		},
		{
			command: "ban",
			premium: true,
			alias: ["rban","banip","tempban","block","forbid"],
			description: "Used to Ban an member",
			parameters: ["Tagged Memeber", "Reason"],
			execute: function(message, params) {
				if(!message.channel.permissionsFor(message.author).has("ADMINISTRATOR") || !message.channel.permissionsFor(message.author).has("MANAGE_GUILD") || !message.channel.permissionsFor(message.author).has("BAN_MEMBERS")) return message.reply(botmessages.permission.message.error);
                if(!params[2] || params[2].length < 3) return message.reply("Please indicate a reason for the ban!");
        		const user = message.mentions.users.first();
        		if(!user) return message.reply("Please mention a valid member of this server");
				const member = message.guild.member(user);
				if(!member) return message.reply('That user isn\'t in the guild!');
        		if(member.highestRole.comparePositionTo(message.guild.me.highestRole) > 0 || !member.bannable || member.id == client.user.id || member.id == message.author.id) return message.reply("I cannot ban this user! Do they have a higher role? Do I have ban permissions?");

        		member.ban({
          			reason: params[2]
        		}).then(() => {
          			message.channel.send("<@" + member.id + "> has been banned by <@" + message.author.id + ">: " + params[2]);
        		}).catch(error => {
          			message.reply('Couldn\'t ban <@' + member.id + ">: " + error);
          			console.error(error);
        		});
			}
		},
		{
			command: "kick",
			premium: true,
			alias: ["fireout"],
			description: "Used to kick an member",
			parameters: ["Tagged Memeber", "Reason"],
			execute: function(message, params) {
				if(!message.channel.permissionsFor(message.author).has("ADMINISTRATOR") || !message.channel.permissionsFor(message.author).has("MANAGE_GUILD") || !message.channel.permissionsFor(message.author).has("KICK_MEMBERS")) return message.reply(botmessages.permission.message.error);
				if(!params[2] || params[2].length < 3) return message.reply("Please indicate a reason for the kick!");
        		const user = message.mentions.users.first();
        		if(!user) return message.reply("Please mention a valid member of this server");
				const member = message.guild.member(user);
				if(!member) return message.reply('That user isn\'t in the guild!');
        		if(member.highestRole.comparePositionTo(message.guild.me.highestRole) > 0 || !member.kickable || member.id == client.user.id || member.id == message.author.id) return message.reply("I cannot kick this user! Do they have a higher role? Do I have kick permissions?");

        		member.kick(params[2]).then(() => {
          			message.channel.send("<@" + member.id + "> has been kicked by <@" + message.author.id + ">: " + params[2]);
        		}).catch(error => {
          			message.reply('Couldn\'t ban <@' + member.id + ">: " + error);
          			console.error(error);
        		});
			}
		},
		{
			command: "mute",
			premium: true,
			alias: [],
			description: "Used to mute an member",
			parameters: ["Tagged Memeber", "Reason"],
			execute: function(message, params) {
				if(!message.channel.permissionsFor(message.author).has("ADMINISTRATOR") || !message.channel.permissionsFor(message.author).has("MANAGE_GUILD")) return message.reply(botmessages.permission.message.error);
				if(!params[2] || params[2].length < 3) return message.reply("Please indicate a reason for the mute!");
        		const user = message.mentions.users.first();
        		if(!user) return message.reply("Please mention a valid member of this server");
				const member = message.guild.member(user);
				if(!member) return message.reply('That user isn\'t in the guild!');
				if(member.highestRole.comparePositionTo(message.guild.me.highestRole) > 0 || member.id == client.user.id || member.id == message.author.id) return message.reply("I cannot mute this user! Do they have a higher role? Do I have kick permissions?");
        		if(member.roles.has(MuteRole.id)) return message.reply("That User is already muted!");

        		if(!(MuteRole = message.guild.roles.find(val => val.name === "Muted")))
				{
      	              		try{
            		      		MuteRole = message.guild.createRole({
              		         		name: "Muted",
              		         		color: "#000000",
              		         		permissions:[]
            		      		});
            		      		message.guild.channels.forEach(async (channel, id) => {
              		         		await channel.overwritePermissions(MuteRole, {
                  		         		SEND_MESSAGES: false,
                  		        		ADD_REACTIONS: false
              		        		 });
            		      		});
          		      		}
							catch(e)
							{
            		      		console.error(e.stack);
								excep.error(e);
          		      		}
        		}
				member.addRole(MuteRole.id);
				message.channel.send("<@" + member.id + "> has been Muted by <@" + message.author.id + ">: " + params[2]);
			}
		},
		{
			command: "unmute",
			premium: true,
			alias: [],
			description: "Used to unmute an member",
			parameters: ["Tagged Memeber"],
			execute: function(message, params) {
				if(!message.channel.permissionsFor(message.author).has("ADMINISTRATOR") && !message.channel.permissionsFor(message.author).has("MANAGE_GUILD")) return message.reply(botmessages.permission.message.error);
        		const user = message.mentions.users.first();
        		if(!user) return message.reply("Please mention a valid member of this server");
				const member = message.guild.member(user);
				if(!member) return message.reply('That user isn\'t in the guild!');
				if(member.highestRole.comparePositionTo(message.guild.me.highestRole) > 0 || member.id == client.user.id || member.id == message.author.id) return message.reply("I cannot unmute this user! Do they have a higher role? Do I have kick permissions?");
        		if(!member.roles.has(MuteRole.id)) return message.reply("That User is already unmuted!");

        		if(!(MuteRole = message.guild.roles.find(val => val.name === "Muted")))
				{
      	              		try{
            		      		MuteRole = message.guild.createRole({
              		         		name: "Muted",
              		         		color: "#000000",
              		         		permissions:[]
            		      		});
            		      		message.guild.channels.forEach(async (channel, id) => {
              		         		await channel.overwritePermissions(MuteRole, {
                  		         		SEND_MESSAGES: false,
                  		        		ADD_REACTIONS: false
              		        		 });
            		      		});
          		      		}
							catch(e)
							{
            		      		console.error(e.stack);
								excep.error(e);
          		      		}
        		}
				member.removeRole(MuteRole.id);
				message.channel.send("<@" + member.id + "> has been Unmuted by <@" + message.author.id + ">");
			}
		},
		{
			command: "addrole",
			premium: true,
			alias: [],
			description: "Used to Add an role to a member",
			parameters: ["Tagged Memeber", "Role"],
			execute: function(message, params) {
				var ToAddRole;
				if(!message.channel.permissionsFor(message.author).has("ADMINISTRATOR") && !message.channel.permissionsFor(message.author).has("MANAGE_GUILD") && !message.channel.permissionsFor(message.author).has("MANAGE_ROLES")) return message.reply(botmessages.permission.message.error);
        		const user = message.mentions.users.first();
        		if(!user) return message.reply("Please mention a valid member of this server");
				const member = message.guild.member(user);
				if(!member) return message.reply('That user isn\'t in the guild!');
        		if(member.highestRole.comparePositionTo(message.guild.me.highestRole) > 0 || member.id == client.user.id || member.id == message.author.id) return message.reply("I cannot manage this user! Do they have a higher role? Do I have ban permissions?");
                if(!(ToAddRole = message.guild.roles.find(val => val.name === params[2]))) return message.reply("Couldn't find that role!");
				if(member.roles.has(ToAddRole.id)) return message.reply("This user already have that role!");

        		member.addRole(ToAddRole.id);
				message.channel.send("<@" + message.author.id + "> just given <@" + member.id + "> \"" + params[2] + "\" role!");
			}
		},
		{
			command: "removerole",
			premium: true,
			alias: [],
			description: "Used to Take an role from a member",
			parameters: ["Tagged Memeber", "Role"],
			execute: function(message, params) {
				var ToAddRole;
				if(!message.channel.permissionsFor(message.author).has("ADMINISTRATOR") && !message.channel.permissionsFor(message.author).has("MANAGE_GUILD") && !message.channel.permissionsFor(message.author).has("MANAGE_ROLES")) return message.reply(botmessages.permission.message.error);
        		const user = message.mentions.users.first();
        		if(!user) return message.reply("Please mention a valid member of this server");
				const member = message.guild.member(user);
				if(!member) return message.reply('That user isn\'t in the guild!');
        		if(member.highestRole.comparePositionTo(message.guild.me.highestRole) > 0 || member.id == client.user.id || member.id == message.author.id) return message.reply("I cannot manage this user! Do they have a higher role? Do I have ban permissions?");
				if(!(ToAddRole = message.guild.roles.find(val => val.name === params[2]))) return message.reply("Couldn't find that role!");
				if(!member.roles.has(ToAddRole.id)) return message.reply("This user doesn't have that role!");

        		member.removeRole(ToAddRole.id);
				message.channel.send("<@" + message.author.id + "> just taken \"" + params[2] + "\" role from <@" + member.id + ">!");
			}
		},
		{
			command: "setprefix",
			premium: true,
			alias: ["prefix"],
			description: "Sets the BOT's Command Prefix",
			parameters: ["Command Prefix"],
			execute: function(message, params) {
				if(!message.channel.permissionsFor(message.author).has("ADMINISTRATOR") && !message.channel.permissionsFor(message.author).has("MANAGE_GUILD")) return message.reply(botmessages.permission.message.error);
				const supported_prefix = ['!', '/', '.', '?', '-', '~', '+', '@', '#', '$', '>', '<', ';'];
				for(var i = 0; i < supported_prefix.length; i++) {
				  if(supported_prefix[i].indexOf("`") !== -1 || params[1].indexOf("`") !== -1) return message.channel.send("Unknown ERROR, Please contact <@" + config.DevID + "> for more info!");
			 	  if(params[1] === supported_prefix[i])
             	  {
					  message.channel.send("Command Prefix have been successfully set to: `" + params[1] + "`");
					  if(CheckDebugMode() == true)
					  {
					     logger.info("Command Prefix have been successfully set to: " + params[1]);
					     console.info("Command Prefix have been successfully set to: " + params[1]);
					  }
					  config.cmdPrefix = params[1];
                      filesystem.writeFileSync(path.join(__dirname, "config.json"), JSON.stringify(config, null, 4));
                      client.user.setActivity("Serving " + client.guilds.size + " servers | " + config.cmdPrefix + "help");
               	      break;
			 	  }
               	  else if(params[1] !== supported_prefix[i])
                  {
				  	if(i >= supported_prefix.length-1)
                  	{
						message.channel.send("Couldn't Customizate the Command Prefix, Unsupported Command Prefix: `" + params[1] + "`");
						message.channel.send("Supported Command Prefix(s): `" + supported_prefix.join("` `") + "`");
						break;
				  	}
			   	  }
				}
			}
		},
		{
    		command: "purge",
			premium: true,
			alias: ["clear","prune","cc","cac"],
			description: "Clears an amount of messages",
			parameters: ["Messages limit"],
			execute: function (message, params) {
				if(!message.channel.permissionsFor(message.author).has("ADMINISTRATOR") && !message.channel.permissionsFor(message.author).has("MANAGE_GUILD") && !message.channel.permissionsFor(message.author).has("MANAGE_MESSAGES")) return message.reply(botmessages.permission.message.error);
    			if(params[1] < 2 || params[1] > 100) return message.channel.send("Please provide a number between 2 and 100 as the amount of messages to delete!");
				var logMSG;
				message.channel.fetchMessages({
	                limit: parseInt(params[1], 10)
                }).then((msgCollection) => {
	                msgCollection.forEach((msg) => {
						msg.delete();
						if(CheckDebugMode() == true)
						{
						   logMSG = "Clearing Message ID " + msg.id + "(AuthorID: " + msg.author.id + "| ChannelID: " + msg.channel.id + " | GuildID: " + msg.guild.id + ")";
						   console.info(logMSG);
						   logger.info(logMSG);
						}
	                });
                }).catch((err) => {
					message.channel.send("Unable to Clear this amount of messages:" + err);
					excep.error('Unable to Clear amount of messages:' + err);
				});
			}
		},
		{
			command: "commands",
			premium: false,
			alias: ["cmd", "cmds","help"],
			description: "",
			parameters: [],
			execute: function(message, params) {
				var response = "Available commands:```";
			    var verifiedCMDs = 0;
				for(var i = 0; i < commands.length; i++) {
					var c = commands[i];
					if(c.command !== 'commands' && c.command !== 'acommands' && c.premium == false)
					{
				   		response += "\n" + config.cmdPrefix + c.command;

				   		for(var j = 0; j < c.parameters.length; j++) {
				      		response += " <" + c.parameters[j] + ">";
				   		}

				   		response += ": " + c.description;
						verifiedCMDs++;
					}
				}

				response += "```";
				message.author.send((verifiedCMDs > 0 ? response : "Unknown ERROR, Please contact <@" + config.DevID + "> for more info!"));
				message.reply("Check your DMs!").then((msg) => {
					message.delete();
					msg.delete();
				});
			}
		},
		{
			command: "acommands",
			premium: true,
			alias: ["acmd", "acmds","adminhelp","ahelp","admincmds","admincmd","admincommands"],
			description: "",
			parameters: [],
			execute: function(message, params) {
				if(!message.channel.permissionsFor(message.author).has("ADMINISTRATOR") && !message.channel.permissionsFor(message.author).has("MANAGE_GUILD") && !message.channel.permissionsFor(message.author).has("MANAGE_ROLES") && !message.channel.permissionsFor(message.author).has("KICK_MEMBERS") && !message.channel.permissionsFor(message.author).has("BAN_MEMBERS")) return message.reply(botmessages.permission.message.error);
				var response = "Available Administration commands:```";
			    var verifiedCMDs = 0;
				for(var i = 0; i < commands.length; i++) {
					var c = commands[i];
					if(c.command !== 'commands' && c.command !== 'acommands' && c.premium == true)
					{
				   		response += "\n" + config.cmdPrefix + c.command;

				   		for(var j = 0; j < c.parameters.length; j++) {
				      		response += " <" + c.parameters[j] + ">";
				   		}

				   		response += ": " + c.description;
						verifiedCMDs++;
					}
				}

				response += "```";
				message.author.send((verifiedCMDs > 0 ? response : "Unknown ERROR, Please contact <@" + config.DevID + "> for more info!"));
				message.reply("Check your DMs!").then((msg) => {
					message.delete();
					msg.delete();
				});
			}
		}
];

client.on("message", message => {
	if(message.author.bot) return;
	if(message.channel.type == "dm" && message.author.id != client.user.id) {
		if(CheckDebugMode()) logger.debug("DM FROM <@" + message.author.id + ">: " + message.content);
		if(message.isMentioned(client.user))
		{
			message.channel.send("Join https://discord.gg/4Y23mKU");
		}
	} else if(message.channel.type == "text") {
    	if(message.member.roles.has(MuteRole.id)) {
			message.delete();
			return;
	    }
		if(message.isMentioned(client.user)) {
			message.channel.send("Guild's Command Prefix is `" + config.cmdPrefix + "`, eg:`" + config.cmdPrefix + "help`");
		} else {
			if(message.content[0] == config.cmdPrefix) {
				handle_command(message, message.content.substring(1));
			}
		}
	}
});

function search_command(command_name) {
	for(var i = 0; i < commands.length; i++)
	{
		if(commands[i].command == command_name.toLowerCase())
		{
			return commands[i];
		}
		else
		{
			if(i >= commands.length-1)
			{
				for(var c = 0; c < commands.length; c++)
				{
		   			for(var j = 0; j < commands[c].alias.length; j++)
					{
			   			if(commands[c].alias[j] == command_name.toLowerCase())
			   			{
				   			return commands[c];
						}
					}
			   	}
			}
		}
	}
	return false;
}

function handle_command(message, text) {
	var params = text.split(" ");
	var command = search_command(params[0]);

	if(command)
	{
		if(params.length - 1 < command.parameters.length)
		{
			var cmdUsage = (config.cmdPrefix + command.command);
		    for(var j = 0; j < command.parameters.length; j++) cmdUsage += " <" + command.parameters[j] + ">";
		    message.channel.send(new Discord.RichEmbed().setTitle("Insufficient Command parameters")
                                          .addField("Description", command.description)
				                          .addField("Usage", cmdUsage)
				                          .setColor(EmbedColors.gold));
		} else {
			command.execute(message, params);
		}
	}
	else
	{
	    message.reply("Unknown Command!");
	}
}

function CheckDebugMode()
{
	return (config.DebugMode == true && (process.execArgv.indexOf("--inspect") != -1 || process.execArgv.indexOf("debug") != -1));
}
function GetNodeOS(OSPack = OperatingSys)
{
   return (OSPack.type() == process.env.OS ? process.env.OS : "Unknown");
}
function GetNodeArch(OSPack = OperatingSys)
{
   return (OSPack.arch() == process.arch ? process.arch : "Unknown");
}

async function FetchMembersCountByStatus(userStatus = 'online')
{
   var ConnectedUsers = 0;
   await client.guilds.first().fetchMembers().then((guild) => {
      ConnectedUsers += guild.members.filter(member => member.presence.status === userStatus).size;
   });
   return ConnectedUsers;
}

function TimeLeft(timestamp) {
    var endDate = new Date(d);
    var diff = endDate - new Date();

    var hours   = Math.floor(diff / 3.6e6);
    var minutes = Math.floor((diff % 3.6e6) / 6e4);
    var seconds = Math.floor((diff % 6e4) / 1000);
    console.log('Time remaining to ' + endDate.toISOString() +
                ' or\n' + endDate.toString() + ' local is\n' +
                 hours + ' hours, ' +  minutes + ' minutes and ' +
                 seconds + ' seconds');
}

function ToTime(timeinsec) {
	var seconds, days, hours, minutes;
    seconds = MathFlooringFloat(Number(d));
    days = MathFlooringFloat(seconds / (24*60*60));
    seconds -= MathFlooringFloat(days * (24*60*60));
    hours = MathFlooringFloat(seconds / (60*60));
    seconds -= MathFlooringFloat(hours * (60*60));
    minutes = MathFlooringFloat(seconds / (60));
    seconds -= MathFlooringFloat(minutes * (60));
    return (days > 0 ? days + (days == 1 ? ' day, ' : ' days, ') : '') + (hours > 0 ? hours + (hours == 1 ? ' hour, ' : ' hours, ') : '') +
	       (minutes > 0 ? minutes + (minutes == 1 ? ' minute, ' : ' minutes, ') : '') + (seconds > 0 ? seconds + (seconds == 1 ? ' second' : ' seconds') : '');
}

function ReturnTZTime()
{
   return new Date(new Date().getTime() + (new Date().getTimezoneOffset() * 60000)).getTime();
}

function MathFlooringFloat(floored_number)
{
   return (Number.isInteger(floored_number) ? floored_number : Math.floor(floored_number));
}

function ReturnTimelapse(start, till)
{
    var ret, seconds = (till > start ? till - start : (start > till ? start - till : 1));

	const
		TimeM = 60,
		TimeH = 60 * TimeM,
		TimeD = 24 * TimeH,
		TimeMN = 30 * TimeD;

	if (seconds < TimeM) ret = (seconds > 1 ? MathFlooringFloat(seconds) + " seconds ago" : "a second ago");
	else if (seconds < (2 * TimeM)) ret = "a minute ago";
	else if (seconds < (45 * TimeM)) ret = ((seconds / TimeM) > 1 ? MathFlooringFloat(seconds / TimeM) + " minutes ago" : "a minute ago");
	else if (seconds < (90 * TimeM)) ret = "an hour ago";
	else if (seconds < (24 * TimeH)) ret = ((seconds / TimeH) > 1 ? MathFlooringFloat(seconds / TimeH) + " hours ago" : "an hour ago");
	else if (seconds < (48 * TimeH)) ret = "a day ago";
	else if (seconds < (30 * TimeD)) ret = ((seconds / TimeD) > 1 ? MathFlooringFloat(seconds / TimeD) + " days ago" : "a day ago");
	else if (seconds < (12 * TimeMN)) ret = (Number((seconds / TimeD / 30).toFixed(1)) <= 1 ? "a month ago" : MathFlooringFloat(Number((seconds / TimeD / 30).toFixed(1))) + " months ago");
    else ret = (Number((seconds / TimeD / 365).toFixed(1)) <= 1 ? "a year ago" : MathFlooringFloat(Number((seconds / TimeD / 365).toFixed(1))) + " years ago");
	return ret;
}

/*function UncaughtExceptionHandler(err)
{
	console.log("Uncaught Exception Detected... (Check the logs: `../logs/" + config.excepath + "`)");
	excep.error("Uncaught Exception Detected!!");
	excep.error("ERROR: " + err);
	if(err.code == 'ECONNRESET') excep.error("Stack trace: " + err.stack);
	else process.exit(0);
}

function UnhandledRejectionHandler(reason, p)
{
	console.log("Unhandled Rejection...  (Check the logs: `../logs/" + config.rejepath + "`)");
	rejec.fatal('Unhandled Rejection...');
	rejec.fatal('Issue at: ' + p);
	rejec.fatal('Reason: ' + reason);
}

function UnhandledWarningHandler(warning)
{
	console.log("Uncaught Warning Detected... (Check the logs: `../logs/" + config.warnpath + "`)");
	warni.warn("Uncaught Warning Detected!!");
	warni.warn("Warning Name: " + warning.name);
	warni.warn("Warning Message: " + warning.message);
	warni.warn("Warning Code: " + warning.code);
	warni.warn("Warning Stack trace: " + warning.stack);
	warni.warn("Warning Details: " + warning.detail);
}*/

client.login(config.BOTtoken);