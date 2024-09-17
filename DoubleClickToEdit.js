/**
 * @name double click to edit
 * @author original idea by bullwashere
 * @version 1.0.0
 * @description simply editing and replying with double clicking plugin.
 *
 * @invite DzWpRfZQEW
 * @website https://instagram.com/alpintrouble
 * @source https://github.com/
 */

/** @type {typeof import("react")} */
const React = BdApi.React,

	{ Webpack, Webpack: { Filters }, Data, Utils, ReactUtils } = BdApi,

	config = {},

	ignore = [
		//Object
		"video",
		"emoji",
		//Classes
		"content",
		"reactionInner"
	],
	walkable = [
		"child",
		"memoizedProps",
		"sibling"
	];


module.exports = class DoubleClickToEdit {


	constructor(meta) { config.info = meta; }

	start() {
		try {
			//Classes
			this.selectedClass = Webpack.getModule(Filters.byKeys("message", "selected")).selected;
			this.messagesWrapper = Webpack.getModule(Filters.byKeys("empty", "messagesWrapper")).messagesWrapper;

			//Reply functions
			this.replyToMessage = Webpack.getModule(m => m?.toString?.()?.replace('\n', '')?.search(/(channel:e,message:n,shouldMention:!)/) > -1, { searchExports: true })
			this.getChannel = Webpack.getModule(Filters.byKeys("getChannel", "getDMFromUserId")).getChannel;

			//Stores
			this.MessageStore = Webpack.getModule(Filters.byKeys("receiveMessage", "editMessage"));
			this.CurrentUserStore = Webpack.getModule(Filters.byKeys("getCurrentUser"));

			//Settings
			this.UIModule = Webpack.getModule(m => m.FormItem && m.RadioGroup);

			//Events
			global.document.addEventListener('dblclick', this.doubleclickFunc);

			//Load settings
			//Edit
			this.doubleClickToEditModifier = Data.load(config.info.slug, "doubleClickToEditModifier") ?? false;
			this.editModifier = Data.load(config.info.slug, "editModifier") ?? "shift";
			//Reply
			this.doubleClickToReply = Data.load(config.info.slug, "doubleClickToReply") ?? false;
			this.doubleClickToReplyModifier = Data.load(config.info.slug, "doubleClickToReplyModifier") ?? false;
			this.replyModifier = Data.load(config.info.slug, "replyModifier") ?? "shift";
			//Copy
			this.doubleClickToCopy = Data.load(config.info.slug, "doubleClickToCopy") ?? false;
			this.copyModifier = Data.load(config.info.slug, "copyModifier") ?? "shift";

		}
		catch (err) {
			try {
				console.error("Attempting to stop after starting error...", err);
				this.stop();
			}
			catch (err) {
				console.error(config.info.name + ".stop()", err);
			}
		}
	}

	doubleclickFunc = (e) => this.handler(e);

	stop = () => document.removeEventListener('dblclick', this.doubleclickFunc);

	getSettingsPanel() {
		return () => {
			const [editEnableModifier, setEditEnableModifier] = React.useState(this.doubleClickToEditModifier),
				[editModifier, setEditModifier] = React.useState(this.editModifier),
				[reply, setReply] = React.useState(this.doubleClickToReply),
				[replyEnableModifier, setReplyEnableModifier] = React.useState(this.doubleClickToReplyModifier),
				[replyModifier, setReplyModifier] = React.useState(this.replyModifier),
				[copy, setCopy] = React.useState(this.doubleClickToCopy),
				[copyModifier, setCopyModifier] = React.useState(this.copyModifier);

			return [
				React.createElement(this.UIModule.FormSwitch, {
					value: editEnableModifier,
					note: "Enable modifier for double clicking to edit",
					onChange: (newState) => {
						this.doubleClickToEditModifier = newState;
						Data.save(config.info.slug, "doubleClickToEditModifier", newState);
						setEditEnableModifier(newState);
					}
				}, "Enable Edit Modifier"),
				React.createElement(this.UIModule.FormItem, {
					disabled: !editEnableModifier,
					title: "Modifer to hold to edit a message"
				},
					React.createElement(this.UIModule.RadioGroup, {
						disabled: !editEnableModifier,
						value: editModifier,
						options: [
							{ name: "Shift", value: "shift" },
							{ name: "Ctrl", value: "ctrl" },
							{ name: "Alt", value: "alt" }
						],
						onChange: (newState) => {
							this.editModifier = newState.value;
							Data.save(config.info.slug, "editModifier", newState.value);
							setEditModifier(newState.value);
						}
					})),

				React.createElement(this.UIModule.FormSwitch, {
					value: reply,
					note: "Double click another's message and start replying.",
					onChange: (newState) => {
						this.doubleClickToReply = newState;
						Data.save(config.info.slug, "doubleClickToReply", newState);
						setReply(newState);
					}
				}, "Enable Replying"),
				React.createElement(this.UIModule.FormSwitch, {
					disabled: !reply,
					value: replyEnableModifier,
					note: "Enable modifier for double clicking to reply",
					onChange: (newState) => {
						this.doubleClickToReplyModifier = newState;
						Data.save(config.info.slug, "doubleClickToReplyModifier", newState);
						setReplyEnableModifier(newState);
					}
				}, "Enable Reply Modifier"),
				React.createElement(this.UIModule.FormItem, {
					disabled: (!reply || !replyEnableModifier),
					title: "Modifier to hold when replying to a message"
				},
					React.createElement(this.UIModule.RadioGroup, {
						disabled: (!reply || !replyEnableModifier),
						value: replyModifier,
						options: [
							{ name: "Shift", value: "shift" },
							{ name: "Ctrl", value: "ctrl" },
							{ name: "Alt", value: "alt" }
						],
						onChange: (newState) => {
							this.replyModifier = newState.value;
							Data.save(config.info.slug, "replyModifier", newState.value);
							setReplyModifier(newState.value);
						}
					
					}))
			];
		}
	}

	handler(e) {
		//Check if we're not double clicking
		if (typeof (e?.target?.className) !== typeof ("") ||
			ignore.some(nameOfClass => e?.target?.className?.indexOf?.(nameOfClass) > -1))
			return;

		//Target the message
		const messageDiv = e.target.closest('li > [class^=message]');

		//If it finds nothing, null it.
		if (!messageDiv)
			return;
		if (messageDiv.classList.contains(this.selectedClass))
			return;

		const instance = ReactUtils.getInternalInstance(messageDiv);
		if (!instance)
			return;

		const copyKeyHeld = this.checkForModifier(this.doubleClickToCopy, this.copyModifier, e);
		if (copyKeyHeld)
			this.copyToClipboard(document.getSelection().toString());
		const message = Utils.findInTree(instance, m => m?.baseMessage, { walkable: walkable })?.baseMessage ??
			Utils.findInTree(instance, m => m?.message, { walkable: walkable })?.message;

		if (!message)
			return;

		const editKeyHeld = this.checkForModifier(this.doubleClickToEditModifier, this.editModifier, e),
			replyKeyHeld = this.checkForModifier(this.doubleClickToReplyModifier, this.replyModifier, e);

		if ((this.doubleClickToEditModifier ? editKeyHeld : true) && message.author.id === this.CurrentUserStore.getCurrentUser().id)
			this.MessageStore.startEditMessage(message.channel_id, message.id, message.content);
		else if ((this.doubleClickToReplyModifier ? replyKeyHeld : true) && this.doubleClickToReply)
			this.replyToMessage(this.getChannel(message.channel_id), message, e);
	}

	/**
	 * 
	 * @param {boolean} enabled Is the modifier enabled
	 * @param {string} modifier Modifier key to be checked for
	 * @param {Event} event The event checked against
	 * @returns {boolean} Whether the modifier is enabled and the modifier is pressed
	 */
	checkForModifier(enabled, modifier, event) {
		if (enabled)
			switch (modifier) {
				case "shift": return event.shiftKey;
				case "ctrl": return event.ctrlKey;
				case "alt": return event.altKey;
			}
		return false;
	}
}
