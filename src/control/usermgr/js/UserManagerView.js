var bootstrap = require('bootstrap');
var APIErrorDialog = require('libresignage/ui/components/Dialog/APIErrorDialog');
var StrValidator = require('libresignage/ui/validator/StrValidator');
var UIController = require('libresignage/ui/controller/UIController')
var UIInput = require('libresignage/ui/controller/UIInput');
var UIButton = require('libresignage/ui/controller/UIButton');
var PromptDialog  = require('libresignage/ui/components/Dialog/PromptDialog');
var BaseView = require('libresignage/ui/view/BaseView');

var UserManagerController = require('./UserManagerController.js');
var UserList = require('./components/userlist.js').UserList;

/**
* View class for the User Manager page.
*/
class UserManagerView extends BaseView {
	/**
	* Construct a new UserManagerView.
	*
	* @param {APIInterface} api An APIInterface object.
	*/
	constructor(api) {
		super();
		this.api = api;
		this.controller = new UserManagerController(api);

		this.init_state({
			ready: false,
			loading: false
		});
	}

	/**
	* Initialize the view.
	*/
	async init() {
		this.buttons = new UIController({
			create: new UIButton({
				elem: document.querySelector('#btn-create-user'),
				cond: () => true,
				enabler: null,
				attach: { click: () => this.create_user() },
				defer: () => !this.state('ready') || this.state('loading')
			})
		});

		this.inputs = new UIController({
			userlist: new UIInput({
				elem: document.querySelector('#users-table'),
				cond: () => true,
				enabler: null,
				attach: {
					'component.userlist.save': async (event, data) => {
						this.state('loading', true);
						await this.save_user(
							data.get('username'),
							data.get('groups')
						);
						this.state('loading', false);
					},
					'component.userlist.remove': async (event, data) => {
						this.state('loading', true);
						await this.remove_user(
							data.get('username')
						);
						this.state('loading', false);
					}
				},
				defer: () => !this.state('ready') || this.state('loading'),
				mod: null,
				getter: null,
				setter: null,
				clearer: null
			})
		});

		this.userlist = new UserList(
			this.api,
			document.querySelector('#users-table')
		);

		await this.fetch();
		this.populate();
		this.state('ready', true);
	}

	/**
	* Create a new user.
	*
	* This function prompts for the new username.
	*/
	create_user() {
		let dialog = new PromptDialog(
			'Create a new user',
			'Enter a name for the new user.',
			[
				new StrValidator({
					min: 1,
					max: null,
					regex: null
				}, '', true),
				new StrValidator({
					min: null,
					max: this.api.limits.USERNAME_MAX_LEN,
					regex: null
				}, 'The username is too long.'),
				new StrValidator({
					min: null,
					max: null,
					regex: /^[A-Za-z0-9_]*$/
				}, 'The username contains invalid characters.')
			],
			async status => {
				let val = null;
				if (!status) { return; }
				try {
					val = await this.controller.create_user(dialog.get_value());
				} catch (e) {
					new APIErrorDialog(e);
					return;
				}

				/*
				* Manually add the new user to the UserList to make
				* the generated initial password visible in the UI.
				* This is done because the API doesn't return (or
				* even know) the password on subsequent calls.
				*/
				this.userlist.add_user(user);
				this.populate();
			}
		);
	}

	/**
	* Fetch userdata for the UI.
	*/
	async fetch() {
		let users = null;

		try {
			await this.controller.get_users();
		} catch (e) {
			new APIErrorDialog(e);
			return;
		}

		this.userlist.set_user_data(users);
	}

	/**
	* Populate the UI from the current userdata.
	*/
	populate() {
		this.userlist.update();
	}

	/**
	* Save a user with modified groups.
	*
	* @param {string} username The name of the user to save.
	* @param {string[]} groups An array of group names to save.
	*/
	async save_user(username, groups) {
		try {
			this.controller.save_user(username, groups);
		} catch (e) {
			new APIErrorDialog(e);
			return;
		}
	}

	/**
	* Remove a user and update the UI.
	*
	* @param {string} username The name of the user to remove.
	*/
	async remove_user(username) {
		try {
			await this.controller.remove_user(username);
		} catch (e) {
			new APIErrorDialog(e);
			return;
		}
		await this.fetch();
		this.populate()
	}
}
module.exports = UserManagerView;
