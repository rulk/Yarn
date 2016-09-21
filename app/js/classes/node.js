var globalNodeIndex = 0;
const NodeExpandWidth = 300;
const NodeExpandHeight = 150;
const ClipNodeTextLength = 1024;
var Result = function()
{
    var self = this;
    this.amount = ko.observable(0);
    this.fraction = ko.observable();
}

var Condition = function()
{
    var self = this;
    this.value = ko.observable();
    this.fraction = ko.observable();
    this.condition = ko.observable();
}
var InventoryResult = function()
{
    var self = this;
    this.action = ko.observable();
    this.item = ko.observable();
}
var InventoryCondition = function()
{
    var self = this;
    this.condition = ko.observable();
    this.item = ko.observable();
}
var Answer = function()
{
    var self = this;
    this.msg = ko.observable();
    this.ref = ko.observable();
}
var Node = function()
{
	var self = this;

	
	// primary values
	this.index = ko.observable(globalNodeIndex++);
	this.title = ko.observable("Node" + this.index());
	this.tags = ko.observable("")
	this.body = ko.observable("Empty Text");
	this.presenter = ko.observable();
	this.results = ko.observableArray();
	this.conditions = ko.observableArray();
	this.inventoryConditions = ko.observableArray();
	this.inventoryResults = ko.observableArray();
	this.answers = ko.observableArray();

	//this.x = ko.observable(128);
	//this.y = ko.observable(128);
	this.active = ko.observable(true);
	this.tempWidth;
	this.tempHeight;
	this.tempOpacity;
	this.style;
	this.colorID = ko.observable(0);
	this.checked = false;
	this.selected = false;

	this.addAnswer = function () {
	    self.answers.push(new Answer());
	}

	this.removeAnswer = function (ans) {
	    self.answers.remove(ans);
	}
	this.addInventoryResult = function () {
	    self.inventoryResults.push(new InventoryResult())
	}

	this.removeInventoryResult = function (result) {
	    self.inventoryResults.remove(result);
	}


	this.addInventoryCondition = function () {
        self.inventoryConditions.push(new InventoryCondition())
	}

	this.removeInventoryCondition = function (cond) {
	    self.inventoryConditions.remove(cond);
	}

	this.removeCondition = function (cond) {
	    self.conditions.remove(cond)
	};

	this.addCondition = function () {
	    self.conditions.push(new Condition());
	};

	this.removeResult = function (result) {
	    self.results.remove(result)
	};

	this.addResult = function () {
	    self.results.push(new Result());
	};

	this.combinedResults = ko.computed(function () {
	    var output = "";
	    $.each(self.results(), function (result) {
	        output += "<span>"+this.fraction() +":"+(this.amount() > 0 ? "+": "" )+this.amount()+"</span>";
	    });
	    $.each(self.inventoryResults(), function (result) {
	        output += "<span>" + this.action() + ":" + this.item() + "</span>";
	    });
	    return output;
	});

	this.combinedConditions = ko.computed(function () {
	    var output = "";
	    $.each(self.conditions(), function (cond) {
	        output += "<span>" + this.fraction() + " " + this.condition() +" "+ this.value() + "</span>";
	    });
	    $.each(self.inventoryConditions(), function (cond) {
	        output += "<span>" + this.condition() + ":" + this.item() + "</span>";
	    });
	    return output;
	});

	// clipped values for display
	this.clippedTags = ko.computed(function() 
	{
		var tags = this.tags().split(" ");
		var output = "";
		if (this.tags().length > 0)
		{
			for (var i = 0; i < tags.length; i ++)
				output += '<span>' + tags[i] + '</span>';
		}
        return output;
    }, this);

	this.clippedBody = ko.computed(function() 
	{
		var result = app.getHighlightedText(this.body());
		while (result.indexOf("\n") >= 0)
			result = result.replace("\n", "<br />");
		while (result.indexOf("\r") >= 0)
			result = result.replace("\r", "<br />");
		result = result.substr(0, ClipNodeTextLength);
        return result;
    }, this);

	// internal cache
	this.linkedTo = ko.observableArray();
	this.linkedFrom = ko.observableArray();

	// reference to element containing us
	this.element = null;

	this.canDoubleClick = true;

	this.create = function()
	{
		Utils.pushToTop($(self.element));
		self.style = window.getComputedStyle($(self.element).get(0));

		var parent = $(self.element).parent();
		self.x(-parent.offset().left + $(window).width() / 2 - 100);
		self.y(-parent.offset().top + $(window).height() / 2 - 100);

		$(self.element)
			.css({opacity: 0, scale: 0.8, rotate: "45deg"})
			.transition({opacity: 1, scale: 1, rotate: "0deg"}, 250, "easeInQuad");
		self.drag();

		$(self.element).on("dblclick", function()
		{
			if (self.canDoubleClick)
				app.editNode(self);
		});

		$(self.element).on("click", function(e)
		{
			if(e.ctrlKey)
			{
				if(self.selected)
					app.removeNodeSelection(self);
				else
					app.addNodeSelected(self);
			}
		});
	}

	this.setSelected = function(select)
	{
		self.selected = select;
		
		if(self.selected) 
			$(self.element).css({border: "1px solid #49eff1"});
		else 
			$(self.element).css({border: "none"});
		
	}

	this.toggleSelected = function()
	{
		self.setSelected(!self.selected);
	}

	this.x = function(inX)
	{
		if (inX != undefined)
			$(self.element).css({x:Math.floor(inX)});
		return Math.floor((new WebKitCSSMatrix(self.style.webkitTransform)).m41);
	}

	this.y = function(inY)
	{
		if (inY != undefined)
			$(self.element).css({y:Math.floor(inY)});
		return Math.floor((new WebKitCSSMatrix(self.style.webkitTransform)).m42);
	}

	this.resetDoubleClick = function()
	{
		self.canDoubleClick = true;
	}

	this.tryRemove = function()
	{
		if (self.active())
			app.deleting(this);

		setTimeout(self.resetDoubleClick, 500);
		self.canDoubleClick = false;
	}

	this.cycleColorDown = function()
	{
		self.doCycleColorDown();

		setTimeout(self.resetDoubleClick, 500);
		self.canDoubleClick = false;

		if (app.shifted)
			app.matchConnectedColorID(self);

		if(self.selected)
			app.setSelectedColors(self);
	}

	this.cycleColorUp = function()
	{	
		self.doCycleColorUp();

		setTimeout(self.resetDoubleClick, 500);
		self.canDoubleClick = false;

		if (app.shifted)
			app.matchConnectedColorID(self);

		if(self.selected)
			app.setSelectedColors(self);
	}

	this.doCycleColorDown = function()
	{
		self.colorID(self.colorID() - 1);
		if (self.colorID() < 0)
			self.colorID(6);
	}

	this.doCycleColorUp = function()
	{
		self.colorID(self.colorID() + 1);
		if (self.colorID() > 6)
			self.colorID(0);
	}
	
	this.remove = function()
	{
		$(self.element).transition({opacity: 0, scale: 0.8, y: "-=80px", rotate: "-45deg"}, 250, "easeInQuad", function()
		{
			app.removeNode(self);
		});
		app.deleting(null);
	}

	this.drag = function()
	{
		var dragging = false;
		var groupDragging = false;

		var offset = [0, 0];
		var moved = false;

		$(document.body).on("mousemove", function(e) 
		{
			if (dragging)
			{
				var parent = $(self.element).parent();
				var newX = (e.pageX / self.getScale() - offset[0]);
				var newY = (e.pageY / self.getScale() - offset[1]);
				var movedX = newX - self.x();
				var movedY = newY - self.y();

				moved = true;
				self.x(newX);
				self.y(newY);

				if (groupDragging)
				{
					var nodes = [];
					if(self.selected)
					{
						nodes = app.getSelectedNodes();
						nodes.splice(nodes.indexOf(self), 1);
					}	
					else
					{
						nodes = app.getNodesConnectedTo(self);
					}
					
					if (nodes.length > 0)
					{
						for (var i in nodes)
						{
							nodes[i].x(nodes[i].x() + movedX);
							nodes[i].y(nodes[i].y() + movedY);
						}
					}
				}


				//app.refresh();
			}
		});

		$(self.element).on("mousedown", function (e) 
		{
			if (!dragging && self.active())
			{
				var parent = $(self.element).parent();

				dragging = true;

				if (app.shifted || self.selected)
				{
					groupDragging = true;
				}

				offset[0] = (e.pageX / self.getScale() - self.x());
				offset[1] = (e.pageY / self.getScale() - self.y());
			}
		});

		$(self.element).on("mousedown", function(e)
		{
			e.stopPropagation();
		});

		$(self.element).on("mouseup", function (e)
		{
			//alert("" + e.target.nodeName);
			if (!moved)
				app.mouseUpOnNodeNotMoved();

			moved = false;
		});

		$(document.body).on("mouseup", function (e) 
		{
			dragging = false;
			groupDragging = false;
			moved = false;

		});
	}

	/*
	this.moveTo = function(newX, newY)
	{
		$(self.element).clearQueue();
		$(self.element).transition({x:newX, y:newY}, 500);
	}
	*/

	this.isConnectedTo = function(otherNode, checkBack)
	{
		if (checkBack && otherNode.isConnectedTo(self, false))
			return true;

		var linkedNodes = self.linkedTo();
		for (var i in linkedNodes)
		{
			if (linkedNodes[i] == otherNode)
				return true;
			if (linkedNodes[i].isConnectedTo(otherNode, false))
				return true;
			if (otherNode.isConnectedTo(linkedNodes[i], false))
				return true;
		}

		return false;
	}

	this.updateLinks = function()
	{
	    self.resetDoubleClick();
	    //return;
		// clear existing links
		self.linkedTo.removeAll();

		// find all the links
		var links = self.answers();
		if (links != undefined)
		{
			// update links
			for (var index in app.nodes())
			{
				var other = app.nodes()[index];
				for (var i = 0; i < links.length; i ++)
					if (other != self && other.title().toLowerCase() == links[i].ref().toLowerCase())
						self.linkedTo.push(other);
			}
		}
	}

	this.getScale = function() {
		if (app && typeof app.cachedScale === 'number') {
			return app.cachedScale;
		} else {
			return 1;
		}
	}
}

ko.bindingHandlers.nodeBind = 
{
	init: function(element, valueAccessor, allBindings, viewModel, bindingContext) 
	{
		bindingContext.$rawData.element = element;
		bindingContext.$rawData.create();
	},

	update: function(element, valueAccessor, allBindings, viewModel, bindingContext) 
	{
		$(element).on("mousedown", function() { Utils.pushToTop($(element)); });
	}
};
