import {
	command,
	default as CookiecordClient,
	listener,
	Module,
	optional,
} from 'cookiecord';
import { Message, MessageEmbed, TextChannel } from 'discord.js';
import { compressToEncodedURIComponent } from 'lz-string';
import { TS_BLUE } from '../env';
import {
	findCodeblockFromChannel,
	PLAYGROUND_REGEX,
} from '../util/findCodeblockFromChannel';

export class PlaygroundModule extends Module {
	constructor(client: CookiecordClient) {
		super(client);
	}

	private editedLongLink = new Map<string, Message>();

	@command({
		aliases: ['pg', 'playg'],
		single: true,
		description: 'Shorten a TypeScript playground link',
	})
	async playground(msg: Message, @optional code?: string) {
		const PLAYGROUND_BASE = 'https://www.typescriptlang.org/play/#code/';

		if (!code) {
			code = await findCodeblockFromChannel(
				msg.channel as TextChannel,
				true,
			);
			if (!code)
				return await msg.channel.send(
					":warning: couldn't find a codeblock!",
				);
		}
		const embed = new MessageEmbed()
			.setURL(PLAYGROUND_BASE + compressToEncodedURIComponent(code))
			.setTitle('View in Playground')
			.setColor(TS_BLUE);
		await msg.channel.send({ embed });
	}

	@listener({ event: 'message' })
	async onLongPGLink(msg: Message) {
		const exec = PLAYGROUND_REGEX.exec(msg.content);
		if (msg.author.bot || !exec || !exec[0]) return;
		const embed = new MessageEmbed()
			.setColor(TS_BLUE)
			.setTitle('Shortened Playground link')
			.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
			.setURL(exec[0]);
		if (exec[0] == msg.content) {
			// Message only contained the link
			msg.delete();
			await msg.channel.send({ embed });
		} else {
			// Message also contained other characters
			const botMsg = await msg.channel.send(
				`${msg.author} Here's a shortened URL of your playground link! You can remove the full link from your message.`,
				{ embed },
			);
			this.editedLongLink.set(msg.id, botMsg);
		}
	}
	@listener({ event: 'messageUpdate' })
	async onLongFix(_oldMsg: Message, msg: Message) {
		if (msg.partial) await msg.fetch();
		const exec = PLAYGROUND_REGEX.exec(msg.content);
		if (msg.author.bot || !this.editedLongLink.has(msg.id) || exec) return;
		const botMsg = this.editedLongLink.get(msg.id);
		await botMsg?.edit('');
	}
}
