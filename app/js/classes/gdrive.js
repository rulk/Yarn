var CLIENT_ID = '771856282138-00rp1uuivt02fkl6kb2hc2fcq0ld0o28.apps.googleusercontent.com';
var SCOPES = 'https://www.googleapis.com/auth/drive';
var developerKey = 'AIzaSyD7ZYeX3P2d1m4iYq69IOrX8KnLrwr609w';

var oauthToken;



function utf8_to_b64(str) {
    return window.btoa(unescape(encodeURIComponent(str)));
}

function b64_to_utf8(str) {
    return decodeURIComponent(escape(window.atob(str)));
}

/**
 * Called when the client library is loaded to start the auth flow.
 */
function handleClientLoad() {
    // window.setTimeout(checkAuth, 1);
    gapi.load('client:auth', checkAuth);
    gapi.load('picker');
}
/**
 * Check if the current user has authorized the application.
 */
function checkAuth() {
    gapi.client.load('drive', 'v2');
    gapi.auth.authorize(
        { 'client_id': CLIENT_ID, 'scope': SCOPES, 'immediate': true },
        handleAuthResult);
}

function saveFileToDrive(content)
{
    var title = data.editingPath();
    var id = data.editingFileId();
   
    $("#doitButton").prop("disabled", true);
    insertFile(title, content,id);
  
}

/**
 * Called when authorization server replies.
 *
 * @param {Object} authResult Authorization result.
 */
function handleAuthResult(authResult) {
    var authButton = document.getElementById('authorizeButton');
    var doitButton = document.getElementById('doitButton');
    authButton.style.display = 'none';
    doitButton.style.display = 'none';
    if (authResult && !authResult.error) {
        // Access token has been successfully retrieved, requests can be sent to the API.
        doitButton.style.display = 'inline';
        oauthToken = authResult.access_token;
        loadParentFolder();
       // doitButton.onclick = uploadFile;
    } else {
        // No access token could be retrieved, show the button to start the authorization flow.
        authButton.style.display = 'inline';
        authButton.onclick = function () {
            gapi.auth.authorize(
                { 'client_id': CLIENT_ID, 'scope': SCOPES, 'immediate': false },
                handleAuthResult);
        };
    }
}

function loadParentFolder()
{
    if (localStorage.parentFolderId)
    {
        data.parentFolder({ id: localStorage.parentFolderId, isRoot: false });
    }
    else
    {
        data.parentFolder({ id: "0ByJTpfA7G5rkVFRCMEZqaUliekk", isRoot: false });
    }
    data.parentFolder.subscribe(function (newValue) {
        if(newValue && newValue.id)
        {
            localStorage.parentFolderId = newValue.id;
        }
    });
}


function loadFromGDrive(id,title,url) {
    downloadFile(url, function (contents) {
        data.editingPath(title);
        data.editingFileId(id);
        data.editingType(FILETYPE.JSON);
        data.loadData(contents, FILETYPE.JSON, true);
    });
}
/**
 * Download a file's content.
 *
 * @param {File} file Drive File instance.
 * @param {Function} callback Function to call when the request is complete.
 */
function downloadFile(url, callback) {
    if (url) {
        var accessToken = gapi.auth.getToken().access_token;
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
        xhr.onload = function () {
            callback(xhr.responseText);
        };
        xhr.onerror = function () {
            callback(null);
        };
        xhr.send();
    } else {
        callback(null);
    }
}
function loadFileList(onFinish)
{
    retrieveAllFilesInFolder(data.parentFolder().id, function (data) {
        
        var batch = new gapi.client.newBatch();
        for (var d = 0; d < data.length; d++)
        {
            batch.add( gapi.client.drive.files.get({
                'fileId': data[d].id
            }));
           
        }
        batch.execute(function (data) {
            var result = [];
            $.each(data, function (key, val) {
                result.push({ title: val.result.title, id: val.result.id, url: val.result.downloadUrl });
            });
            console.log(result);
            onFinish(result);
        });
    });
}
/**
 * Retrieve a list of files belonging to a folder.
 *
 * @param {String} folderId ID of the folder to retrieve files from.
 * @param {Function} callback Function to call when the request is complete.
 *
 */
function retrieveAllFilesInFolder(folderId, callback) {
    var q = 'trashed = false and mimeType = "application/json"';
    var retrievePageOfChildren = function (request, result) {
        request.execute(function (resp) {
            result = result.concat(resp.items);
            var nextPageToken = resp.nextPageToken;
            if (nextPageToken) {
                request = gapi.client.drive.children.list({
                    'folderId': folderId,
                    'pageToken': nextPageToken,
                    'q': q
                });
                retrievePageOfChildren(request, result);
            } else {
                callback(result);
            }
        });
    }
    var initialRequest = gapi.client.drive.children.list({
        'folderId': folderId,
        'q': q
    });
    retrievePageOfChildren(initialRequest, []);
}

/**
 * Insert new file.
 */
function insertFile(fileName, dataToSave,id) {
    const boundary = '-------314159265358979323846264';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";
  
    var makeParentsFunc = function () {
        return  [{
            "kind": "drive#parentReference",
            "id": data.parentFolder().id,
            "isRoot": data.parentFolder().isRoot
        }];
    };
    var contentType = 'application/json';
    var metadata = {
        'title': fileName,
        'mimeType': contentType,
        'parents': makeParentsFunc()
    };
   
    var finishInsertion = function () {
        var base64Data = utf8_to_b64(dataToSave);
        var multipartRequestBody =
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: ' + contentType + '\r\n' +
            'Content-Transfer-Encoding: base64\r\n' +
            '\r\n' +
            base64Data +
            close_delim;
        var request = gapi.client.request({
            'path': '/upload/drive/v2/files' + (id != null ? "/" + id : ""),
            'method': id == null ? 'POST' : 'PUT',
            'params': { 'uploadType': 'multipart' },
            'headers': {
                'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'
            },
            'body': multipartRequestBody
        });
        request.execute(function (arg) {
            console.log(arg);
            data.editingFileId(arg.id);
            alert("File save complete id:" + arg.id);
            $("#doitButton").prop("disabled", false);
        });
    };
    if (id != null) {
        gapi.client.drive.files.get({
            'fileId': id
        }).execute(function (meta) {
            metadata = meta;
            metadata['title'] = fileName;
            metadata['parents'] = makeParentsFunc();
            finishInsertion();
        });
    }
    else
    {
        finishInsertion();
    }
}

// Create and render a Picker object for picking user Photos.
function changeDefaultFolder() {
    if (oauthToken) {
        var docsView = new google.picker.DocsView()
          .setIncludeFolders(true)
          .setMimeTypes('application/vnd.google-apps.folder')
          .setSelectFolderEnabled(true);

        var picker = new google.picker.PickerBuilder().
            addView(docsView).
            setOAuthToken(oauthToken).
            setDeveloperKey(developerKey).
            setCallback(pickerCallback).
            build();
        picker.setVisible(true);
    }
}

// A simple callback implementation.
function pickerCallback(docData) {
    var url = 'nothing';
    if (docData[google.picker.Response.ACTION] == google.picker.Action.PICKED) {
        var doc = docData[google.picker.Response.DOCUMENTS][0];
        url = doc[google.picker.Document.URL];
        id = doc[google.picker.Document.ID];
        isRoot = false;

        data.parentFolder({ id: id, isRoot: isRoot });
    }
    console.log(docData[google.picker.Response.ACTION]);
    var message = 'You picked: ' + url;
  // alert( message);
}
