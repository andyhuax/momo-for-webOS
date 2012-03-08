var MainAssistant = Class.create({
	initialize: function() {},
	setup: function() {
		var that = this;

		//init ui
		that.idList = 'conv-list';

		that.controller.setupWidget(that.idList, {
			swipeToDelete: true,
			itemTemplate: 'templates/chat-conv-list-item',
			listTemplate: 'templates/chat-conv-list',
			//dividerTemplate: 'templates/photo-list-divider',
			addItemLabel: "发起新的对话",
			formatters: {
				content: AppFormatter.content.bind(that),
				timestamp: AppFormatter.time.bind(that)
			},
			uniquenessProperty: 'id',
			fixedHeightItems: false,
			hasNoWidgets: true
		},
		that.modelList = new ConvAdapter());
		that.list = that.controller.get(that.idList);

		Mojo.Event.listen(this.list, Mojo.Event.listTap, this.listWasTapped.bind(this));
		Mojo.Event.listen(this.list, Mojo.Event.listDelete, this.itemDelete.bind(this));
		Mojo.Event.listen(this.list, Mojo.Event.listAdd, this.itemAdd.bind(this));

		//start service
		that.controller.serviceRequest("palm://momo.im.app.service.node/", {
			method: "chatInit",
			parameters: Global.authInfo,
			onSuccess: that.onInitSuccess.bind(that),
			onFailure: function(fail) {
				//that.controller.get('hello').update('init service fail');
			}
		});
	},
	onInitSuccess: function(result) {
		var that = this;
		//this.controller.get('hello').update(result.hello);
		//Mojo.Log.info('trying to register callback');
		//that.modelList.setItems(result.data);
		that.controller.modelChanged(that.modelList);
	},
	listWasTapped: function(event) {
		Mojo.Log.info('listWasTapped');
		this.controller.stageController.pushScene('conv-detail', {
			item: event.item.other
		});
	},
	itemDelete: function(event) {
		RabbitDB.instance().deleteConv(event.item.other.id);
	},
	itemAdd: function(event) {
		this.controller.stageController.pushScene({
			appId: "com.palm.app.contacts",
			name: "list"
		},
		{
			mode: "picker",
			message: "找个有号码的人好吗？"
		});
	},
	update: function(message) {
		var that = this;
		that.modelList.addItem(message);
		that.controller.modelChanged(that.modelList);
		that.list.mojo.revealItem(0, true);
	},
	activate: function(event) {
		var that = this;
		if (event != null && event.hasOwnProperty('phoneNumbers')) {
			Mojo.Log.info('people: ' + JSON.stringify(event.phoneNumbers));
			if (event.phoneNumbers.length > 0) {
				var people = {
					name: event.name.familyName + event.name.givenName,
					mobile: event.phoneNumbers[0].value
				};
				Mojo.Log.info(this.TAG, 'getting people uid ====' + people.mobile);

				new interfaces.Momo().postUserShowByMobile(people, {
					onSuccess: function(response) {
						var res = response.responseJSON;
						var willTalk = {
							id: res.user_id,
							name: res.name,
							avatar: res.avatar
						}
						this.controller.stageController.pushScene('conv-detail', {
							item: willTalk
						});
					}.bind(that),
					onFailure: function(response) {
						var bannerParams = {
							messageText: 'fail get peopl' + response,
							soundClass: 'notifications'
						};
						Mojo.Controller.getAppController().showBanner(bannerParams, {
							source: "notification"
						},
						'momo');
					}.bind(that)
				});
			}
		} else {
			RabbitDB.instance().getConvList(function(result) {
				Mojo.Log.info('get conv list success ---' + result.length);
				that.modelList.setItems(result);
				that.controller.modelChanged(that.modelList);
				if (Global.hasNewUnread) {
					that.list.mojo.revealItem(0, true);
					Global.hasNewUnread = false;
				}
			});
		}
	},
	deactivate: function(event) {},
	cleanup: function(event) {
		this.cleaning = true;
		//remove callback
	}
});

function ConvAdapter() {
	this.items = [];
};

ConvAdapter.prototype = {
	addItem: function(item) {
		var that = this;
		if (item.other == null) {
			item.other = (item.sender.id == Global.authInfo.user.id ? item.receiver[0] : item.sender);
		}
		//that.items.push(item);
		Mojo.Log.info('add item to chat list: ' + that.items.length);
		for (var i = 0; i < that.items.length; ++i) {
			var curr = that.items[i];
			if (item.other.id == curr.other.id) {
				that.items.splice(i, 1);
				break;
			}
		}
		that.items.splice(0, 0, item);
	},
	setItems: function(items) {
		Mojo.Log.info('setting items=====' + items.length);
		this.items = [];
		for (var i = 0; i < items.length; ++i) {
			var item = items[i];
			if (item.other == null) {
				item.other = (item.sender.id == Global.authInfo.user.id ? item.receiver[0] : item.sender);
			}
			this.items.push(item);
		}
	}
}

