var FILETYPE = { JSON: "json", XML: "xml", TWEE: "twee", UNKNOWN: "none", YARNTEXT: "yarn.txt" };

var data =
{
    editingPath: ko.observable(null),
    editingFileId : ko.observable(null),
	editingType: ko.observable(""),
	parentFolder: ko.observable(),

	parentFolderName: ko.observable(),

	readFile: function(e, filename, clearNodes, fileObj)
	{
		if (app.fs != undefined)
		{
			if (app.fs.readFile(filename, "utf-8", function(error, contents)
			{
				if (error)
				{

				}
				else
				{
					var type = data.getFileType(filename);
					if (type == FILETYPE.UNKNOWN)
						alert("Unknown filetype!");
					else
					{
						data.editingPath(filename);
						data.editingType(type);
						data.loadData(contents, type, clearNodes);
					}
				}
			}));
		}
		else if (fileObj)
		{
		    var file = fileObj.files[0];
		    var fr = new FileReader();
		    fr.onload = function (event) {
		        var text = event.target.result;
		        var name = file.name;
		        if (name.lastIndexOf('.') != -1) {
		            name = name.substr(0, name.lastIndexOf('.'));
		        }
		        data.editingPath(name);
		        data.editingType(FILETYPE.JSON);
		        data.editingFileId(null);
		        data.loadData(text, FILETYPE.JSON, clearNodes);
		    };
		    fr.readAsText(file);

		    //alert("Unable to load file from your browser");
		    /*$.get("/test.json", function (txtData) {
		        data.editingPath("test.json");
		        data.editingType(FILETYPE.JSON);
		        data.loadData(txtData, FILETYPE.JSON, clearNodes);
		    });*/
		}
		/*
		else if (window.File && window.FileReader && window.FileList && window.Blob && e.target && e.target.files && e.target.files.length > 0)
		{
			var reader  = new FileReader();
			reader.onloadend = function(e) 
			{
				if (e.srcElement && e.srcElement.result && e.srcElement.result.length > 0)
				{
					var contents = e.srcElement.result;
					var type = data.getFileType(contents);
					alert("type(2): " + type);
					if (type == FILETYPE.UNKNOWN)
						alert("Unknown filetype!");
					else
						data.loadData(contents, type, clearNodes);
				}
			}
			reader.readAsText(e.target.files[0], "UTF-8");
		}*/
		
	},

	openFile: function(e, filename, fileObj)
	{
		data.readFile(e, filename, true, fileObj);

		app.refreshWindowTitle(filename);
	},

	appendFile: function(e, filename)
	{
		data.readFile(e, filename, false);
	},

	getFileType: function(filename)
	{
		var clone = filename;

		if (filename.toLowerCase().indexOf(".json") > -1)
			return FILETYPE.JSON;
		else if (filename.toLowerCase().indexOf(".yarn.txt") > -1)
			return FILETYPE.YARNTEXT;
		else if (filename.toLowerCase().indexOf(".xml") > -1)
			return FILETYPE.XML;
		else if (filename.toLowerCase().indexOf(".txt") > -1)
			return FILETYPE.TWEE;

		return FILETYPE.UNKNOWN;
		/*
		// is json?
		if (/^[\],:{}\s]*$/.test(clone.replace(/\\["\\\/bfnrtu]/g, '@').
			replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').
			replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) 
			return FILETYPE.JSON;

		// is xml?
		var oParser = new DOMParser();
		var oDOM = oParser.parseFromString(content, "text/xml");
		if (oDOM.documentElement["outerText"] == undefined)
			return FILETYPE.XML;

		// is twee?
		//console.log(content.substr(0, 2));
		console.log(content.indexOf("::"));
		if (content.trim().substr(0, 2) == "::")
			return FILETYPE.TWEE;
		return FILETYPE.UNKNOWN;
		*/
	},

	loadData: function(content, type, clearNodes)
	{
		// clear all content
		if (clearNodes)
			app.nodes.removeAll();

		var objects = [];
		var i = 0;
		if (type == FILETYPE.JSON)
		{
			content = JSON.parse(content);
			for (i = 0; i < content.length; i ++)
				objects.push(content[i]);
		}
		else if (type == FILETYPE.YARNTEXT)
		{
			var lines = content.split("\n");
			var obj = null;
			var index  = 0;
			var readingBody = false;
			for  (var i = 0; i < lines.length; i ++)
			{

				if (lines[i].trim() == "===")
				{
					readingBody = false;
					if (obj != null)
					{
						objects.push(obj);
						obj = null;
					}
				}
				else if (readingBody)
				{
					obj.body += lines[i] + "\n";
				}
				else
				{
					if (lines[i].indexOf("title:") > -1)
					{
						if (obj == null)
							obj = {};
						obj.title = lines[i].substr(7, lines[i].length-7);
					}
					else if (lines[i].indexOf("position:") > -1)
					{
						if (obj == null)
							obj = {}
						var xy = lines[i].substr(9, lines[i].length-9).split(',');
						obj.position = { x: Number(xy[0].trim()), y: Number(xy[1].trim()) }
					}
					else if (lines[i].indexOf("colorID:") > -1)
					{
						if (obj == null)
							obj = {}
						obj.colorID = Number(lines[i].substr(9, lines[i].length-9).trim());
					}
					else if (lines[i].indexOf("tags:") > -1)
					{
						if (obj == null)
							obj = {}
						obj.tags = lines[i].substr(6, lines[i].length-6);
					}
					else if (lines[i].trim() == "---")
					{
						readingBody = true;
						obj.body = "";
					}
				}
			}
			if (obj != null)
			{
				objects.push(obj);
			}
		}
		else if (type == FILETYPE.TWEE)
		{
			var lines = content.split("\n");
			var obj = null;
			var index  = 0;
			for  (var i = 0; i < lines.length; i ++)
			{
				lines[i] = lines[i].trim();
				if (lines[i].substr(0, 2) == "::")
				{
					if (obj != null)
						objects.push(obj);

					obj = {};
					index ++;

					var title = "";
					var tags = "";

					// check if there are tags
					var openBracket = lines[i].indexOf("[");
					var closeBracket = lines[i].indexOf("]");
					if (openBracket > 0 && closeBracket > 0)
					{
						title = lines[i].substr(3, openBracket - 3);
						tags = lines[i].substr(openBracket + 1, closeBracket - openBracket - 1);
					}
					else
					{
						title = lines[i].substr(3);
					}

					obj.title = title;
					obj.tags = tags;
					obj.body = "";
					obj.position = { x: index * 80, y: index * 80 };
				}
				else if (obj != null)
				{
					if (obj.body.length > 0)
						lines[i] += '\n';
					obj.body += lines[i];
				}
			}

			if (obj != null)
				objects.push(obj);
		}
		else if (type == FILETYPE.XML)
		{
			var oParser = new DOMParser();
			var xml = oParser.parseFromString(content, "text/xml");
			content = Utils.xmlToObject(xml);

			if (content != undefined)
				for (i = 0; i < content.length; i ++)
					objects.push(content[i]);
		}

		var avgX = 0, avgY = 0;
		var numAvg = 0;
		for (var i = 0; i < objects.length; i ++)
		{
		    var object = objects[i]
		    var node = new Node(object.title);
			app.nodes.push(node);
			
			
			if (object.title != undefined)
				node.title(object.title);
			if (object.body != undefined)
				node.body(object.body);
			if (object.tags != undefined)
			    node.tags(object.tags);
			if (object.attitudeName != undefined)
			    node.attitudeName(object.attitudeName);
			if (object.attitudeValue != undefined)
			    node.attitudeValue(object.attitudeValue);
			if (object.presenter != undefined)
			{
			    node.presenter(object.presenter);
			}
			if (object.results != undefined)
			{
			    for (var r = 0; r < object.results.length; r++)
			    {
			        var res = new Result();
			        res.fraction(object.results[r].fraction);
			        res.amount(object.results[r].amount);
			        node.results.push(res);
			    }
			   
			}
			if (object.conditions != undefined) {
			    for (var c = 0; c < object.conditions.length; c++) {
			        var cond = new Condition();
			        cond.fraction(object.conditions[c].fraction);
			        cond.value(object.conditions[c].value);
			        cond.condition(object.conditions[c].condition);
			        node.conditions.push(cond);
			    }

			}
			if (object.inventoryResults != undefined) {
			    for (var r = 0; r < object.inventoryResults.length; r++) {
			        var res = new InventoryResult();
			        res.action(object.inventoryResults[r].action);
			        res.item(object.inventoryResults[r].item);
			        node.inventoryResults.push(res);
			    }

			}
			if (object.inventoryConditions != undefined) {
			    for (var c = 0; c < object.inventoryConditions.length; c++) {
			        var cond = new InventoryCondition();
			        cond.condition(object.inventoryConditions[c].condition);
			        cond.item(object.inventoryConditions[c].item);			       
			        node.inventoryConditions.push(cond);
			    }
			}
			if (object.answers != undefined) {
			    for (var c = 0; c < object.answers.length; c++) {
			        var answer = new Answer();
			        answer.ref(object.answers[c].ref);
			        node.answers.push(answer);
			    }
			}
			if (object.position != undefined && object.position.x != undefined)
			{
				node.x(object.position.x);
				avgX += object.position.x;
				numAvg ++;
			}	
			if (object.position != undefined && object.position.y != undefined)
			{
				node.y(object.position.y);
				avgY += object.position.y;
			}
			if (object.colorID != undefined)
				node.colorID(object.colorID);
		}

		if (numAvg > 0)
		{
			app.warpToNodeXY(avgX/numAvg, avgY/numAvg);
		}

		$(".arrows").css({ opacity: 0 }).transition({ opacity: 1 }, 500);
		app.updateNodeLinks();
	},

	getSaveData: function(type)
	{
		var output = "";
		var content = [];
		var nodes = app.nodes();

		for (var i = 0; i < nodes.length; i ++)
		{
			content.push({
				"title": nodes[i].title(), 
				"tags": nodes[i].tags(), 
				"body": nodes[i].body(),
				"results": ko.toJS(nodes[i].results),
				"conditions": ko.toJS(nodes[i].conditions),
				"inventoryConditions": ko.toJS(nodes[i].inventoryConditions),
				"inventoryResults": ko.toJS(nodes[i].inventoryResults),
				"answers": ko.toJS(nodes[i].answers),
				"presenter": nodes[i].presenter(),
				"attitudeName": nodes[i].attitudeName(),
				"attitudeValue": nodes[i].attitudeValue(),
				"position": { "x": nodes[i].x(), "y": nodes[i].y() },
				"colorID": nodes[i].colorID()
			});
		}

		if (type == FILETYPE.JSON)
		{
			output = JSON.stringify(content, null, "\t");
		}
		else if (type == FILETYPE.YARNTEXT)
		{
			for (i = 0; i < content.length; i++)
			{
				output += "title: " + content[i].title + "\n";
				output += "tags: " + content[i].tags + "\n";
				output += "colorID: " + content[i].colorID + "\n";
				output += "position: " + content[i].position.x + "," + content[i].position.y + "\n";
				output += "---\n";
				output += content[i].body;
				var body = content[i].body
				if (!(body.length > 0 && body[body.length-1] == '\n'))
				{
					output += "\n";
				}
				output += "===\n";
			}
		}
		else if (type == FILETYPE.TWEE)
		{
			for (i = 0; i < content.length; i ++)
			{
				var tags = "";
				if (content[i].tags.length > 0)
					tags = " [" + content[i].tags + "]"
				output += ":: " + content[i].title + tags + "\n";
				output += content[i].body + "\n\n";
			}
		}
		else if (type == FILETYPE.XML)
		{
			output += '<nodes>\n';
			for (i = 0; i < content.length; i ++)
			{
				output += "\t<node>\n";
				output += "\t\t<title>" + content[i].title + "</title>\n";
				output += "\t\t<tags>" + content[i].tags + "</tags>\n";
				output += "\t\t<body>" + content[i].body + "</body>\n";
				output += '\t\t<position x="' + content[i].position.x + '" y="' + content[i].position.y + '"></position>\n';
				output += '\t\t<colorID>' + content[i].colorID + '</colorID>\n';
				output += "\t</node>\n";
			}
			output += '</nodes>\n';
		}

		return output;
	},

	saveTo: function(path, content)
	{
		if (app.fs != undefined)
		{
			app.fs.writeFile(path, content, {encoding: 'utf-8'}, function(err) 
			{
				data.editingPath(path);
				if(err)
					alert("Error Saving Data to " + path + ": " + err);
			});
		}
	},

	openFileDialog: function(dialog, callback)
	{
		dialog.bind("change", function(e)
		{
			// make callback
			callback(e, dialog.val(), dialog[0]);

			// replace input field with a new identical one, with the value cleared
			// (html can't edit file field values)
			var saveas = '';
			var accept = '';
			if (dialog.attr("nwsaveas") != undefined)
				saveas = 'nwsaveas="' + dialog.attr("nwsaveas") + '"'
			if (dialog.attr("accept") != undefined)
				saveas = 'accept="' + dialog.attr("accept") + '"'

			dialog.parent().append('<input type="file" id="' + dialog.attr("id") + '" ' + accept + ' ' + saveas + '>');
			dialog.unbind("change");
			dialog.remove();
		});

		dialog.trigger("click");
	},

	saveFileDialog: function(dialog, type, content)
	{
		var file = 'file.' + type;

		if (app.fs)
		{
			dialog.attr("nwsaveas", file);
			data.openFileDialog(dialog, function(e, path)
			{
				data.saveTo(path, content);
				app.refreshWindowTitle(path);
			});
		}
		else
		{
		    var isFileSaverSupported = false;
		    try {
		        isFileSaverSupported = !!new Blob;
		    } catch (e) { }
		    if (isFileSaverSupported && type == 'json') {
		        var blob = new Blob([content], { type: "text/plain;charset=utf-8" });
		        saveAs(blob, data.editingPath()+".json");
		    } else {
		        switch (type) {
		            case 'json':
		                content = "data:text/json," + content;
		                break;
		            case 'xml':
		                content = "data:text/xml," + content;
		                break;
		            default:
		                content = "data:text/plain," + content;
		                break;
		        }
		        window.open(content, "_blank");
		    }
		}
	},

	tryOpenFile: function()
	{
		data.openFileDialog($('#open-file'), data.openFile);
	},

	tryOpenFolder: function()
	{
		data.openFileDialog($('#open-folder'), data.openFolder);
	},

	tryAppend: function()
	{
		data.openFileDialog($('#open-file'), data.appendFile);
	},

	trySave: function(toDrive)
	{
	    var type = FILETYPE.JSON;
	    data.editingType(type);
	    if (!toDrive)
	    {
	        data.saveFileDialog($('#save-file'), type, data.getSaveData(type));
	    }
	    else
	    {
	        saveFileToDrive(data.getSaveData(type));
	    }
	},

	trySaveCurrent: function()
	{
		if (data.editingPath().length > 0 && data.editingType().length > 0)
		{
			data.saveTo(data.editingPath(), data.getSaveData(data.editingType()));
		}
	}

}

data.parentFolder.subscribe(function (newValue) {
    if(newValue){
        gapi.client.drive.files.get({
            'fileId': newValue.id
        }).execute(function (meta) {
            data.parentFolderName(meta.title + "/");
           
        });
        
    }
});